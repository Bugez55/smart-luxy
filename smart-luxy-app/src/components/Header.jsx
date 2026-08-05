import { useState, useEffect } from 'react'

// ══════════════════════════════════════════════
//  LOGO WAZYO — Mark géométrique + wordmark
// ══════════════════════════════════════════════
function LogoWazyo() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(true) }, [])

  return (
    <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Mark géométrique — zigzag doré dans un anneau */}
      <div style={{
        position: 'relative', width: 38, height: 38, flexShrink: 0,
        opacity: loaded ? 1 : 0, transform: loaded ? 'scale(1)' : 'scale(.8)',
        transition: 'opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1)',
      }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="17" stroke="var(--br)" strokeWidth="1.6" opacity="0.9" />
          <path
            d="M9 14 L14.5 26 L19 16.5 L23.5 26 L29 14"
            stroke="var(--br)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
            style={{
              strokeDasharray: 40, strokeDashoffset: loaded ? 0 : 40,
              transition: 'stroke-dashoffset 1s ease .2s',
            }}
          />
          <circle cx="19" cy="8.5" r="1.6" fill="#E9C46A">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 21, fontWeight: 800, letterSpacing: '.01em',
          color: 'var(--g3)',
        }}>
          Wazyo
        </span>
        <span style={{
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontSize: 9, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase',
          color: 'var(--br)', marginTop: 2,
        }}>
          Boutique
        </span>
      </div>
    </a>
  )
}

// ══════════════════════════════════════════════
//  HEADER — Barre du haut avec logo + panier
// ══════════════════════════════════════════════
export default function Header({ cartCount, onCartOpen, search, onSearch }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      background: scrolled ? 'var(--card)' : 'transparent',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,.07)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      transition: 'background .3s ease, border-color .3s ease',
    }}>
      <LogoWazyo />

      <button onClick={onCartOpen} style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 30, padding: '9px 16px',
        color: 'var(--g3)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        Panier
        {cartCount > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: 'var(--br)', color: '#000',
            width: 18, height: 18, borderRadius: '50%',
            fontSize: 10, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{cartCount}</span>
        )}
      </button>
    </header>
  )
}