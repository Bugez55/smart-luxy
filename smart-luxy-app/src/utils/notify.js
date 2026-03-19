import { getSettings } from './useSettings'

const TG_TOKEN  = import.meta.env.VITE_TELEGRAM_TOKEN
const TG_CHAT   = import.meta.env.VITE_TELEGRAM_CHAT_ID

export async function notifyTelegram(order) {
  if (!TG_TOKEN || !TG_CHAT) return
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

  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'Markdown' })
    })
  } catch (e) { console.warn('Telegram failed:', e) }
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

// Ouvrir WA avec le numéro de la boutique (depuis Supabase settings)
export async function openWA(order) {
  const s = await getSettings()
  const phone = s.shop_phone || import.meta.env.VITE_WA_NUMBER || '213556688810'
  window.open(`https://wa.me/${phone}?text=${buildWAMessage(order)}`, '_blank')
}

export function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export function genId() {
  return 'SL-' + Date.now().toString(36).toUpperCase().slice(-6)
}
