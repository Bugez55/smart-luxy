
import { useState, useEffect, useCallback } from 'react'

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
        className="wz-header-logo"
      >
        <span className="wz-header-logo__mark" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <defs>
              <linearGradient id="wz-header-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F4D98A" />
                <stop offset="100%" stopColor="#A9803A" />
              </linearGradient>
            </defs>
            <g className="wz-header-logo__orbit">
              <circle cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.25" />
              <circle cx="22" cy="4" r="1.15" fill="#E9C46A" />
              <circle cx="40" cy="22" r="1.15" fill="#E9C46A" opacity=".7" />
              <circle cx="22" cy="40" r="1.15" fill="#E9C46A" opacity=".7" />
              <circle cx="4" cy="22" r="1.15" fill="#E9C46A" opacity=".7" />
            </g>
            <path
              className="wz-header-logo__letter"
              d="M11 15 L15 30 L19 20 M25 20 L29 30 L33 15"
              stroke="url(#wz-header-gold)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M19 20 L22 8 L25 20 L22 26 Z" fill="url(#wz-header-gold)" />
            <circle cx="22" cy="22" r="1.8" fill="#0B0B0B" stroke="#E9C46A" strokeWidth=".9" />
          </svg>
        </span>

        <span className="wz-header-logo__wordmark">
          <span className="wz-header-logo__name">Wazyo</span>
          <span className="wz-header-logo__subtitle">Boutique</span>
          <span className="wz-header-logo__shine" aria-hidden="true" />
        </span>
      </a>

      {launching && (
        <div className="wz-launch-overlay" aria-hidden="true">
          <style>{`
            .wz-launch-overlay{position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;}
            .wz-rocket{position:absolute;left:50%;bottom:-88px;width:72px;height:72px;margin-left:-36px;animation:wz-header-rocket-flight 1550ms cubic-bezier(.22,.78,.18,1) forwards;will-change:transform,opacity;}
            .wz-rocket-w{width:72px;height:72px;filter:drop-shadow(0 0 12px rgba(233,196,106,.65));}
            @keyframes wz-header-rocket-flight{
              0%{transform:translate3d(0,0,0) scale(.58) rotate(-8deg);opacity:0;}
              9%{transform:translate3d(0,-7vh,0) scale(.82) rotate(-3deg);opacity:1;}
              34%{transform:translate3d(0,-48vh,0) scale(1.05);opacity:1;}
              48%{transform:translate3d(0,-48vh,0) scale(1.05) rotate(360deg);opacity:1;}
              73%{transform:translate3d(0,-91vh,0) scale(1.12) rotate(710deg);opacity:1;}
              86%{transform:translate3d(0,-101vh,0) scale(.98) rotate(710deg);opacity:1;}
              93%{transform:translate3d(0,-96vh,0) scale(.92) rotate(700deg);opacity:1;}
              100%{transform:translate3d(0,-106vh,0) scale(.72) rotate(690deg);opacity:0;}
            }
            @media(prefers-reduced-motion:reduce){.wz-rocket{animation:none!important;}}
          `}</style>
          <div className="wz-rocket" onAnimationEnd={handleRocketAnimEnd}>
            <svg className="wz-rocket-w" viewBox="0 0 44 44" fill="none">
              <defs><linearGradient id="wz-header-rocket-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F4D98A" /><stop offset="100%" stopColor="#A9803A" /></linearGradient></defs>
              <circle cx="22" cy="22" r="18" stroke="#E9C46A" strokeWidth="1.4" />
              <path d="M11 15 L15 30 L19 20 M25 20 L29 30 L33 15" stroke="url(#wz-header-rocket-g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M19 20 L22 8 L25 20 L22 26 Z" fill="url(#wz-header-rocket-g)" />
              <circle cx="22" cy="22" r="1.8" fill="#0B0B0B" stroke="#E9C46A" strokeWidth=".9" />
            </svg>
          </div>
        </div>
      )}
    </>
  )
}

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
        .wz-header{
          position:sticky;
          top:0;
          z-index:100;
          width:100%;
          min-height:68px;
          box-sizing:border-box;
          padding:10px clamp(14px,3.2vw,34px);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          border-bottom:1px solid transparent;
          transition:background .28s ease,border-color .28s ease,box-shadow .28s ease,backdrop-filter .28s ease;
        }

        .wz-header--top{
          background:linear-gradient(180deg,rgba(7,8,12,.78),rgba(7,8,12,.34));
        }

        .wz-header--scrolled{
          background:rgba(10,12,17,.88);
          border-bottom-color:rgba(213,183,112,.15);
          box-shadow:0 12px 34px rgba(0,0,0,.24);
          backdrop-filter:blur(18px) saturate(140%);
          -webkit-backdrop-filter:blur(18px) saturate(140%);
        }

        .wz-header::after{
          content:"";
          position:absolute;
          left:50%;
          bottom:-1px;
          width:min(440px,48vw);
          height:1px;
          transform:translateX(-50%);
          background:linear-gradient(90deg,transparent,rgba(232,202,131,.55),transparent);
          opacity:.24;
          pointer-events:none;
        }

        .wz-header__side,.wz-header__right{display:flex;align-items:center;min-width:0;}
        .wz-header__right{gap:14px;}

        .wz-header-logo{
          display:inline-flex;
          align-items:center;
          gap:10px;
          min-width:0;
          color:inherit;
          text-decoration:none;
          outline:none;
          border-radius:10px;
        }

        .wz-header-logo:focus-visible{
          box-shadow:0 0 0 3px rgba(213,183,112,.34);
        }

        .wz-header-logo__mark{width:44px;height:44px;display:block;flex:0 0 44px;}
        .wz-header-logo__mark svg{display:block;width:100%;height:100%;}
        .wz-header-logo__orbit{transform-origin:22px 22px;animation:wz-header-orbit 22s linear infinite;}
        @keyframes wz-header-orbit{to{transform:rotate(360deg);}}
        .wz-header-logo__letter{transition:filter .25s ease;}

        .wz-header-logo__wordmark{
          position:relative;
          display:flex;
          flex-direction:column;
          min-width:0;
          overflow:hidden;
          line-height:1;
        }

        .wz-header-logo__name{
          color:var(--g3);
          font-family:'Fraunces',Georgia,serif;
          font-size:23px;
          font-weight:800;
          letter-spacing:-.035em;
        }

        .wz-header-logo__subtitle{
          margin-top:4px;
          color:var(--br);
          font-family:'Outfit',system-ui,sans-serif;
          font-size:8px;
          font-weight:850;
          letter-spacing:.27em;
          text-transform:uppercase;
        }

        .wz-header-logo__shine{
          position:absolute;
          top:0;
          left:-65%;
          width:42%;
          height:100%;
          background:linear-gradient(100deg,transparent,rgba(233,196,106,.48),transparent);
          transform:skewX(-18deg);
          pointer-events:none;
        }

        .wz-header-logo:hover .wz-header-logo__shine{animation:wz-header-shine .85s ease forwards;}
        .wz-header-logo:hover .wz-header-logo__letter{filter:drop-shadow(0 0 5px rgba(233,196,106,.45));}
        @keyframes wz-header-shine{to{left:145%;}}

        .wz-header__hint{
          color:var(--g4);
          font-size:9px;
          font-weight:750;
          letter-spacing:.14em;
          text-transform:uppercase;
          opacity:.82;
          white-space:nowrap;
        }

        .wz-cart{
          position:relative;
          min-width:108px;
          height:44px;
          padding:0 15px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:9px;
          border:1px solid rgba(213,183,112,.22);
          border-radius:13px;
          background:linear-gradient(145deg,rgba(213,183,112,.10),rgba(255,255,255,.025));
          color:var(--g3);
          cursor:pointer;
          font:inherit;
          font-size:12px;
          font-weight:850;
          letter-spacing:.025em;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 5px 16px rgba(0,0,0,.12);
          transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease;
        }

        .wz-cart:hover{
          transform:translateY(-2px);
          border-color:rgba(213,183,112,.48);
          background:linear-gradient(145deg,rgba(213,183,112,.16),rgba(255,255,255,.04));
          box-shadow:0 9px 22px rgba(0,0,0,.20),0 0 20px rgba(213,183,112,.06);
        }

        .wz-cart:active{transform:translateY(0);}
        .wz-cart:focus-visible{outline:2px solid #d5b770;outline-offset:3px;}
        .wz-cart__icon{display:block;flex:0 0 auto;}
        .wz-cart__label{display:inline-block;}

        .wz-cart__count{
          position:absolute;
          top:-7px;
          right:-7px;
          min-width:20px;
          height:20px;
          padding:0 5px;
          box-sizing:border-box;
          display:flex;
          align-items:center;
          justify-content:center;
          border:2px solid #0b0d12;
          border-radius:999px;
          background:linear-gradient(135deg,#f4d98a,#bb9148);
          color:#17130b;
          font-size:9px;
          font-weight:950;
          box-shadow:0 3px 10px rgba(0,0,0,.25);
        }

        @media(max-width:640px){
          .wz-header{min-height:60px;padding:8px 12px;gap:10px;}
          .wz-header__right{gap:8px;}
          .wz-header__hint{display:none;}
          .wz-header-logo{gap:8px;}
          .wz-header-logo__mark{width:39px;height:39px;flex-basis:39px;}
          .wz-header-logo__name{font-size:21px;}
          .wz-header-logo__subtitle{font-size:7px;}
          .wz-cart{min-width:42px;width:42px;height:40px;padding:0;border-radius:12px;}
          .wz-cart__label{display:none;}
        }

        @media(prefers-reduced-motion:reduce){
          .wz-header,.wz-cart,.wz-header-logo__letter{transition:none!important;}
          .wz-header-logo__orbit,.wz-header-logo__shine,.wz-rocket{animation:none!important;}
        }
      `}</style>

      <header className={`wz-header ${scrolled ? 'wz-header--scrolled' : 'wz-header--top'}`}>
        <div className="wz-header__side">
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
