// ═══════════════════════════════════════════════════
//  BANNIÈRE DÉFILANTE — Smart Luxy
//  Messages chargés depuis Supabase (gérés par admin)
// ═══════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DEFAULT_MSGS = [
  '🚚 Livraison rapide partout en Algérie',
  '✅ Paiement à la livraison disponible',
  '📦 Stock limité — Commandez vite !',
  '⭐ +500 clients satisfaits en Algérie',
  '🎁 Produits premium à prix imbattables',
]

export default function AnnouncementBar() {
  const [messages, setMessages] = useState(DEFAULT_MSGS)

  useEffect(() => {
    supabase
      .from('banner_messages')
      .select('message')
      .eq('actif', true)
      .order('position', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0)
          setMessages(data.map(d => d.message))
      })
  }, [])

  if (messages.length === 0) return null

  const all = [...messages, ...messages]

  return (
    <div style={{
      background: 'linear-gradient(90deg, #0a0a0a 0%, #1a1500 50%, #0a0a0a 100%)',
      borderBottom: '1px solid rgba(201,168,76,.2)',
      height: 36, overflow: 'hidden', position: 'relative', zIndex: 101,
    }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:60, background:'linear-gradient(90deg, #0a0a0a, transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:60, background:'linear-gradient(270deg, #0a0a0a, transparent)', zIndex:2, pointerEvents:'none' }} />
      <div style={{
        display: 'flex', alignItems: 'center', height: '100%',
        animation: `bannerScroll ${Math.max(20, messages.length * 6)}s linear infinite`,
        whiteSpace: 'nowrap', willChange: 'transform',
      }}>
        {all.map((msg, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 40px', fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,.75)', letterSpacing: '.04em',
          }}>
            {msg}
            <span style={{ color: 'rgba(201,168,76,.4)', fontSize: 10 }}>✦</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes bannerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
