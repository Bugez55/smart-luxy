import CONFIG from '../config'

// Telegram géré via proxy serveur sécurisé — plus de token exposé côté client
// Fonction sécurisée qui passe par le proxy serveur — le token ne quitte jamais Vercel
async function sendTelegram(text) {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
  } catch (e) { console.warn('Telegram proxy:', e) }
}


export async function notifyTelegram(order) {
  const items = (order.items || []).map(i =>
    `  • ${i.nom} ×${i.qty} = ${(i.prix * i.qty).toLocaleString()} DA`
  ).join('\n')
  const livTxt = order.mode_livraison === 'bureau' ? '📦 Retrait bureau' : '🏠 Livraison à domicile'
  const msg = `
🛍️ *Nouvelle commande Smart Luxy*
━━━━━━━━━━━━━━━━
🆔 *${order.id}*

👤 *Client :* ${order.nom_client}
📞 *Tél :* ${order.telephone}
📍 *Wilaya :* ${order.wilaya}
🏘️ *Commune :* ${order.commune}
${order.adresse ? `🏠 *Adresse :* ${order.adresse}\n` : ''}${order.note ? `📝 *Note :* ${order.note}\n` : ''}🚚 *Livraison :* ${livTxt}
━━━━━━━━━━━━━━━━
🧾 *Articles :*
${items}
━━━━━━━━━━━━━━━━
🚚 Frais livraison : ${order.frais_livraison ? order.frais_livraison.toLocaleString() + ' DA' : 'Gratuit'}
💰 *TOTAL : ${order.total?.toLocaleString()} DA*
`.trim()

  await sendTelegram(msg)
}

export function buildWAMessage(order) {
  const items = (order.items || []).map(i =>
    `• ${i.nom} ×${i.qty} = ${(i.prix * i.qty).toLocaleString()} DA`
  ).join('\n')
  const livTxt = order.mode_livraison === 'bureau' ? 'Retrait bureau' : 'Livraison à domicile'
  return encodeURIComponent(
    `🛍️ Commande Smart Luxy\n` +
    `🆔 N° : ${order.id}\n\n` +
    `👤 ${order.nom_client} — 📞 ${order.telephone}\n` +
    `📍 ${order.wilaya} / ${order.commune}\n` +
    `🚚 ${livTxt}\n\n` +
    `🧾 Articles :\n${items}\n\n` +
    `🚚 Livraison : ${order.frais_livraison ? order.frais_livraison.toLocaleString() + ' DA' : 'Gratuit'}\n` +
    `💰 TOTAL : ${order.total?.toLocaleString()} DA`
  )
}

// Ouvrir WA avec le numéro depuis config
export function openWA(order) {
  const phone = CONFIG.whatsapp || import.meta.env.VITE_WA_NUMBER || '213556688810'
  window.open(`https://wa.me/${phone}?text=${buildWAMessage(order)}`, '_blank')
}

export function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export function genId() {
  return 'SL-' + Date.now().toString(36).toUpperCase().slice(-6)
}

// ══════════════════════════════════════════════════════
//  ALERTES TELEGRAM INTELLIGENTES
// ══════════════════════════════════════════════════════

// ── Alerte stock bas (< seuil) ──
export async function alertStockBas(produit, stock, seuil = 5) {
  const emoji = stock === 0 ? '🚫' : '⚠️'
  const msg = `${emoji} *STOCK BAS — Smart Luxy*

` +
    `📦 Produit : *${produit.nom}*
` +
    `🔢 Stock restant : *${stock} unité${stock > 1 ? 's' : ''}*
` +
    `${stock === 0 ? '❌ ÉPUISÉ — le produit est désactivé sur le site' : `⚡ Plus que ${stock} — pense à réapprovisionner !`}`

  await sendTelegram(msg)
}

// ── Résumé quotidien (à appeler à 20h) ──
export async function resumeQuotidien(orders, products) {

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
  const ca = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const nouvelles = todayOrders.filter(o => o.statut === 'new').length
  const confirmees = todayOrders.filter(o => o.statut === 'confirmed').length

  // Top produit du jour
  const prodCount = {}
  todayOrders.forEach(o => {
    const items = (() => { try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items||[]) } catch { return [] } })()
    items.forEach(i => { prodCount[i.nom] = (prodCount[i.nom] || 0) + i.qty })
  })
  const topProd = Object.entries(prodCount).sort((a,b) => b[1]-a[1])[0]

  // Produits en stock bas
  const stockBas = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock <= 3 && p.stock > 0)
  const epuises  = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock === 0)

  const dateStr = today.toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long' })

  const msg = `📊 *Résumé du jour — Smart Luxy*
` +
    `📅 ${dateStr}
` +
    `━━━━━━━━━━━━━━━━
` +
    `🛍️ Commandes : *${todayOrders.length}*
` +
    `🆕 Nouvelles : ${nouvelles}
` +
    `✅ Confirmées : ${confirmees}
` +
    `💰 CA du jour : *${ca.toLocaleString()} DA*
` +
    `━━━━━━━━━━━━━━━━
` +
    (topProd ? `🏆 Top produit : *${topProd[0]}* (${topProd[1]} vendu${topProd[1]>1?'s':''})
` : '') +
    (stockBas.length > 0 ? `⚠️ Stock bas : ${stockBas.map(p => `${p.nom} (${p.stock})`).join(', ')}
` : '') +
    (epuises.length > 0 ? `🚫 Épuisés : ${epuises.map(p => p.nom).join(', ')}
` : '') +
    `━━━━━━━━━━━━━━━━
` +
    `📈 Total historique : ${orders.length} commandes`

  await sendTelegram(msg)
}
