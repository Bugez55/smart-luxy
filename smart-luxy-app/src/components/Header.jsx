import { useState, useRef } from 'react'

// ══════════════════════════════════════════════
//  LOGO WAZYO — Mark "boussole" : l'aiguille pointe
//  toujours vers l'avant. Repos → hover → clic
//  chacun a sa propre animation distincte.
// ══════════════════════════════════════════════
function LogoWazyo() {
  const [active, setActive] = useState(false)   // pendant l'anim de clic
  const timeoutRef = useRef(null)

  function handleClick(e) {
    e.preventDefault()
    setActive(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setActive(false), 900)
  }

  return (
    <a
      href="/"
      onClick={handleClick}
      className={`wz-logo${active ? ' wz-active' : ''}`}
      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <style>{`
        .wz-logo { --gold: #E9C46A; --gold-deep: #A9803A; position: relative; }

        .wz-mark { position: relative; width: 42px; height: 42px; flex-shrink: 0; }

        /* anneau de boussole */
        .wz-ring {
          transform-origin: 21px 21px;
          transition: stroke .4s ease, opacity .4s ease;
        }
        .wz-tick { transition: transform .5s cubic-bezier(.22,1,.36,1), opacity .4s ease; transform-origin: 21px 21px; }

        /* aiguille : repos = pointe vers le bas-gauche (rangée) */
        .wz-needle {
          transform-origin: 21px 21px;
          transform: rotate(150deg);
          transition: transform .6s cubic-bezier(.22,1.4,.36,1);
        }
        /* survol : l'aiguille se redresse et pointe vers le haut-droit, comme sur le wordmark d'origine */
        .wz-logo:hover .wz-needle { transform: rotate(-38deg); }
        .wz-logo:hover .wz-ring { stroke: var(--gold); }
        .wz-logo:hover .wz-tick { transform: scale(1.3); }

        /* clic : l'aiguille tourne plein tour puis se cale, avec un ping qui se propage */
        .wz-active .wz-needle { animation: wz-spin .8s cubic-bezier(.3,1.2,.3,1) forwards; }
        @keyframes wz-spin {
          0%   { transform: rotate(150deg); }
          65%  { transform: rotate(-398deg); }
          100% { transform: rotate(-38deg); }
        }

        .wz-ping { transform-origin: 21px 21px; opacity: 0; }
        .wz-active .wz-ping { animation: wz-ping .8s ease-out forwards; }
        @keyframes wz-ping {
          0%   { transform: scale(.4); opacity: .55; }
          100% { transform: scale(2.1); opacity: 0; }
        }

        /* léger sweep doré sur le mot au clic */
        .wz-word { position: relative; overflow: hidden; }
        .wz-shine {
          position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(233,196,106,.55), transparent);
          transform: skewX(-18deg);
        }
        .wz-active .wz-shine { animation: wz-sweep .8s ease forwards; }
        @keyframes wz-sweep {
          0%   { left: -60%; }
          100% { left: 130%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .wz-needle, .wz-ring, .wz-tick, .wz-ping, .wz-shine { animation: none !important; transition: none !important; }
        }
      `}</style>

      <svg className="wz-mark" viewBox="0 0 42 42" fill="none">
        {/* anneau */}
        <circle className="wz-ring" cx="21" cy="21" r="17" stroke="var(--br)" strokeWidth="1.4" opacity="0.85" />

        {/* 4 points cardinaux, comme le monogramme original */}
        {[0, 90, 180, 270].map(deg => {
          const r = 17
          const x = 21 + r * Math.cos((deg - 90) * Math.PI / 180)
          const y = 21 + r * Math.sin((deg - 90) * Math.PI / 180)
          return <circle key={deg} className="wz-tick" cx={x} cy={y} r="1.6" fill="#E9C46A" />
        })}

        {/* aiguille — losange asymétrique type boussole */}
        <g className="wz-needle">
          <path d="M21 6 L25 21 L21 25 L17 21 Z" fill="#E9C46A" />
          <path d="M21 25 L25 21 L21 36 L17 21 Z" fill="var(--gold-deep, #A9803A)" opacity="0.9" />
        </g>

        {/* halo pour le clic */}
        <circle className="wz-ping" cx="21" cy="21" r="17" stroke="#E9C46A" strokeWidth="1.5" fill="none" />
      </svg>

      <div className="wz-word" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 22, fontWeight: 800, letterSpacing: '.01em',
          color: 'var(--g3)',
        }}>
          Wazyo
        </span>
        <span style={{
          fontFamily: "'Outfit', system-ui, sans-serif",
          fontSize: 9, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase',
          color: 'var(--br)', marginTop: 3,
        }}>
          Boutique
        </span>
        <span className="wz-shine" />
      </div>
    </a>
  )
}

// ══════════════════════════════════════════════
//  HEADER — Barre du haut avec logo + panier
// ══════════════════════════════════════════════
export default function Header({ cartCount, onCartOpen, search, onSearch }) {
  const [scrolled, setScrolled] = useState(false)

  useState(() => {
    function onScroll() { setScrolled(window.scrollY > 12) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  })

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
