import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const openPreferences = () => setVisible(true)
    window.addEventListener('wazyo:cookie-preferences', openPreferences)

    let timer = null
    let choice = null
    try {
      choice = window.localStorage.getItem('sl_cookie_consent')
    } catch {
      choice = null
    }

    if (choice === 'accepted') {
      window.loadFacebookPixel?.()
    } else if (!choice) {
      timer = window.setTimeout(() => setVisible(true), 1200)
    }

    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('wazyo:cookie-preferences', openPreferences)
    }
  }, [])

  function saveChoice(choice) {
    try {
      window.localStorage.setItem('sl_cookie_consent', choice)
      return true
    } catch {
      return false
    }
  }

  function accept() {
    const saved = saveChoice('accepted')
    if (saved) window.loadFacebookPixel?.()
    setVisible(false)
  }

  function reject() {
    saveChoice('rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <section
      role="dialog"
      aria-label="Préférences des cookies"
      aria-describedby="wazyo-cookie-description"
      style={{
        position: 'fixed',
        bottom: 14,
        left: 14,
        right: 14,
        zIndex: 9998,
        maxWidth: 440,
        margin: '0 auto',
        background: 'var(--card, #141414)',
        border: '1px solid rgba(201,168,76,.24)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 8px 28px rgba(0,0,0,.4)',
        animation: 'ccFadeIn .3s ease',
        color: 'var(--g3, #e0e0e0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 20, flexShrink: 0 }}>🍪</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 5px' }}>
            Vos préférences de confidentialité
          </p>
          <p
            id="wazyo-cookie-description"
            style={{ fontSize: 12, lineHeight: 1.55, margin: 0, color: 'var(--g4, #b5b5b5)' }}
          >
            Le panier utilise un stockage local nécessaire au fonctionnement de la boutique.
            Le Pixel Meta, qui mesure les campagnes publicitaires, ne sera chargé que si vous l'acceptez.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={reject}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.22)',
            borderRadius: 8,
            padding: '8px 13px',
            color: 'var(--g3, #e0e0e0)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={accept}
          style={{
            background: 'linear-gradient(135deg,#C9A84C,#E9C46A)',
            border: '1px solid #C9A84C',
            borderRadius: 8,
            padding: '8px 15px',
            color: '#000',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Accepter
        </button>
      </div>

      <style>{`
        @keyframes ccFadeIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
