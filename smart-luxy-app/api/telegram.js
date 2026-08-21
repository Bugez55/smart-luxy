// api/telegram.js — Proxy sécurisé pour Telegram
// Le token Telegram reste 100% côté serveur, jamais dans le navigateur

const ALLOWED_ORIGIN = 'https://wazyo.vercel.app'

// Rate-limit simple en mémoire (best-effort — se réinitialise si la
// fonction serverless redémarre, mais bloque déjà l'essentiel du spam)
const hits = new Map()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

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

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const isAllowedOrigin = origin === ALLOWED_ORIGIN || origin.endsWith('.vercel.app')

  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? origin : ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAllowedOrigin) {
    return res.status(403).json({ error: 'Origine non autorisée' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Trop de requêtes, réessaie dans une minute' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('Telegram non configuré: TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant')
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
      body: JSON.stringify({
        chat_id: chatId,
        text
        // parse_mode retiré : "Markdown" cassait l'envoi dès que le texte
        // contenait un caractère spécial non échappé (., -, _, (), etc.)
      })
    })

    const data = await response.json()

    if (!response.ok) {
      // Log visible dans les Runtime Logs Vercel pour debug rapide
      console.error('Erreur API Telegram:', JSON.stringify(data))
    }

    return res.status(response.ok ? 200 : 500).json(data)
  } catch (error) {
    console.error('Erreur proxy Telegram:', error)
    return res.status(500).json({ error: error.message })
  }
}
