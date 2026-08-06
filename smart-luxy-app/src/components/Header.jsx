import { useState, useEffect, useCallback } from 'react'

// ══════════════════════════════════════════════
//  LOGO WAZYO — Boussole toujours vivante
//  + décollage fusée en plein écran au clic → reload
// ══════════════════════════════════════════════
function LogoWazyo() {
  const [launching, setLaunching] = useState(false)

  const handleClick = useCallback((e) => {
    e.preventDefault()
    if (launching) return // ignore double-clic pendant le décollage

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      window.location.reload()
      return
    }
    setLaunching(true)
  }, [launching])

  // déclenché exactement quand l'animation CSS de la fusée se termine
  function handleRocketAnimEnd() {
    window.location.reload()
  }

  return (
    <>
      <a
        href="/"
        onClick={handleClick}
        aria-label="Wazyo Boutique — Accueil (recharge la page)"
        className="wz2-logo"
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <style>{`
          .wz2-logo { --gold: #E9C46A; --gold-soft: #F4D98A; --gold-deep: #A9803A; position: relative; outline: none; }
          .wz2-logo:focus-visible { box-shadow: 0 0 0 2px var(--gold); border-radius: 6px; }

          .wz2-mark { width: 44px; height: 44px; flex-shrink: 0; }

          /* Anneau : rotation lente en continu, toujours actif */
          .wz2-ring-grp {
            transform-origin: 22px 22px;
            animation: wz2-spin 9s linear infinite;
          }
          @keyframes wz2-spin { to { transform: rotate(360deg); } }

          .wz2-ring {
            animation: wz2-breath 4s ease-in-out infinite;
            transform-origin: 22px 22px;
          }
          @keyframes wz2-breath {
            0%,100% { opacity: .8; }
            50%      { opacity: 1;  }
          }

          /* Aiguille : oscillation continue permanente */
          .wz2-needle {
            transform-origin: 22px 22px;
            animation: wz2-wobble 3s ease-in-out infinite;
          }
          @keyframes wz2-wobble {
            0%,100% { transform: scaleY(1) rotate(-2deg); }
            50%     { transform: scaleY(1.08) rotate(2deg); }
          }

          .wz2-w { transition: fill .3s ease; }
          .wz2-logo:hover .wz2-w      { fill: var(--gold-soft); }
          .wz2-logo:hover .wz2-ring   { stroke: var(--gold-soft); }

          .wz2-word { position: relative; overflow: hidden; }
          .wz2-shine {
            position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
            background: linear-gradient(100deg, transparent, rgba(233,196,106,.6), transparent);
            transform: skewX(-18deg); pointer-events: none;
          }
          .wz2-logo:hover .wz2-shine { animation: wz2-sweep .9s ease forwards; }
          @keyframes wz2-sweep { to { left: 140%; } }

          @media (prefers-reduced-motion: reduce) {
            .wz2-ring-grp, .wz2-ring, .wz2-needle, .wz2-shine {
              animation: none !important; transition: none !important;
            }
          }
        `}</style>

        <div className="wz2-mark">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="wz2-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#F4D98A" />
                <stop offset="100%" stopColor="#A9803A" />
              </linearGradient>
            </defs>

            <g className="wz2-ring-grp">
              <circle className="wz2-ring" cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.4" />
              <circle cx="22" cy="4"  r="1.2" fill="#E9C46A" opacity=".7" />
              <circle cx="40" cy="22" r="1.2" fill="#E9C46A" opacity=".5" />
              <circle cx="22" cy="40" r="1.2" fill="#E9C46A" opacity=".5" />
              <circle cx="4"  cy="22" r="1.2" fill="#E9C46A" opacity=".5" />
            </g>

            {/* W stylisé — les 2 V extérieurs */}
            <path
              className="wz2-w"
              d="M11 15 L15 30 L19 20 M25 20 L29 30 L33 15"
              stroke="url(#wz2-g)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Aiguille centrale (le V central du W, allongé) */}
            <path className="wz2-needle" d="M19 20 L22 8 L25 20 L22 26 Z" fill="url(#wz2-g)" />

            {/* Pivot */}
            <circle cx="22" cy="22" r="1.8" fill="#0B0B0B" stroke="#E9C46A" strokeWidth="0.9" />
          </svg>
        </div>

        <div className="wz2-word" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
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
          <span className="wz2-shine" />
        </div>
      </a>

      {/* ═══ Overlay plein écran : décollage de la fusée W ═══ */}
      {launching && (
        <div className="wz-launch-overlay" aria-hidden="true">
          <style>{`
            .wz-launch-overlay {
              position: fixed; inset: 0; z-index: 9999;
              pointer-events: none; overflow: hidden;
              display: flex; justify-content: center; align-items: flex-end;
            }
            .wz-rocket {
              position: relative;
              animation: wz-fly 1150ms cubic-bezier(.55,0,.15,1) forwards;
            }
            @keyframes wz-fly {
              0%   { transform: translateY(10vh) scale(.6);  opacity: 0; }
              8%   { opacity: 1; }
              70%  { transform: translateY(-95vh) scale(1.15); opacity: 1; }
              100% { transform: translateY(-135vh) scale(.9); opacity: 0; }
            }
            .wz-rocket-w {
              width: 72px; height: 72px; position: relative; z-index: 2;
              filter: drop-shadow(0 0 10px rgba(233,196,106,.85));
            }
            .wz-flame {
              position: absolute; left: 50%; bottom: -34px; transform: translateX(-50%);
              width: 20px; height: 60px; z-index: 1;
              border-radius: 50% 50% 45% 45% / 65% 65% 35% 35%;
              background: linear-gradient(180deg, #FFF3C9 0%, #E9C46A 35%, rgba(169,128,58,0) 85%);
              filter: blur(3px);
              animation: wz-flicker 130ms ease-in-out infinite alternate;
            }
            @keyframes wz-flicker {
              0%   { transform: translateX(-50%) scaleY(1)    scaleX(1); }
              100% { transform: translateX(-50%) scaleY(1.3)  scaleX(.8); }
            }
            @media (prefers-reduced-motion: reduce) {
              .wz-rocket, .wz-flame { animation: none !important; }
            }
          `}</style>

          <div className="wz-rocket" onAnimationEnd={handleRocketAnimEnd}>
            <div className="wz-flame" />
            <svg className="wz-rocket-w" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="wzr-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#F4D98A" />
                  <stop offset="100%" stopColor="#A9803A" />
                </linearGradient>
              </defs>
              <circle cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.4" />
              <path
                d="M11 15 L15 30 L19 20 M25 20 L29 30 L33 15"
                stroke="url(#wzr-g)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
              <path d="M19 20 L22 8 L25 20 L22 26 Z" fill="url(#wzr-g)" />
              <circle cx="22" cy="22" r="1.8" fill="#0B0B0B" stroke="#E9C46A" strokeWidth="0.9" />
            </svg>
          </div>
        </div>
      )}
    </>
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