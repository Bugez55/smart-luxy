import { useState, useEffect } from 'react'

function LogoWazyo() {
  return (
    <a href="/" className="wz-header-logo" aria-label="WAZYO — Accueil">
      <span className="wz-header-logo__name">WAZYO</span>
      <span className="wz-header-logo__subtitle">BOUTIQUE EN LIGNE · ALGÉRIE</span>
    </a>
  )
}

export default function Header({ cartCount, onCartOpen, search = '', onSearch }) {
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
          min-height:76px;
          box-sizing:border-box;
          padding:10px clamp(18px,4vw,58px);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:clamp(16px,3vw,42px);
          border-bottom:1px solid rgba(213,183,112,.12);
          background:rgba(7,8,11,.88);
          transition:background .25s ease,border-color .25s ease,box-shadow .25s ease,backdrop-filter .25s ease;
        }
        .wz-header--top{
          background:linear-gradient(180deg,rgba(7,8,11,.82),rgba(7,8,11,.68));
        }
        .wz-header--scrolled{
          background:rgba(7,8,11,.94);
          border-bottom-color:rgba(213,183,112,.22);
          box-shadow:0 12px 34px rgba(0,0,0,.28);
          backdrop-filter:blur(18px) saturate(135%);
          -webkit-backdrop-filter:blur(18px) saturate(135%);
        }
        .wz-header__side,.wz-header__nav,.wz-header__tools{
          display:flex;
          align-items:center;
          min-width:0;
        }
        .wz-header__side{flex:0 0 auto;}
        .wz-header__nav{
          justify-content:center;
          gap:clamp(16px,2.5vw,34px);
          margin:0 auto;
        }
        .wz-header__nav a{
          position:relative;
          display:inline-flex;
          align-items:center;
          min-height:42px;
          color:rgba(255,255,255,.72);
          text-decoration:none;
          font-size:12px;
          font-weight:700;
          letter-spacing:.035em;
          transition:color .2s ease;
        }
        .wz-header__nav a::after{
          content:"";
          position:absolute;
          left:0;
          right:0;
          bottom:4px;
          height:1px;
          background:linear-gradient(90deg,#d5b770,#f1d99e);
          transform:scaleX(0);
          transform-origin:left;
          transition:transform .22s ease;
        }
        .wz-header__nav a:hover,
        .wz-header__nav a:focus-visible{color:#f1d99e;}
        .wz-header__nav a:hover::after,
        .wz-header__nav a:focus-visible::after{transform:scaleX(1);}
        .wz-header-logo{
          display:inline-flex;
          flex-direction:column;
          align-items:flex-start;
          justify-content:center;
          gap:4px;
          min-width:0;
          color:inherit;
          text-decoration:none;
          outline:none;
          border-radius:7px;
        }
        .wz-header-logo:focus-visible{
          outline:2px solid #d5b770;
          outline-offset:5px;
        }
        .wz-header-logo__name{
          color:#f7f4ed;
          font-family:'Outfit',Arial,sans-serif;
          font-size:clamp(27px,2.2vw,34px);
          line-height:.9;
          font-weight:800;
          letter-spacing:.075em;
        }
        .wz-header-logo__subtitle{
          color:#d5b770;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:7px;
          line-height:1.2;
          font-weight:750;
          letter-spacing:.19em;
          white-space:nowrap;
        }
        .wz-header__tools{
          flex:0 1 auto;
          justify-content:flex-end;
          gap:12px;
        }
        .wz-header-search{
          position:relative;
          display:flex;
          align-items:center;
          width:clamp(180px,20vw,270px);
          height:40px;
          border:1px solid rgba(255,255,255,.15);
          border-radius:999px;
          background:rgba(255,255,255,.035);
          transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;
        }
        .wz-header-search:focus-within{
          border-color:rgba(213,183,112,.65);
          background:rgba(213,183,112,.055);
          box-shadow:0 0 0 3px rgba(213,183,112,.08);
        }
        .wz-header-search svg{
          flex:0 0 auto;
          margin-left:14px;
          color:rgba(255,255,255,.58);
        }
        .wz-header-search input{
          width:100%;
          min-width:0;
          height:100%;
          padding:0 14px 0 10px;
          border:0;
          outline:0;
          background:transparent;
          color:#f7f4ed;
          font-family:inherit;
          font-size:12px;
          box-shadow:none!important;
        }
        .wz-header-search input::placeholder{color:rgba(255,255,255,.42);}
        .wz-cart{
          position:relative;
          min-width:104px;
          height:42px;
          padding:0 15px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:9px;
          border:1px solid rgba(213,183,112,.34);
          border-radius:999px;
          background:linear-gradient(145deg,rgba(213,183,112,.14),rgba(255,255,255,.025));
          color:#f4dfaa;
          cursor:pointer;
          font:inherit;
          font-size:12px;
          font-weight:800;
          letter-spacing:.025em;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
          transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease;
        }
        .wz-cart:hover{
          transform:translateY(-1px);
          border-color:rgba(213,183,112,.72);
          background:linear-gradient(145deg,rgba(213,183,112,.22),rgba(255,255,255,.045));
          box-shadow:0 8px 22px rgba(0,0,0,.22),0 0 18px rgba(213,183,112,.07);
        }
        .wz-cart:active{transform:translateY(0);}
        .wz-cart:focus-visible{outline:2px solid #d5b770;outline-offset:3px;}
        .wz-cart__icon{display:block;flex:0 0 auto;}
        .wz-cart__label{display:inline-block;}
        .wz-cart__count{
          position:absolute;
          top:-7px;
          right:-6px;
          min-width:19px;
          height:19px;
          padding:0 5px;
          box-sizing:border-box;
          display:flex;
          align-items:center;
          justify-content:center;
          border:2px solid #090a0e;
          border-radius:999px;
          background:linear-gradient(135deg,#f4d98a,#bb9148);
          color:#17130b;
          font-size:9px;
          font-weight:950;
          box-shadow:0 3px 10px rgba(0,0,0,.25);
        }
        @media(max-width:820px){
          .wz-header{min-height:68px;padding:9px 18px;gap:18px;}
          .wz-header__nav{gap:18px;}
          .wz-header-search{width:clamp(150px,25vw,220px);}
        }
        @media(max-width:640px){
          .wz-header{min-height:62px;padding:8px 13px;gap:10px;}
          .wz-header-logo__name{font-size:25px;}
          .wz-header-logo__subtitle{font-size:6px;letter-spacing:.15em;}
          .wz-header__nav{display:none;}
          .wz-header__tools{gap:8px;margin-left:auto;}
          .wz-header-search{width:40px;height:40px;border:0;background:transparent;}
          .wz-header-search:focus-within{
            position:absolute;
            left:12px;
            right:62px;
            width:auto;
            z-index:2;
            border:1px solid rgba(213,183,112,.65);
            background:#101116;
          }
          .wz-header-search svg{margin-left:11px;}
          .wz-header-search input{padding-right:8px;}
          .wz-header-search input:not(:focus){width:0;padding:0;opacity:0;}
          .wz-header-search:focus-within input{width:100%;padding:0 10px;opacity:1;}
          .wz-cart{min-width:42px;width:42px;height:40px;padding:0;border-radius:50%;}
          .wz-cart__label{display:none;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-header,.wz-header__nav a,.wz-cart,.wz-header-search{transition:none!important;}
        }
      `}</style>

      <header className={'wz-header ' + (scrolled ? 'wz-header--scrolled' : 'wz-header--top')}>
        <div className="wz-header__side">
          <LogoWazyo />
        </div>

        <nav className="wz-header__nav" aria-label="Navigation principale">
          <a href="/" aria-current="page">Accueil</a>
          <a href="#collection">Boutique</a>
        </nav>

        <div className="wz-header__tools">
          <label className="wz-header-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              aria-label="Rechercher un produit"
              placeholder="Rechercher un produit..."
              value={search || ''}
              onChange={event => typeof onSearch === 'function' && onSearch(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="wz-cart"
            onClick={onCartOpen}
            aria-label={cartCount > 0 ? 'Ouvrir le panier, ' + cartCount + ' article(s)' : 'Ouvrir le panier'}
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
