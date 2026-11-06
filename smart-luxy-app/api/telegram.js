// api/telegram.js — notifications Telegram construites côté serveur
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_auth.js'
import { applyCors } from './_cors.js'

const hits = new Map()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

let serviceClient

function getServiceClient() {
  if (serviceClient) return serviceClient
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) return null
  serviceClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  return serviceClient
}

function isRateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip) || { count: 0, start: now }
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0
    entry.start = now
  }
  entry.count++
  hits.set(ip, entry)
  return entry.count > MAX_PER_WINDOW
}

function fmt(value) {
  return Number(value || 0).toLocaleString('fr-DZ') + ' DA'
}

async function sendMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram non configuré côté serveur')

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok !== true) {
    throw new Error(data?.description || `Telegram a répondu avec le statut ${response.status}`)
  }
  return data
}

function orderMessage(order, lowStockProducts) {
  const items = (Array.isArray(order.items) ? order.items : []).map(item => {
    const color = String(item.color || item.couleur || '').trim()
    const model = String(item.model || item.modele || '').trim()
    const variant = model ? ` ⚙️ ${model}` : (color ? ` 🎨 ${color}` : '')
    return `  • ${item.nom || 'Produit'}${variant} ×${Number(item.qty) || 1} = ${fmt((Number(item.prix) || 0) * (Number(item.qty) || 1))}`
  }).join('\n')

  const lowStockText = lowStockProducts.length
    ? '\n\n⚠️ STOCK BAS\n' + lowStockProducts.map(product =>
        `• ${product.nom} : ${product.stock} unité(s)`
      ).join('\n')
    : ''

  return `
🛍️ Nouvelle commande WAZYO
━━━━━━━━━━━━━━━━
🆔 ${order.id}

👤 Client : ${order.nom_client}
📞 Tél : ${order.telephone}
📍 Wilaya : ${order.wilaya}
🏘️ Commune : ${order.commune}
${order.adresse ? `🏠 Adresse : ${order.adresse}\n` : ''}${order.note ? `📝 Note : ${order.note}\n` : ''}🚚 Livraison : ${order.mode_livraison === 'bureau' ? '📦 Retrait bureau' : '🏠 Livraison à domicile'}
━━━━━━━━━━━━━━━━
🧾 Articles :
${items || 'Aucun article'}
━━━━━━━━━━━━━━━━
🚚 Frais livraison : ${Number(order.frais_livraison) > 0 ? fmt(order.frais_livraison) : 'Gratuit'}
💰 TOTAL : ${fmt(order.total)}
${lowStockText}
`.trim()
}

async function handleOrderNotification(req, res) {
  const orderId = String(req.body?.orderId || '').trim().toUpperCase()
  if (!/^SL-[A-Z0-9]+$/.test(orderId)) {
    return res.status(400).json({ error: 'Identifiant de commande invalide' })
  }

  const client = getServiceClient()
  if (!client) {
    console.error('Telegram: SUPABASE_SECRET_KEY ou SUPABASE_URL manquant')
    return res.status(500).json({ error: 'Notifications temporairement indisponibles' })
  }

  const { data: order, error: readError } = await client
    .from('orders')
    .select('id,nom_client,telephone,wilaya,commune,adresse,note,items,mode_livraison,frais_livraison,total,created_at,telegram_notified_at,telegram_notification_claimed_at')
    .eq('id', orderId)
    .maybeSingle()

  if (readError) {
    console.error('Lecture commande Telegram impossible:', readError.message)
    return res.status(500).json({ error: 'Impossible de vérifier la commande' })
  }
  if (!order) return res.status(404).json({ error: 'Commande introuvable' })

  const createdAt = Date.parse(order.created_at || '')
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 60 * 60 * 1000 || createdAt > Date.now() + 60_000) {
    return res.status(404).json({ error: 'Commande trop ancienne pour une nouvelle notification' })
  }

  if (order.telegram_notified_at) {
    return res.status(200).json({ success: true, duplicate: true })
  }

  const claimAt = new Date().toISOString()
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  let claim = await client
    .from('orders')
    .update({ telegram_notification_claimed_at: claimAt })
    .eq('id', order.id)
    .is('telegram_notified_at', null)
    .is('telegram_notification_claimed_at', null)
    .select('id')
    .maybeSingle()

  if (!claim.error && !claim.data) {
    claim = await client
      .from('orders')
      .update({ telegram_notification_claimed_at: claimAt })
      .eq('id', order.id)
      .is('telegram_notified_at', null)
      .lt('telegram_notification_claimed_at', staleBefore)
      .select('id')
      .maybeSingle()
  }

  if (claim.error) {
    console.error('Réservation Telegram impossible:', claim.error.message)
    return res.status(500).json({ error: 'Impossible de réserver la notification' })
  }
  if (!claim.data) {
    const { data: latest } = await client
      .from('orders')
      .select('telegram_notified_at')
      .eq('id', order.id)
      .maybeSingle()
    if (latest?.telegram_notified_at) {
      return res.status(200).json({ success: true, duplicate: true })
    }
    return res.status(409).json({ error: 'Notification déjà en cours de traitement' })
  }

  try {
    const itemIds = [...new Set((Array.isArray(order.items) ? order.items : [])
      .map(item => Number(item?.id))
      .filter(id => Number.isSafeInteger(id) && id > 0))]
    let lowStockProducts = []
    if (itemIds.length) {
      const { data: products, error } = await client
        .from('products')
        .select('id,nom,stock')
        .in('id', itemIds)
        .not('stock', 'is', null)
        .lte('stock', 5)
      if (error) console.error('Lecture stock Telegram impossible:', error.message)
      else lowStockProducts = products || []
    }

    await sendMessage(orderMessage(order, lowStockProducts))

    const { error: markError } = await client
      .from('orders')
      .update({
        telegram_notified_at: new Date().toISOString(),
        telegram_notification_claimed_at: null,
      })
      .eq('id', order.id)
      .eq('telegram_notification_claimed_at', claimAt)
      .is('telegram_notified_at', null)

    if (markError) {
      console.error('Message Telegram envoyé mais marqueur non enregistré:', markError.message)
      return res.status(200).json({ success: true, warning: 'Notification envoyée ; marqueur local à vérifier' })
    }
    return res.status(200).json({ success: true })
  } catch (error) {
    await client.from('orders')
      .update({ telegram_notification_claimed_at: null })
      .eq('id', order.id)
      .eq('telegram_notification_claimed_at', claimAt)
      .is('telegram_notified_at', null)

    console.error('Erreur envoi Telegram commande:', error?.message || error)
    return res.status(502).json({ error: 'Impossible d’envoyer la notification de commande' })
  }
}

