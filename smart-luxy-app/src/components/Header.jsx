import { useState, useRef, useEffect } from 'react'

// ══════════════════════════════════════════════
//  LOGO WAZYO — Boussole vivante
// ══════════════════════════════════════════════
function LogoWazyo() {
  const [active, setActive] = useState(false)
  const timeoutRef = useRef(null)

  function handleClick(e) {
    e.preventDefault()
    setActive(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setActive(false), 1100)
  }

  return (
    <a
      href="/"
      onClick={handleClick}
      aria-label="Wazyo Boutique — Accueil"
      className={`wz-logo${active ? ' wz-active' : ''}`}
      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <style>{`
        .wz-logo {
          --gold: #E9C46A;
          --gold-soft: #F4D98A;
          --gold-deep: #A9803A;
          position: relative;
          outline: none;
        }
        .wz-logo:focus-visible { box-shadow: 0 0 0 2px var(--gold); border-radius: 6px; }

        .wz-mark { position: relative; width: 44px; height: 44px; flex-shrink: 0; }

        /* Respiration continue de l'anneau — le logo "vit" même au repos */
        .wz-ring {
          transform-origin: 22px 22px;
          transition: stroke .4s ease, stroke-width .4s ease, opacity .4s ease;
          animation: wz-breath 6s ease-in-out infinite;
        }
        @keyframes wz-breath {
          0%, 100% { opacity: .70; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.03); }
        }

        /* Ticks cardinaux : pulsation en cascade au hover */
        .wz-tick {
          transition: transform .45s cubic-bezier(.22,1,.36,1), fill .3s ease;
          transform-origin: 22px 22px;
        }
        .wz-logo:hover .wz-tick { fill: var(--gold-soft); }
        .wz-logo:hover .wz-tick-n { transform: scale(1.5); transition-delay: 0ms; }
        .wz-logo:hover .wz-tick-e { transform: scale(1.5); transition-delay: 80ms; }
        .wz-logo:hover .wz-tick-s { transform: scale(1.5); transition-delay: 160ms; }
        .wz-logo:hover .wz-tick-w { transform: scale(1.5); transition-delay: 240ms; }

        /* Aiguille : oscillation douce continue (comme une vraie boussole qui cherche le nord) */
        .wz-needle {
          transform-origin: 22px 22px;
          transform: rotate(150deg);
          transition: transform .7s cubic-bezier(.22,1.4,.36,1);
          animation: wz-wobble 5s ease-in-out infinite;
        }
        @keyframes wz-wobble {
          0%, 100% { transform: rotate(148deg); }
          50%      { transform: rotate(152deg); }
        }

        /* Hover : l'aiguille se cale plein nord-est, l'oscillation s'arrête */
        .wz-logo:hover .wz-needle { transform: rotate(-38deg); animation: none; }
        .wz-logo:hover .wz-ring   { stroke: var(--gold); stroke-width: 1.8; opacity: 1; }

        /* Clic : tour complet + calage */
        .wz-active .wz-needle {
          animation: wz-spin 1s cubic-bezier(.3,1.2,.3,1) forwards;
        }
        @keyframes wz-spin {
          0%   { transform: rotate(150deg); }
          60%  { transform: rotate(-398deg); }
          80%  { transform: rotate(-30deg); }
          100% { transform: rotate(-38deg); }
        }

        /* Double onde concentrique au clic */
        .wz-ping, .wz-ping2 { transform-origin: 22px 22px; opacity: 0; }
        .wz-active .wz-ping  { animation: wz-ping 1s ease-out forwards; }
        .wz-active .wz-ping2 { animation: wz-ping 1s ease-out .18s forwards; }
        @keyframes wz-ping {
          0%   { transform: scale(.4); opacity: .6; }
          100% { transform: scale(2.3); opacity: 0; }
        }

        /* Sweep doré sur le wordmark */
        .wz-word { position: relative; overflow: hidden; }
        .wz-shine {
          position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(233,196,106,.6), transparent);
          transform: skewX(-18deg); pointer-events: none;
        }
        .wz-active .wz-shine { animation: wz-sweep .9s ease forwards; }
        @keyframes wz-sweep { to { left: 140%; } }

        /* Accessibilité */
        @media (prefers-reduced-motion: reduce) {
          .wz-needle, .wz-ring, .wz-tick, .wz-ping, .wz-ping2, .wz-shine {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <svg className="wz-mark" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="wz-needle-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#F4D98A" />
            <stop offset="100%" stopColor="#E9C46A" />
          </linearGradient>
          <linearGradient id="wz-needle-grad-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#A9803A" />
            <stop offset="100%" stopColor="#7A5A28" />
          </linearGradient>
        </defs>

        {/* Anneau extérieur */}
        <circle className="wz-ring" cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.4" opacity="0.85" />

        {/* 4 points cardinaux */}
        {[
          { deg: 0,   cls: 'wz-tick-n' },
          { deg: 90,  cls: 'wz-tick-e' },
          { deg: 180, cls: 'wz-tick-s' },
          { deg: 270, cls: 'wz-tick-w' },
        ].map(({ deg, cls }) => {
          const r = 18
          const x = 22 + r * Math.cos((deg - 90) * Math.PI / 180)
          const y = 22 + r * Math.sin((deg - 90) * Math.PI / 180)
          return <circle key={deg} className={`wz-tick ${cls}`} cx={x} cy={y} r="1.7" fill="#E9C46A" />
        })}

        {/* Aiguille de boussole */}
        <g className="wz-needle">
          <path d="M22 6 L26 22 L22 26 L18 22 Z" fill="url(#wz-needle-grad)" />
          <path d="M22 26 L26 22 L22 38 L18 22 Z" fill="url(#wz-needle-grad-dark)" opacity="0.95" />
        </g>

        {/* Point central (pivot) */}
        <circle cx="22" cy="22" r="1.6" fill="#0B0B0B" stroke="#E9C46A" strokeWidth="0.8" />

        {/* Ondes de clic */}
        <circle className="wz-ping"  cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.5" fill="none" />
        <circle className="wz-ping2" cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1"   fill="none" />
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
