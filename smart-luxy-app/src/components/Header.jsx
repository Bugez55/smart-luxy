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
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 800, letterSpacing: '-.028em', color: 'var(--g3)' }}>
            Wazyo
          </span>
          <span style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--br)', marginTop: 3 }}>
            Boutique
          </span>
          <span className="wz2-shine" />
        </div>
      </a>

      {launching && (
        <div className="wz-launch-overlay" aria-hidden="true">
          <style>{`
            .wz-launch-overlay { position: fixed; inset: 0; z-index: 9999; pointer-events: none; overflow: hidden; }
            .wz-rocket {
              position: absolute;
              left: 50%;
              bottom: -88px;
              width: 72px;
              height: 72px;
              margin-left: -36px;
              animation: wz-fly 1550ms cubic-bezier(.22,.78,.18,1) forwards;
              transform-origin: 50% 50%;
              will-change: transform, opacity;
            }
            /* Monte depuis le bas → petit tour au milieu → remonte → rebondit sur le haut. */
            @keyframes wz-fly {
              0% { transform: translate3d(0, 0, 0) scale(.58) rotate(-8deg); opacity: 0; }
              9% { transform: translate3d(0, -7vh, 0) scale(.82) rotate(-3deg); opacity: 1; }
              34% { transform: translate3d(0, -48vh, 0) scale(1.05) rotate(0deg); opacity: 1; }
              48% { transform: translate3d(0, -48vh, 0) scale(1.05) rotate(360deg); opacity: 1; }
              73% { transform: translate3d(0, -91vh, 0) scale(1.12) rotate(710deg); opacity: 1; }
              86% { transform: translate3d(0, -101vh, 0) scale(.98) rotate(710deg); opacity: 1; }
              93% { transform: translate3d(0, -96vh, 0) scale(.92) rotate(700deg); opacity: 1; }
              100% { transform: translate3d(0, -106vh, 0) scale(.72) rotate(690deg); opacity: 0; }
            }
            .wz-rocket-w { width: 72px; height: 72px; position: relative; z-index: 2; filter: drop-shadow(0 0 10px rgba(233,196,106,.85)); }
            @media (prefers-reduced-motion: reduce) { .wz-rocket { animation: none !important; } }
          `}</style>
          <div className="wz-rocket" onAnimationEnd={handleRocketAnimEnd}>
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
          padding: 11px clamp(12px, 3vw, 30px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          transition: .28s ease;
        }
        .wz-header--top {
          background: linear-gradient(180deg, rgba(7,7,7,.80) 0%, rgba(7,7,7,.28) 100%);
          border-bottom: 1px solid transparent;
        }
        .wz-header--scrolled {
          background: color-mix(in srgb, var(--card) 88%, transparent);
          border-bottom: 1px solid rgba(255,255,255,.065);
          box-shadow: 0 14px 36px rgba(0,0,0,.20);
          backdrop-filter: blur(20px) saturate(145%);
        }
        .wz-header::after { content:''; position:absolute; left:50%; bottom:-1px; width:min(420px,46vw); height:1px; transform:translateX(-50%); background:linear-gradient(90deg,transparent,rgba(232,202,131,.50),transparent); opacity:.16; pointer-events:none; }
        .wz-header__side { display:flex; align-items:center; min-width:0; }
        .wz-header__right { display:flex; align-items:center; gap:10px; }
        .wz-cart {
          position: relative;
          display:flex;
          align-items:center;
          gap:8px;
          height:44px;
          padding:0 15px;
          border-radius:13px;
          border:1px solid rgba(255,255,255,.085);
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.022));
          color:var(--g3);
          cursor:pointer;
          font-size:12px;
          font-weight:800;
          letter-spacing:.01em;
          transition: transform .18s ease, border-color .18s ease, background .18s ease;
        }
        .wz-cart:hover { transform: translateY(-1px); border-color: rgba(232,202,131,.35); background: linear-gradient(180deg, rgba(232,202,131,.10), rgba(255,255,255,.032)); }
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
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
          opacity:.75;
          white-space:nowrap;
        }
        @media (prefers-reduced-motion: reduce) {
          .wz2-ring-grp, .wz2-ring, .wz2-needle, .wz2-shine, .wz-rocket, .wz-flame { animation:none !important; }
          .wz-header, .wz-cart, .wz2-logo { transition:none !important; }
        }

        @media (max-width: 640px) {
          .wz-header { padding:9px 12px; }
          .wz-mark-mobile .wz2-mark, .wz-mark-mobile .wz2-word { transform: scale(.94); transform-origin:left center; }
          .wz-header__hint { display:none; }
          .wz-cart { width:42px; height:40px; padding:0; justify-content:center; border-radius:12px; }
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
