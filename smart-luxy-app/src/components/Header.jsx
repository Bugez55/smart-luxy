import { useState, useEffect } from 'react'

// ══════════════════════════════════════════════
//  LOGO WAZYO — Vague + flèche dorée animées
//  (inspiré du logo officiel : swoosh + arrow through wordmark)
// ══════════════════════════════════════════════
function LogoWazyo() {
  const [loaded, setLoaded] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => { setLoaded(true) }, [])

  return (
    <a
      href="/"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2,
        position: 'relative',
      }}
    >
      {/* Wordmark avec vague + flèche traversante, comme le logo officiel */}
      <div style={{
        position: 'relative', width: 148, height: 40,
        opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)',
      }}>
        <svg width="148" height="40" viewBox="0 0 148 40" fill="none">
          <defs>
            <linearGradient id="wazyoGold" x1="0" y1="0" x2="148" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C9A24B" />
              <stop offset="50%" stopColor="#E9C46A" />
              <stop offset="100%" stopColor="#C9A24B" />
            </linearGradient>
          </defs>

          {/* Texte WAZYO */}
          <text
            x="0" y="27"
            fontFamily="'Fraunces', Georgia, serif"
            fontWeight="800"
            fontSize="23"
            letterSpacing="0.5"
            fill="var(--g3)"
          >
            WAZYO
          </text>

          {/* Vague dorée qui traverse le mot, glisse en continu */}
          <path
            d="M2 24 C 24 34, 46 14, 68 22 S 112 30, 138 16"
            stroke="url(#wazyoGold)"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: 220,
              strokeDashoffset: loaded ? 0 : 220,
              transition: 'stroke-dashoffset 1.1s ease .15s',
            }}
          >
            {/* léger flux permanent sur la vague, façon "courant" doré */}
            <animate
              attributeName="stroke-dashoffset"
              values="0;-14;0"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </path>

          {/* Pointe de flèche au bout de la vague — s'anime au hover */}
          <g style={{
            transform: hover ? 'translate(4px, -3px)' : 'translate(0, 0)',
            transformOrigin: '138px 16px',
            transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
          }}>
            <path
              d="M138 16 L131 12.5 M138 16 L133 22.5"
              stroke="url(#wazyoGold)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* pulse discret pour attirer l'œil sur la pointe */}
            <circle cx="138" cy="16" r="2.2" fill="#E9C46A">
              <animate attributeName="r" values="2;3.2;2" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>

      {/* Sous-titre */}
      <span style={{
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: 9, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase',
        color: 'var(--br)', marginLeft: 4, whiteSpace: 'nowrap',
      }}>
        Boutique
      </span>
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
