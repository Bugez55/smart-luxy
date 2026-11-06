
import { useState, useEffect } from 'react'

export default function Hero({
  onScrollToCollection,
  onDiscoverProduct,
  heroImage,
  heroMediaType = 'image',
  heroFallbackImage,
  heroCustomMedia = false,
}) {
  const [introReady, setIntroReady] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaFailed, setMediaFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  const primaryImage = heroImage || heroFallbackImage || ''
  const fallbackImage = heroFallbackImage && heroFallbackImage !== primaryImage
    ? heroFallbackImage
    : ''

  useEffect(() => {
    setIntroReady(false)
    setMediaReady(false)
    setMediaFailed(false)
    setFallbackFailed(false)

    const frame = window.requestAnimationFrame(() => setIntroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [heroImage, heroFallbackImage, heroMediaType])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    update()

    if (query.addEventListener) {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }

    query.addListener(update)
    return () => query.removeListener(update)
  }, [])

  const useStaticVideoFallback = reduceMotion && heroMediaType === 'video'
  const effectiveImage = useStaticVideoFallback
    ? fallbackImage
    : mediaFailed
      ? (fallbackFailed ? '' : fallbackImage)
      : primaryImage
  const effectiveType = !useStaticVideoFallback && !mediaFailed && heroMediaType === 'video'
    ? 'video'
    : 'image'

  function handleMediaError() {
    setMediaReady(false)
    if (!mediaFailed && fallbackImage) {
      setMediaFailed(true)
      return
    }
    setFallbackFailed(true)
  }

  function handleExplore() {
    if (typeof onScrollToCollection === 'function') onScrollToCollection()
  }

  function handleDiscover() {
    if (typeof onDiscoverProduct === 'function') onDiscoverProduct()
  }

  const hasCustomMedia = heroCustomMedia && !mediaFailed && !useStaticVideoFallback

  return (
    <section
      className={`wz-hero ${hasCustomMedia ? 'has-custom-media' : ''}`}
      aria-labelledby="wz-hero-title"
    >
      <div className="wz-hero-media" aria-hidden="true">
        {effectiveImage ? (
          effectiveType === 'video' ? (
            <video
              src={effectiveImage}
              poster={fallbackImage || undefined}
              className={`wz-hero-video ${mediaReady ? 'is-loaded' : ''}`}
              autoPlay={!reduceMotion}
              muted
              loop={!reduceMotion}
              playsInline
              preload={reduceMotion ? 'none' : 'metadata'}
              tabIndex={-1}
              onLoadedData={() => setMediaReady(true)}
              onError={handleMediaError}
            />
          ) : (
            <img
              src={effectiveImage}
              alt=""
              className={`wz-hero-image ${mediaReady ? 'is-loaded' : ''}`}
              fetchPriority="high"
              decoding="async"
              onLoad={() => setMediaReady(true)}
              onError={handleMediaError}
            />
          )
        ) : (
          <div className="wz-hero-fallback" />
        )}

        <div className="wz-hero-overlay" />
        <div className="wz-hero-glow" />
        <div className="wz-hero-grain" />
      </div>

      <div className="wz-hero-inner">
        <div className={`wz-hero-content ${introReady ? 'is-loaded' : ''}`}>
          <div className="wz-hero-kicker">
            <span className="wz-hero-kicker-line" />
            <span>Wazyo <i aria-hidden="true">·</i> Boutique en ligne</span>
          </div>

          <h1 id="wz-hero-title" className="wz-hero-title">
            L’essentiel,
            <br />
            <span>mieux choisi.</span>
          </h1>

          <p className="wz-hero-subtitle">
            Une sélection de produits utiles, présentés avec simplicité.
          </p>

          <div className="wz-hero-actions">
            <button type="button" onClick={handleExplore} className="wz-hero-primary">
              <span>Explorer la collection</span>
              <span className="wz-hero-arrow" aria-hidden="true">↗</span>
            </button>

            {onDiscoverProduct && (
              <button type="button" onClick={handleDiscover} className="wz-hero-secondary">
                Voir le produit phare
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="wz-hero-scroll" aria-hidden="true">
        <span className="wz-hero-scroll-line" />
        <span>Défiler</span>
      </div>

      <div className="wz-hero-index" aria-hidden="true">
        <span>W</span><i /><span>01</span>
      </div>

      <style>{`
        .wz-hero{
          --wz-hero-gold:#d8bb78;
          position:relative;
          isolation:isolate;
          width:100%;
          height:min(860px,90svh);
          min-height:620px;
          overflow:hidden;
          background:#080a0f;
          border-bottom:1px solid rgba(216,187,120,.12);
        }
        .wz-hero-media,.wz-hero-overlay,.wz-hero-glow,.wz-hero-grain{
          position:absolute;inset:0;pointer-events:none;
        }
        .wz-hero-media{
          z-index:-3;overflow:hidden;
          background:radial-gradient(ellipse at 74% 38%,rgba(216,187,120,.16),transparent 30%),linear-gradient(135deg,#14130f 0%,#090a0e 58%,#06070a 100%);
        }
        .wz-hero-fallback{
          width:100%;height:100%;
          background:radial-gradient(ellipse at 72% 40%,rgba(216,187,120,.18),transparent 27%),linear-gradient(135deg,#15140f,#090a0e 62%,#06070a);
        }
        .wz-hero-image,.wz-hero-video{
          display:block;width:100%;height:100%;object-fit:cover;object-position:center;
          opacity:.58;transform:scale(1.045);filter:saturate(.78) contrast(1.06) brightness(.88);
          transition:opacity 1.1s ease,filter 1.1s ease;
          animation:wzHeroKenBurns 30s ease-in-out infinite alternate;will-change:transform;
        }
        .wz-hero-image.is-loaded,.wz-hero-video.is-loaded{opacity:.78;filter:saturate(.88) contrast(1.04) brightness(.94);}
        .wz-hero.has-custom-media .wz-hero-image,.wz-hero.has-custom-media .wz-hero-video{opacity:.90;filter:saturate(.92) contrast(1.03) brightness(.96);}
        .wz-hero.has-custom-media .wz-hero-image.is-loaded,.wz-hero.has-custom-media .wz-hero-video.is-loaded{opacity:.94;}
        .wz-hero-overlay{
          z-index:-2;
          background:linear-gradient(90deg,rgba(5,6,10,.94) 0%,rgba(5,6,10,.82) 27%,rgba(5,6,10,.48) 57%,rgba(5,6,10,.20) 100%),linear-gradient(0deg,#080a0f 0%,rgba(8,10,15,.10) 38%,rgba(8,10,15,.18) 100%);
        }
        .wz-hero.has-custom-media .wz-hero-overlay{
          background:linear-gradient(90deg,rgba(5,6,10,.78) 0%,rgba(5,6,10,.62) 28%,rgba(5,6,10,.24) 66%,rgba(5,6,10,.08) 100%),linear-gradient(0deg,rgba(8,10,15,.70) 0%,rgba(8,10,15,.08) 52%,rgba(8,10,15,.18) 100%);
        }
        .wz-hero-glow{
          z-index:-1;opacity:.58;
          background:radial-gradient(ellipse at 72% 42%,rgba(216,187,120,.18),transparent 38%),linear-gradient(115deg,transparent 36%,rgba(216,187,120,.035) 58%,transparent 78%);
          animation:wzHeroGlow 12s ease-in-out infinite alternate;
        }
        .wz-hero-grain{
          z-index:0;opacity:.10;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.24'/%3E%3C/svg%3E");
          mix-blend-mode:soft-light;
        }
        .wz-hero::before,.wz-hero::after{
          content:'';position:absolute;z-index:1;left:clamp(18px,3.2vw,48px);right:clamp(18px,3.2vw,48px);
          height:1px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(216,187,120,.24),transparent);
        }
        .wz-hero::before{top:0;opacity:.5;}.wz-hero::after{bottom:0;opacity:.7;}
        .wz-hero-inner{
          position:relative;z-index:2;width:min(1280px,calc(100% - 56px));height:100%;margin:0 auto;
          display:flex;align-items:center;box-sizing:border-box;
        }
        .wz-hero-content{
          position:relative;width:min(760px,100%);padding:60px 0;
          opacity:0;transform:translateY(18px);
          transition:opacity .85s ease,transform .9s cubic-bezier(.2,.72,.2,1);
        }
        .wz-hero-content.is-loaded{opacity:1;transform:translateY(0);}
        .wz-hero-kicker,.wz-hero-title,.wz-hero-subtitle,.wz-hero-actions{
          animation:wzHeroReveal .8s cubic-bezier(.2,.72,.2,1) both;animation-play-state:paused;
        }
        .wz-hero-content.is-loaded .wz-hero-kicker,.wz-hero-content.is-loaded .wz-hero-title,
        .wz-hero-content.is-loaded .wz-hero-subtitle,.wz-hero-content.is-loaded .wz-hero-actions{animation-play-state:running;}
        .wz-hero-content.is-loaded .wz-hero-kicker{animation-delay:.04s;}
        .wz-hero-content.is-loaded .wz-hero-title{animation-delay:.12s;}
        .wz-hero-content.is-loaded .wz-hero-subtitle{animation-delay:.22s;}
        .wz-hero-content.is-loaded .wz-hero-actions{animation-delay:.30s;}
        .wz-hero-kicker{
          display:flex;align-items:center;gap:12px;margin-bottom:22px;color:rgba(255,255,255,.72);
          font-size:10px;line-height:1;font-weight:800;letter-spacing:.23em;text-transform:uppercase;
        }
        .wz-hero-kicker i{color:var(--wz-hero-gold);font-style:normal;padding:0 2px;}
        .wz-hero-kicker-line{width:38px;height:1px;flex:0 0 auto;background:var(--wz-hero-gold);box-shadow:0 0 18px rgba(216,187,120,.42);}
        .wz-hero-title{
          margin:0;max-width:790px;color:#fff;font-family:'Fraunces',Georgia,'Times New Roman',serif;
          font-size:clamp(54px,7.6vw,100px);line-height:.94;font-weight:600;letter-spacing:-.058em;
          text-wrap:balance;text-shadow:0 12px 42px rgba(0,0,0,.42);
        }
        .wz-hero-title span{position:relative;color:#dfc486;font-style:italic;font-weight:500;text-shadow:0 0 38px rgba(216,187,120,.14);}
        .wz-hero-subtitle{max-width:535px;margin:24px 0 0;color:rgba(255,255,255,.84);font-size:15px;line-height:1.75;font-weight:400;letter-spacing:.008em;}
        .wz-hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px;}
        .wz-hero-primary,.wz-hero-secondary{
          min-height:52px;padding:0 23px;border-radius:999px;cursor:pointer;font-family:inherit;
          font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
          transition:transform .24s ease,background .24s ease,border-color .24s ease,color .24s ease,box-shadow .24s ease;
        }
        .wz-hero-primary{
          display:inline-flex;align-items:center;justify-content:center;gap:18px;border:1px solid #e4ca8d;
          background:linear-gradient(135deg,#ead49c 0%,#c6a45f 100%);color:#15130e;
          box-shadow:0 12px 32px rgba(0,0,0,.22),0 0 0 1px rgba(255,255,255,.13) inset;
        }
        .wz-hero-primary:hover{background:linear-gradient(135deg,#f1dfb2 0%,#d8b978 100%);border-color:#f1dfb2;transform:translateY(-2px);box-shadow:0 17px 38px rgba(0,0,0,.30),0 0 28px rgba(216,187,120,.12);}
        .wz-hero-primary:active,.wz-hero-secondary:active{transform:translateY(0) scale(.985);}
        .wz-hero-primary:focus-visible,.wz-hero-secondary:focus-visible{outline:2px solid #f1dfb2;outline-offset:4px;}
        .wz-hero-arrow{display:inline-block;font-size:16px;line-height:1;transition:transform .24s ease;}
        .wz-hero-primary:hover .wz-hero-arrow{transform:translate(3px,-2px);}
        .wz-hero-secondary{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.045);color:rgba(255,255,255,.92);backdrop-filter:blur(10px);}
        .wz-hero-secondary:hover{border-color:rgba(216,187,120,.58);background:rgba(216,187,120,.10);color:#fff;transform:translateY(-2px);}
        .wz-hero-scroll{
          position:absolute;z-index:3;right:clamp(20px,3vw,42px);bottom:32px;display:flex;align-items:center;gap:11px;
          color:rgba(255,255,255,.48);font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;writing-mode:vertical-rl;
        }
        .wz-hero-scroll-line{display:block;width:1px;height:50px;transform-origin:top;background:linear-gradient(to bottom,rgba(216,187,120,.95),rgba(255,255,255,.12));animation:wzHeroScroll 2.2s ease-in-out infinite;}
        .wz-hero-index{position:absolute;z-index:3;left:clamp(20px,3vw,42px);bottom:29px;display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.39);font-size:9px;font-weight:800;letter-spacing:.18em;}
        .wz-hero-index span:first-child{color:#d8bb78;}
        .wz-hero-index i{display:block;width:26px;height:1px;background:rgba(216,187,120,.46);}
        @keyframes wzHeroReveal{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes wzHeroKenBurns{from{transform:scale(1.045) translate3d(-.35%,0,0);}to{transform:scale(1.105) translate3d(.45%,-.25%,0);}}
        @keyframes wzHeroGlow{from{opacity:.38;transform:scale(.96);}to{opacity:.72;transform:scale(1.045);}}
        @keyframes wzHeroScroll{0%,100%{transform:scaleY(.72);opacity:.55;}50%{transform:scaleY(1);opacity:1;}}

        @media(max-width:820px){
          .wz-hero{height:min(760px,82svh);min-height:570px;}
          .wz-hero-inner{width:min(100% - 36px,650px);align-items:center;}
          .wz-hero-content{padding:30px 0;}
          .wz-hero-image,.wz-hero-video{object-position:62% center;}
          .wz-hero-overlay{background:linear-gradient(180deg,rgba(5,6,10,.28) 0%,rgba(5,6,10,.56) 42%,rgba(5,6,10,.90) 100%),linear-gradient(90deg,rgba(5,6,10,.22),rgba(5,6,10,.10));}
          .wz-hero.has-custom-media .wz-hero-overlay{background:linear-gradient(180deg,rgba(5,6,10,.30) 0%,rgba(5,6,10,.58) 42%,rgba(5,6,10,.92) 100%),linear-gradient(90deg,rgba(5,6,10,.24),rgba(5,6,10,.12));}
          .wz-hero-title{font-size:clamp(48px,10vw,76px);}
          .wz-hero-subtitle{max-width:500px;}
        }
        @media(max-width:520px){
          .wz-hero{height:min(720px,82svh);min-height:570px;}
          .wz-hero-inner{width:calc(100% - 34px);}
          .wz-hero-content{padding:20px 0;}
          .wz-hero-kicker{gap:9px;margin-bottom:15px;font-size:8px;letter-spacing:.17em;}
          .wz-hero-kicker-line{width:27px;}
          .wz-hero-title{font-size:clamp(42px,12.2vw,60px);line-height:.96;letter-spacing:-.055em;}
          .wz-hero-subtitle{max-width:390px;margin-top:17px;font-size:13px;line-height:1.62;}
          .wz-hero-actions{display:grid;grid-template-columns:1fr;gap:9px;margin-top:21px;}
          .wz-hero-primary,.wz-hero-secondary{width:100%;min-height:49px;}
          .wz-hero-scroll,.wz-hero-index{display:none;}
        }

        /* Overrides du preset cinéma : le hero doit rester proportionné sur mobile. */
        @media(max-width:820px){
          :root[data-wazyo-preset="cinematic"] .wz-hero{
            height:min(720px,82svh)!important;
            min-height:570px!important;
            max-height:760px!important;
          }
          :root[data-wazyo-preset="cinematic"] .wz-hero-inner{align-items:center!important;}
          :root[data-wazyo-preset="cinematic"] .wz-hero-content{padding:24px 0!important;}
          :root[data-wazyo-preset="cinematic"] .wz-hero .wz-hero-overlay{
            background:linear-gradient(180deg,rgba(5,6,10,.36) 0%,rgba(5,6,10,.58) 40%,rgba(5,6,10,.94) 100%)!important;
          }
          :root[data-wazyo-preset="cinematic"] .wz-hero-image.is-loaded,
          :root[data-wazyo-preset="cinematic"] .wz-hero-video.is-loaded{opacity:.43!important;filter:brightness(.76) saturate(.68) contrast(1.06)!important;}
        }
        @media(max-width:520px){
          :root[data-wazyo-preset="cinematic"] .wz-hero{height:min(700px,80svh)!important;min-height:560px!important;}
          :root[data-wazyo-preset="cinematic"] .wz-hero-content{padding:12px 0!important;}
          :root[data-wazyo-preset="cinematic"] .wz-hero-title{font-size:clamp(42px,12.2vw,60px)!important;}
          :root[data-wazyo-preset="cinematic"] .wz-hero-subtitle{margin:17px auto 0!important;font-size:13px!important;line-height:1.62!important;}
          :root[data-wazyo-preset="cinematic"] .wz-hero-actions{margin-top:21px!important;}
        }

        @media(prefers-reduced-motion:reduce){
          .wz-hero-image,.wz-hero-video,.wz-hero-glow,.wz-hero-scroll-line,
          .wz-hero-kicker,.wz-hero-title,.wz-hero-subtitle,.wz-hero-actions,
          .wz-hero-primary,.wz-hero-secondary{animation:none!important;transition:none!important;}
          .wz-hero-content,.wz-hero-content.is-loaded{opacity:1!important;transform:none!important;}
          .wz-hero-kicker,.wz-hero-title,.wz-hero-subtitle,.wz-hero-actions{opacity:1!important;transform:none!important;}
        }
      `}</style>
    </section>
  )
}
