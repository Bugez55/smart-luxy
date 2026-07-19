// api/telegram.js — Proxy sécurisé pour Telegram
// Le token Telegram reste 100% côté serveur, jamais dans le navigateur

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Telegram non configuré côté serveur' })
  }

  try {
    const { text } = req.body
    if (!text || typeof text !== 'string' || text.length > 4000) {
      return res.status(400).json({ error: 'Message invalide' })
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    })

    const data = await response.json()
    return res.status(response.ok ? 200 : 500).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
