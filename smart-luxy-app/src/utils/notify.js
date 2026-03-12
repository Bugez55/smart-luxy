const TG_TOKEN   = import.meta.env.VITE_TELEGRAM_TOKEN
const TG_CHAT    = import.meta.env.VITE_TELEGRAM_CHAT_ID
const WA_NUMBER  = import.meta.env.VITE_WA_NUMBER || '213556688810'

export async function notifyTelegram(order) {
  if (!TG_TOKEN || !TG_CHAT) return
  const items = (order.items || []).map(i => `  • ${i.nom} ×${i.qty} = ${(i.prix * i.qty).toLocaleString()} DA`).join('\n')
  const msg = `
🛍️ *Nouvelle commande Smart Luxy*
━━━━━━━━━━━━━━━━
🆔 *${order.id}*

👤 *Client :* ${order.nom_client}
📞 *Tél :* ${order.telephone}
📍 *Wilaya :* ${order.wilaya}
🏘️ *Commune :* ${order.commune}
${order.adresse ? `🏠 *Adresse :* ${order.adresse}\n` : ''}${order.note ? `📝 *Note :* ${order.note}\n` : ''}
━━━━━━━━━━━━━━━━
🧾 *Articles :*
${items}
━━━━━━━━━━━━━━━━
💰 *Total : ${order.total?.toLocaleString()} DA*
`.trim()

  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'Markdown' })
    })
  } catch (e) {
    console.warn('Telegram notification failed:', e)
  }
}

export function buildWAMessage(order) {
  const items = (order.items || []).map(i => `• ${i.nom} ×${i.qty} = ${(i.prix * i.qty).toLocaleString()} DA`).join('\n')
  return encodeURIComponent(
    `🛍️ Commande Smart Luxy — ${order.id}\n\n` +
    `Client: ${order.nom_client}\nTél: ${order.telephone}\nWilaya: ${order.wilaya} / ${order.commune}\n\n` +
    `Articles:\n${items}\n\nTotal: ${order.total?.toLocaleString()} DA`
  )
}

export function openWA(order) {
  const msg = buildWAMessage(order)
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank')
}

export function fmt(n) {
  return Number(n || 0).toLocaleString('fr-DZ') + ' DA'
}

export function genId() {
  return 'SL-' + Date.now().toString(36).toUpperCase().slice(-6)
}
