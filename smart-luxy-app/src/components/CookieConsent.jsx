import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const openNotice = () => setVisible(true)
    window.addEventListener('wazyo:cookie-preferences', openNotice)

    let timer = null
    let choice = null
    try {
      choice = window.localStorage.getItem('sl_cookie_consent')
    } catch {
      choice = null
    }

    // Un ancien choix explicite reste respecté.
    if (choice === 'accepted') {
      window.loadFacebookPixel?.()
    } else if (!choice) {
      timer = window.setTimeout(() => setVisible(true), 1200)
    }

    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('wazyo:cookie-preferences', openNotice)
    }
  }, [])

  function acknowledge() {
    try {
      // OK ferme le message informatif ; il ne vaut pas accord publicitaire.
      window.localStorage.setItem('sl_cookie_consent', 'acknowledged')
    } catch (error) {
      console.warn('Préférence locale non enregistrée:', error)
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside
      role="region"
      aria-label="Information de confidentialité"
      aria-describedby="wazyo-cookie-description"
      style={{
        position: 'fixed',
        bottom: 14,
        left: 14,
        right: 14,
        zIndex: 9998,
        maxWidth: 420,
        margin: '0 auto',
        background: 'var(--card, #141414)',
        border: '1px solid rgba(201,168,76,.2)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 8px 28px rgba(0,0,0,.35)',
        animation: 'ccFadeIn .3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--g3, #e0e0e0)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 19, flexShrink: 0 }}>✨</span>
      <p
        id="wazyo-cookie-description"
        style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.5, margin: 0 }}
      >
        WAZYO utilise des données techniques nécessaires au bon fonctionnement de la boutique et du panier.
      </p>
      <button
        type="button"
        onClick={acknowledge}
        style={{
          background: 'linear-gradient(135deg,#C9A84C,#E9C46A)',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          color: '#000',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        OK
      </button>
      <style>{`
        @keyframes ccFadeIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </aside>
  )
}
