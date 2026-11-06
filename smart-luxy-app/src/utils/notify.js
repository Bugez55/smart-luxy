import CONFIG from '../config'
import { supabase } from '../supabase'

// Le frontend envoie uniquement un type d'action et des identifiants.
// Les messages et les données sensibles sont construits/relus côté serveur.
async function sendTelegram(payload, accessToken = null) {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (accessToken) headers.Authorization = \`Bearer \${accessToken}\`

    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('❌ Telegram proxy erreur', res.status, body)
      return false
    }
    return true
  } catch (error) {
    console.error('❌ Telegram proxy — erreur réseau:', error)
    return false
  }
}

async function getAdminAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Session administrateur indisponible pour Telegram:', error.message)
    return null
  }
  return data?.session?.access_token || null
}

export async function notifyTelegram(order) {
  const orderId = String(order?.id || '').trim().toUpperCase()
  if (!/^SL-[A-Z0-9]+$/.test(orderId)) {
    console.error('Notification Telegram ignorée : identifiant de commande invalide.')
    return false
  }
  return sendTelegram({ type: 'order', orderId })
}

export async function alertStockBas(produit, stock) {
  const productId = Number(produit?.id)
  const currentStock = Number(stock)
  if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isFinite(currentStock)) {
    console.warn('Alerte stock ignorée : produit ou stock invalide.')
    return false
  }

  const accessToken = await getAdminAccessToken()
  if (!accessToken) {
    console.warn('Alerte stock ignorée : session administrateur absente.')
    return false
  }

  return sendTelegram({
    type: 'stock_alert',
    productId,
    stock: currentStock,
  }, accessToken)
}

export async function resumeQuotidien() {
  const accessToken = await getAdminAccessToken()
  if (!accessToken) {
    console.warn('Résumé Telegram ignoré : session administrateur absente.')
    return false
  }

  // Les limites du jour sont calculées dans le fuseau horaire du navigateur
  // administrateur, puis les données sont relues depuis Supabase côté serveur.
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return sendTelegram({
    type: 'daily_summary',
    start: start.toISOString(),
    end: end.toISOString(),
  }, accessToken)
}

export function buildWAMessage(order) {
  const items = (order.items || []).map(i => {
    const color = String(i.color || i.couleur || '').trim()
    const model = String(i.model || i.modele || '').trim()
    const variantTxt = model ? \` ⚙️ \${model}\` : (color ? \` 🎨 \${color}\` : '')
    return \`• \${i.nom}\${variantTxt} ×\${i.qty} = \${(i.prix * i.qty).toLocaleString()} DA\`
  }).join('\\n')
  const livTxt = order.mode_livraison === 'bureau' ? 'Retrait bureau' : 'Livraison à domicile'
  return encodeURIComponent(
    \`🛍️ Commande Wazyo\\n\` +
    \`🆔 N° : \${order.id}\\n\\n\` +
    \`👤 \${order.nom_client} — 📞 \${order.telephone}\\n\` +
    \`📍 \${order.wilaya} / \${order.commune}\\n\` +
    \`🚚 \${livTxt}\\n\\n\` +
    \`🧾 Articles :\\n\${items}\\n\\n\` +
    \`🚚 Livraison : \${order.frais_livraison ? order.frais_livraison.toLocaleString() + ' DA' : 'Gratuit'}\\n\` +
    \`💰 TOTAL : \${order.total?.toLocaleString()} DA\`
  )
}

// Ouvrir WA avec le numéro depuis config
export function openWA(order) {
  const phone = CONFIG.whatsapp || import.meta.env.VITE_WA_NUMBER || '213556688810'
  window.open(\`https://wa.me/\${phone}?text=\${buildWAMessage(order)}\`, '_blank')
}

export function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export function genId() {
  return 'SL-' + Date.now().toString(36).toUpperCase().slice(-6)
}
