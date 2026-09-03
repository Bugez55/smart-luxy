// ══════════════════════════════════════════════
//  COOKIE CONSENT — Bandeau de consentement transparent
//  Le Facebook Pixel ne se charge qu'après acceptation.
//  Choix mémorisé dans localStorage — ne réapparaît plus une fois répondu.
// ══════════════════════════════════════════════
import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [lang, setLang] = useState('fr')

  useEffect(() => {
    const choice = localStorage.getItem('sl_cookie_consent')
    if (choice === 'accepted') {
      // Déjà accepté lors d'une visite précédente — charger direct
      window.loadFacebookPixel && window.loadFacebookPixel()
    } else if (!choice) {
      // Jamais répondu — afficher le bandeau après un court délai
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  function accept() {
    localStorage.setItem('sl_cookie_consent', 'accepted')
    window.loadFacebookPixel && window.loadFacebookPixel()
    setVisible(false)
  }

  function refuse() {
    localStorage.setItem('sl_cookie_consent', 'refused')
    setVisible(false)
  }

  if (!visible) return null

  const t = {
    fr: {
      text: "Ce site utilise des cookies pour améliorer ton expérience et comprendre comment nos visiteurs utilisent la boutique (statistiques de visite, publicités). Aucune donnée n'est vendue à des tiers.",
      accept: "Accepter",
      refuse: "Refuser",
    },
    ar: {
      text: "يستخدم هذا الموقع ملفات تعريف الارتباط لتحسين تجربتك وفهم كيفية استخدام زوارنا للمتجر. لا يتم بيع أي بيانات لأطراف ثالثة.",
      accept: "قبول",
      refuse: "رفض",
    },
  }[lang]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
      background: 'var(--card, #141414)',
      borderTop: '1px solid rgba(201,168,76,.25)',
      padding: '16px 18px',
      boxShadow: '0 -8px 32px rgba(0,0,0,.4)',
      animation: 'ccSlideUp .4s ease',
      direction: lang === 'ar' ? 'rtl' : 'ltr',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>🍪</span>
            <button
              onClick={() => setLang(l => l === 'fr' ? 'ar' : 'fr')}
              style={{ background: 'none', border: 'none', color: 'var(--br, #C9A84C)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >{lang === 'fr' ? 'عربي' : 'FR'}</button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--g3, #e0e0e0)', lineHeight: 1.6, margin: 0 }}>{t.text}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={refuse}
            style={{
              background: 'transparent', border: '1px solid rgba(128,128,128,.4)',
              borderRadius: 10, padding: '10px 18px', color: 'var(--g4, #888)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >{t.refuse}</button>
          <button
            onClick={accept}
            style={{
              background: 'linear-gradient(135deg,#C9A84C,#E9C46A)', border: 'none',
              borderRadius: 10, padding: '10px 20px', color: '#000',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >{t.accept}</button>
        </div>
      </div>
      <style>{`
        @keyframes ccSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
