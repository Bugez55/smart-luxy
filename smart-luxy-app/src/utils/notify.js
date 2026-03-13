const TG_TOKEN  = import.meta.env.VITE_TELEGRAM_TOKEN
const TG_CHAT   = import.meta.env.VITE_TELEGRAM_CHAT_ID
const WA_NUMBER = import.meta.env.VITE_WA_NUMBER || '213556688810'

export async function notifyTelegram(order) {
  if (!TG_TOKEN || !TG_CHAT) return
  const items = (order.items || []).map(i =>
    `  • ${i.nom} ×${i.qty} = ${(i.prix * i.qty).toLocaleString()} DA`
  ).join('\n')
  const livTxt = order.mode_livraison === 'bureau' ? '📦 Retrait bureau (Tizi Ouzou)' : '🏠 Livraison à domicile'
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
${order.promo_code ? `🎟️ Code promo : ${order.promo_code} (-${order.promo_reduction}%)\n` : ''}💰 *TOTAL : ${order.total?.toLocaleString()} DA*
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
  const livTxt = order.mode_livraison === 'bureau' ? 'Retrait bureau (Tizi Ouzou)' : 'Livraison à domicile'
  return encodeURIComponent(
    `🛍️ *Commande Smart Luxy*\n` +
    `🆔 N° : ${order.id}\n\n` +
    `👤 ${order.nom_client} — 📞 ${order.telephone}\n` +
    `📍 ${order.wilaya} / ${order.commune}\n` +
    `🚚 ${livTxt}\n\n` +
    `🧾 Articles :\n${items}\n\n` +
    (order.promo_code ? `🎟️ Promo ${order.promo_code} : -${order.promo_reduction}%\n` : '') +
    `🚚 Livraison : ${order.frais_livraison ? order.frais_livraison.toLocaleString() + ' DA' : 'Gratuit'}\n` +
    `💰 TOTAL : ${order.total?.toLocaleString()} DA`
  )
}

export function openWA(order) {
  window.open(`https://wa.me/${WA_NUMBER}?text=${buildWAMessage(order)}`, '_blank')
}

// Envoyer WA de confirmation au client (depuis le numéro du shop)
export function sendWAConfirmation(order) {
  const msg = encodeURIComponent(
    `✅ Bonjour ${order.nom_client} !\n\n` +
    `Votre commande *Smart Luxy* a bien été reçue 🎉\n\n` +
    `🆔 Numéro de suivi : *${order.id}*\n` +
    `💰 Total : ${order.total?.toLocaleString()} DA\n` +
    `🚚 Mode : ${order.mode_livraison === 'bureau' ? 'Retrait bureau Tizi Ouzou' : 'Livraison à domicile'}\n\n` +
    `Nous vous appelons sous peu pour confirmer.\n` +
    `Merci de votre confiance ! 🙏\n\n` +
    `— Équipe Smart Luxy`
  )
  window.open(`https://wa.me/${order.telephone?.replace(/^0/, '213')}?text=${msg}`, '_blank')
}

export function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export function genId() {
  return 'SL-' + Date.now().toString(36).toUpperCase().slice(-6)
}
