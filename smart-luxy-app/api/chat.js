// api/chat.js — Proxy Gemini gratuit
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY manquante dans les variables Vercel')
    return res.status(500).json({ error: 'Clé API manquante — ajoute GEMINI_API_KEY dans Vercel' })
  }

  try {
    const { system, messages, max_tokens } = req.body

    // Construire contents pour Gemini
    const contents = (messages || []).map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(msg.content || msg.text || '') }]
    }))

    // Gemini exige que le premier message soit "user"
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: '.' }] })
    }

    const body = {
      contents,
      ...(system && {
        systemInstruction: { parts: [{ text: system }] }
      }),
      generationConfig: {
        maxOutputTokens: max_tokens || 800,
        temperature: 0.7,
      }
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      return res.status(geminiRes.status).json({
        error: data.error?.message || 'Erreur Gemini',
        details: data
      })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return res.status(200).json({ content: [{ type: 'text', text }] })

  } catch (error) {
    console.error('Erreur proxy:', error)
    return res.status(500).json({ error: error.message })
  }
}