async function handleAdminNotification(req, res, type) {
  const auth = await requireAdmin(req, res)
  if (!auth.ok) return auth.response

  if (type === 'stock_alert') {
    const productId = Number(req.body?.productId)
    const requestedStock = Number(req.body?.stock)
    if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isFinite(requestedStock)) {
      return res.status(400).json({ error: 'Produit ou stock invalide' })
    }

    const { data: product, error } = await auth.client
      .from('products')
      .select('id,nom,stock')
      .eq('id', productId)
      .maybeSingle()

    if (error) return res.status(500).json({ error: 'Impossible de vérifier le stock' })
    if (!product || product.stock === null || Number(product.stock) !== requestedStock || Number(product.stock) > 5) {
      return res.status(200).json({ success: true, skipped: true })
    }

    const emoji = Number(product.stock) === 0 ? '🚫' : '⚠️'
    const message = `${emoji} STOCK BAS — WAZYO\n\n📦 Produit : ${product.nom}\n🔢 Stock restant : ${product.stock} unité(s)\n${Number(product.stock) === 0 ? '❌ ÉPUISÉ' : '⚡ Réapprovisionnement à prévoir'}`
    try {
      await sendMessage(message)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Erreur alerte Telegram stock:', error?.message || error)
      return res.status(502).json({ error: 'Impossible d’envoyer l’alerte stock' })
    }
  }

  if (type === 'daily_summary') {
    const start = Date.parse(String(req.body?.start || ''))
    const end = Date.parse(String(req.body?.end || ''))
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 26 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Période du résumé invalide' })
    }

    const [{ data: orders, error: ordersError }, { data: products, error: productsError }] = await Promise.all([
      auth.client.from('orders')
        .select('id,total,statut,items,created_at')
        .gte('created_at', new Date(start).toISOString())
        .lt('created_at', new Date(end).toISOString()),
      auth.client.from('products')
        .select('id,nom,stock'),
    ])

    if (ordersError || productsError) {
      console.error('Données résumé Telegram impossibles:', ordersError?.message || productsError?.message)
      return res.status(500).json({ error: 'Impossible de préparer le résumé' })
    }

    const rows = orders || []
    const revenue = rows.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const countStatus = status => rows.filter(order => order.statut === status).length
    const productCounts = {}
    rows.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : []
      items.forEach(item => {
        const name = String(item?.nom || 'Produit')
        productCounts[name] = (productCounts[name] || 0) + (Number(item?.qty) || 0)
      })
    })
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]
    const lowStock = (products || []).filter(product => product.stock !== null && Number(product.stock) > 0 && Number(product.stock) <= 3)
    const outOfStock = (products || []).filter(product => product.stock !== null && Number(product.stock) === 0)
    const dateText = new Date(start).toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })

    const message = `📊 Résumé du jour — WAZYO\n📅 ${dateText}\n━━━━━━━━━━━━━━━━\n🛍️ Commandes : ${rows.length}\n💰 Chiffre d'affaires : ${fmt(revenue)}\n🆕 Nouvelles : ${countStatus('new')}\n✅ Confirmées : ${countStatus('confirmed')}\n🚚 Expédiées : ${countStatus('shipped')}\n📦 Livrées : ${countStatus('delivered')}\n❌ Annulées : ${countStatus('cancelled')}\n━━━━━━━━━━━━━━━━\n🏆 Top produit : ${topProduct ? `${topProduct[0]} (×${topProduct[1]})` : 'Aucune vente'}\n⚠️ Stock bas : ${lowStock.length ? lowStock.map(p => `${p.nom} (${p.stock})`).join(', ') : 'Aucun'}\n🚫 Épuisés : ${outOfStock.length ? outOfStock.map(p => p.nom).join(', ') : 'Aucun'}`
    try {
      await sendMessage(message)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Erreur résumé Telegram:', error?.message || error)
      return res.status(502).json({ error: 'Impossible d’envoyer le résumé' })
    }
  }

  return res.status(400).json({ error: 'Type de notification inconnu' })
}

export default async function handler(req, res) {
  const allowed = applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(allowed ? 204 : 403).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!allowed) return res.status(403).json({ error: 'Origine non autorisée' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans une minute' })
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null
  if (!body || typeof body.type !== 'string') {
    return res.status(400).json({ error: 'Type de notification invalide' })
  }
  req.body = body

  if (body.type === 'order') return handleOrderNotification(req, res)
  if (body.type === 'stock_alert' || body.type === 'daily_summary') {
    return handleAdminNotification(req, res, body.type)
  }
  return res.status(400).json({ error: 'Type de notification inconnu' })
}
