import { useState, useEffect, useCallback } from 'react'

// ══════════════════════════════════════════════
//  LOGO WAZYO — Boussole toujours vivante
//  + décollage fusée en plein écran au clic → reload
// ══════════════════════════════════════════════
function LogoWazyo() {
  const [launching, setLaunching] = useState(false)

  const handleClick = useCallback((e) => {
    e.preventDefault()
    if (launching) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      window.location.reload()
      return
    }
    setLaunching(true)
  }, [launching])

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
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 11 }}
      >
        <style>{`
          .wz2-logo { --gold: #E9C46A; --gold-soft: #F4D98A; --gold-deep: #A9803A; position: relative; outline: none; }
          .wz2-logo:focus-visible { box-shadow: 0 0 0 2px var(--gold); border-radius: 8px; }
          .wz2-mark { width: 42px; height: 42px; flex-shrink: 0; }
          .wz2-ring-grp { transform-origin: 21px 21px; animation: wz2-spin 9s linear infinite; }
          @keyframes wz2-spin { to { transform: rotate(360deg); } }
          .wz2-ring { animation: wz2-breath 4s ease-in-out infinite; transform-origin: 21px 21px; }
          @keyframes wz2-breath { 0%,100% { opacity: .8; } 50% { opacity: 1; } }
          .wz2-needle { transform-origin: 21px 21px; animation: wz2-wobble 3s ease-in-out infinite; }
          @keyframes wz2-wobble { 0%,100% { transform: scaleY(1) rotate(-2deg); } 50% { transform: scaleY(1.08) rotate(2deg); } }
          .wz2-w { transition: fill .3s ease; }
          .wz2-logo:hover .wz2-w { fill: var(--gold-soft); }
          .wz2-logo:hover .wz2-ring { stroke: var(--gold-soft); }
          .wz2-word { position: relative; overflow: hidden; }
          .wz2-shine {
            position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
            background: linear-gradient(100deg, transparent, rgba(233,196,106,.6), transparent);
            transform: skewX(-18deg); pointer-events: none;
          }
          .wz2-logo:hover .wz2-shine { animation: wz2-sweep .9s ease forwards; }
          @keyframes wz2-sweep { to { left: 140%; } }
          @media (prefers-reduced-motion: reduce) {
            .wz2-ring-grp, .wz2-ring, .wz2-needle, .wz2-shine { animation: none !important; transition: none !important; }
          }
        `}</style>

        <div className="wz2-mark">
          <svg width="42" height="42" viewBox="0 0 44 44" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="wz2-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F4D98A" />
                <stop offset="100%" stopColor="#A9803A" />
              </linearGradient>
            </defs>
            <g className="wz2-ring-grp">
              <circle className="wz2-ring" cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.4" />
              <circle cx="22" cy="4" r="1.2" fill="#E9C46A" opacity=".7" />
              <circle cx="40" cy="22" r="1.2" fill="#E9C46A" opacity=".5" />
              <circle cx="22" cy="40" r="1.2" fill="#E9C46A" opacity=".5" />
              <circle cx="4" cy="22" r="1.2" fill="#E9C46A" opacity=".5" />
            </g>
            <path className="wz2-w" d="M11 15 L15 30 L19 20 M25 20 L29 30 L33 15" stroke="url(#wz2-g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path className="wz2-needle" d="M19 20 L22 8 L25 20 L22 26 Z" fill="url(#wz2-g)" />
            <circle cx="22" cy="22" r="1.8" fill="#0B0B0B" stroke="#E9C46A" strokeWidth="0.9" />
          </svg>
        </div>

        <div className="wz2-word" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 800, letterSpacing: '.01em', color: 'var(--g3)' }}>
            Wazyo
          </span>
          <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 8.5, fontWeight: 700, letterSpacing: '.23em', textTransform: 'uppercase', color: 'var(--br)', marginTop: 3 }}>
            Boutique
          </span>
          <span className="wz2-shine" />
        </div>
      </a>

      {launching && (
        <div className="wz-launch-overlay" aria-hidden="true">
          <style>{`
            .wz-launch-overlay { position: fixed; inset: 0; z-index: 9999; pointer-events: none; overflow: hidden; display: flex; justify-content: center; align-items: flex-end; }
            .wz-rocket { position: relative; animation: wz-fly 1150ms cubic-bezier(.55,0,.15,1) forwards; }
            @keyframes wz-fly { 0% { transform: translateY(10vh) scale(.6); opacity: 0; } 8% { opacity: 1; } 70% { transform: translateY(-95vh) scale(1.15); opacity: 1; } 100% { transform: translateY(-135vh) scale(.9); opacity: 0; } }
            .wz-rocket-w { width: 72px; height: 72px; position: relative; z-index: 2; filter: drop-shadow(0 0 10px rgba(233,196,106,.85)); }
            .wz-flame { position: absolute; left: 50%; bottom: -34px; transform: translateX(-50%); width: 20px; height: 60px; z-index: 1; border-radius: 50% 50% 45% 45% / 65% 65% 35% 35%; background: linear-gradient(180deg, #FFF3C9 0%, #E9C46A 35%, rgba(169,128,58,0) 85%); filter: blur(3px); animation: wz-flicker 130ms ease-in-out infinite alternate; }
            @keyframes wz-flicker { 0% { transform: translateX(-50%) scaleY(1) scaleX(1); } 100% { transform: translateX(-50%) scaleY(1.3) scaleX(.8); } }
            @media (prefers-reduced-motion: reduce) { .wz-rocket, .wz-flame { animation: none !important; } }
          `}</style>
          <div className="wz-rocket" onAnimationEnd={handleRocketAnimEnd}>
            <div className="wz-flame" />
            <svg className="wz-rocket-w" viewBox="0 0 44 44" fill="none">
              <defs><linearGradient id="wzr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F4D98A" /><stop offset="100%" stopColor="#A9803A" /></linearGradient></defs>
              <circle cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.4" />
              <path d="M11 15 L15 30 L19 20 M25 20 L29 30 L33 15" stroke="url(#wzr-g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
//  HEADER PREMIUM — barre compacte + panier élégant
// ══════════════════════════════════════════════
export default function Header({ cartCount, onCartOpen, search, onSearch }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 18)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{`
        .wz-header {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          box-sizing: border-box;
          padding: 12px clamp(14px, 3vw, 30px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          transition: .28s ease;
        }
        .wz-header--top {
          background: linear-gradient(180deg, rgba(10,10,10,.82) 0%, rgba(10,10,10,.35) 100%);
          border-bottom: 1px solid transparent;
        }
        .wz-header--scrolled {
          background: color-mix(in srgb, var(--card) 88%, transparent);
          border-bottom: 1px solid rgba(255,255,255,.07);
          box-shadow: 0 10px 30px rgba(0,0,0,.16);
          backdrop-filter: blur(18px) saturate(130%);
        }
        .wz-header__side { display:flex; align-items:center; min-width:0; }
        .wz-header__right { display:flex; align-items:center; gap:10px; }
        .wz-cart {
          position: relative;
          display:flex;
          align-items:center;
          gap:8px;
          height:42px;
          padding:0 14px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.10);
          background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.035));
          color:var(--g3);
          cursor:pointer;
          font-size:12px;
          font-weight:800;
          letter-spacing:.01em;
          transition: transform .18s ease, border-color .18s ease, background .18s ease;
        }
        .wz-cart:hover { transform: translateY(-1px); border-color: rgba(201,168,76,.42); background: linear-gradient(180deg, rgba(201,168,76,.13), rgba(255,255,255,.04)); }
        .wz-cart:active { transform: translateY(0); }
        .wz-cart__icon { display:block; flex:0 0 auto; }
        .wz-cart__label { display:inline-block; }
        .wz-cart__count {
          position:absolute; top:-6px; right:-6px;
          min-width:19px; height:19px; padding:0 5px; border-radius:999px;
          display:flex; align-items:center; justify-content:center;
          background:var(--br); color:#090909; border:2px solid var(--bk);
          font-size:9px; font-weight:900;
          box-sizing:border-box;
        }
        .wz-header__hint {
          color:var(--g4);
          font-size:10px;
          letter-spacing:.08em;
          text-transform:uppercase;
          opacity:.75;
          white-space:nowrap;
        }
        @media (max-width: 640px) {
          .wz-header { padding:10px 12px; }
          .wz-mark-mobile .wz2-mark, .wz-mark-mobile .wz2-word { transform: scale(.94); transform-origin:left center; }
          .wz-header__hint { display:none; }
          .wz-cart { width:42px; padding:0; justify-content:center; border-radius:13px; }
          .wz-cart__label { display:none; }
        }
      `}</style>

      <header className={`wz-header ${scrolled ? 'wz-header--scrolled' : 'wz-header--top'}`}>
        <div className="wz-header__side wz-mark-mobile">
          <LogoWazyo />
        </div>

        <div className="wz-header__right">
          <span className="wz-header__hint">Boutique en ligne · Algérie</span>

          <button
            type="button"
            className="wz-cart"
            onClick={onCartOpen}
            aria-label={`Ouvrir le panier${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? 's' : ''}` : ''}`}
          >
            <svg className="wz-cart__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="wz-cart__label">Panier</span>
            {cartCount > 0 && <span className="wz-cart__count">{cartCount > 99 ? '99+' : cartCount}</span>}
          </button>
        </div>
      </header>
    </>
  )
}
