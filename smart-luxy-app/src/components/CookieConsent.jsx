// ══════════════════════════════════════════════
//  COOKIE CONSENT — Notice discrète, non intimidante
//  Reste transparent (le Pixel ne se charge qu'après un geste
//  de l'utilisateur) mais sans écran "accepter/refuser" qui
//  peut faire fuir des visiteurs peu familiers avec ce genre de bandeau.
// ══════════════════════════════════════════════
import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const choice = localStorage.getItem('sl_cookie_consent')
    if (choice === 'accepted') {
      window.loadFacebookPixel && window.loadFacebookPixel()
    } else if (!choice) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function acknowledge() {
    localStorage.setItem('sl_cookie_consent', 'accepted')
    window.loadFacebookPixel && window.loadFacebookPixel()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 14, left: 14, right: 14, zIndex: 9998,
      maxWidth: 380, margin: '0 auto',
      background: 'var(--card, #141414)',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 14,
      padding: '12px 14px',
      boxShadow: '0 8px 28px rgba(0,0,0,.35)',
      animation: 'ccFadeIn .4s ease',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>🍪</span>
      <p style={{ flex: 1, fontSize: 12, color: 'var(--g3, #e0e0e0)', lineHeight: 1.5, margin: 0 }}>
        Ce site utilise des cookies pour améliorer ton expérience.
      </p>
      <button
        onClick={acknowledge}
        style={{
          background: 'linear-gradient(135deg,#C9A84C,#E9C46A)', border: 'none',
          borderRadius: 8, padding: '7px 16px', color: '#000',
          fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
        }}
      >OK</button>
      <style>{`
        @keyframes ccFadeIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
