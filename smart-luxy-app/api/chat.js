// ══════════════════════════════════════════════
//  VERCEL API ROUTE — /api/chat
//  Utilise Google Gemini (100% GRATUIT)
//  Fichier à mettre dans : api/chat.js
// ══════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  try {
    const { system, messages, max_tokens } = req.body

    // Construire les messages pour Gemini
    const contents = []

    // Ajouter les messages de la conversation
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || msg.text || '' }]
      })
    }

    const body = {
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: 0.7,
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })
    }

    // Convertir la réponse Gemini au format Anthropic (pour pas changer le frontend)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return res.status(200).json({
      content: [{ type: 'text', text }]
    })

  } catch (error) {
    console.error('API route error:', error)
    return res.status(500).json({ error: error.message })
  }
}
