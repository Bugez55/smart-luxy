// ══════════════════════════════════════════════
//  CHATBOT VENDEUR IA — Smart Luxy
//  Répond aux questions clients 24h/24
// ══════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'

const SUGGESTIONS = [
  'Vous livrez à quelle wilaya ?',
  'Combien coûte la livraison ?',
  'Comment passer commande ?',
  'C\'est quoi le délai de livraison ?',
  'Vous faites le retour produit ?',
]

export default function AIChatbot({ products }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    { role: 'assistant', text: 'Bonjour ! 👋 Je suis l\'assistant Smart Luxy. Comment puis-je vous aider ?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(1)
  const [showSuggest, setShowSuggest] = useState(true)
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // Construire le contexte produits pour l'IA
  const productContext = products.slice(0, 20).map(p =>
    `- ${p.nom} : ${p.prix} DA${p.prix_old ? ` (avant ${p.prix_old} DA)` : ''}${p.stock === 0 ? ' [ÉPUISÉ]' : p.stock <= 5 ? ` [${p.stock} restants]` : ''}`
  ).join('\n')

  async function send(text) {
    const q = text || input.trim()
    if (!q) return
    setInput('')
    setShowSuggest(false)
    const newMsgs = [...msgs, { role: 'user', text: q }]
    setMsgs(newMsgs)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-1.5-flash',
          max_tokens: 1000,
          system: `Tu es l'assistant vendeur de Smart Luxy, une boutique en ligne algérienne premium. Tu réponds en français ou en arabe selon la langue du client, de façon chaleureuse, courte et commerciale.

Informations boutique :
- Livraison dans les 69 wilayas d'Algérie
- Paiement à la livraison (pas de paiement en ligne)
- Délai domicile : 2–5 jours | Bureau : 1–3 jours
- Retour gratuit sous 7 jours si produit défectueux
- Contact WhatsApp : +213 556 688 810
- Frais livraison : entre 300 DA (Tizi Ouzou) et 1600 DA (wilayas du sud)

Produits disponibles :
${productContext}

Règles :
- Réponds TOUJOURS en moins de 80 mots
- Si le client demande un produit spécifique, donne le prix et dis comment commander
- Encourage toujours à passer commande
- Si tu ne sais pas, dis "Contactez-nous sur WhatsApp au +213 556 688 810"
- N'invente jamais d'informations`,
          messages: newMsgs.map(m => ({ role: m.role, content: m.text }))
        })
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Désolé, une erreur est survenue. Contactez-nous sur WhatsApp.'
      setMsgs(prev => [...prev, { role: 'assistant', text: reply }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', text: 'Une erreur est survenue. Contactez-nous sur WhatsApp au +213 556 688 810 📱' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Bulle flottante */}
      <div style={{
        position: 'fixed', bottom: 24, left: 20, zIndex: 998,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
      }}>
        {/* Tooltip si fermé */}
        {!open && (
          <div style={{
            background: 'white', color: '#111',
            borderRadius: '12px 12px 12px 2px',
            padding: '8px 12px', fontSize: 12, fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,.3)', maxWidth: 180,
            animation: 'tooltipIn .4s ease',
          }}>
            💬 Une question ? Je suis là !
          </div>
        )}

        <button onClick={() => setOpen(o => !o)} style={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #C9A84C, #E9C46A)',
          border: 'none', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(201,168,76,.5)',
          transition: 'transform .2s, box-shadow .2s',
          position: 'relative',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = '' }}
        >
          {open ? '✕' : '🤖'}
          {!open && unread > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: 'white',
              borderRadius: '50%', width: 20, height: 20,
              fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unread}</div>
          )}
        </button>
      </div>

      {/* Fenêtre chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, left: 12, right: 12,
          maxWidth: 380, zIndex: 997,
          background: '#0f0f0f', border: '1px solid rgba(201,168,76,.3)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,.8)',
          animation: 'chatIn .3s cubic-bezier(.22,1,.36,1)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '70vh',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #C9A84C, #E9C46A)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 28 }}>🤖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>Assistant Smart Luxy</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d' }} />
                <span style={{ fontSize: 10, color: 'rgba(0,0,0,.6)', fontWeight: 700 }}>En ligne · Répond en quelques secondes</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
            scrollbarWidth: 'none',
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #C9A84C, #E9C46A)'
                    : 'rgba(255,255,255,.08)',
                  color: m.role === 'user' ? '#000' : 'rgba(255,255,255,.85)',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '9px 13px', fontSize: 13, fontWeight: m.role === 'user' ? 700 : 500,
                  lineHeight: 1.5,
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '8px 12px', background: 'rgba(255,255,255,.08)', borderRadius: 12 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', animation: `dot .8s ${i*.15}s infinite` }} />
                ))}
              </div>
            )}

            {/* Suggestions */}
            {showSuggest && !loading && msgs.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.3)',
                    borderRadius: 20, padding: '5px 10px',
                    color: '#C9A84C', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)',
            display: 'flex', gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && send()}
              placeholder="Posez votre question..."
              style={{
                flex: 1, background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 12,
                padding: '9px 14px', color: 'white', fontSize: 13,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? 'linear-gradient(135deg,#C9A84C,#E9C46A)' : '#1a1a1a',
                border: 'none', borderRadius: 12, width: 42, height: 42,
                color: input.trim() && !loading ? '#000' : '#333',
                fontSize: 18, cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >➤</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatIn { from{opacity:0;transform:translateY(20px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes tooltipIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes dot { 0%,80%,100%{transform:scale(0.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
      `}</style>
    </>
  )
}
