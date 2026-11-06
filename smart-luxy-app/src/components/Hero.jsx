import { useEffect, useMemo, useState } from 'react'

function getProductImage(product) {
  if (!product) return ''
  try {
    const raw = typeof product.images === 'string'
      ? JSON.parse(product.images)
      : product.images
    if (Array.isArray(raw)) {
      const first = raw.find(image =>
        (typeof image === 'string' && image.trim()) ||
        (image && typeof image.url === 'string' && image.url.trim())
      )
      if (typeof first === 'string') return first
      if (first?.url) return first.url
    }
  } catch {}
  return typeof product.img === 'string' ? product.img : ''
}

function getHeroProducts(products = []) {
  if (!Array.isArray(products)) return []

  const available = products.filter(product => {
    if (!product || !product.nom || !getProductImage(product)) return false
    if (product.stock !== null && product.stock !== undefined && product.stock !== '' && Number(product.stock) <= 0) {
      return false
    }
    return true
  })

  const selected = []
  const categories = new Set()
  const usedIds = new Set()

  // First pass: one real product per category, so the hero reflects the generalist catalog.
  for (const product of available) {
    const category = String(product.categorie || '').trim() || 'Autres'
    if (categories.has(category)) continue
    selected.push(product)
    categories.add(category)
    usedIds.add(String(product.id))
    if (selected.length === 3) return selected
  }

  // Second pass: fill remaining places if the catalog has fewer than three categories.
  for (const product of available) {
    const id = String(product.id)
    if (usedIds.has(id)) continue
    selected.push(product)
    usedIds.add(id)
    if (selected.length === 3) break
  }

  return selected
}

function formatPrice(value) {
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0) return ''
  return price.toLocaleString('fr-DZ') + ' DA'
}

export default function Hero({
  onScrollToCollection,
  onDiscoverProduct,
  heroImage,
  heroMediaType = 'image',
  heroCustomMedia = false,
  heroProducts = [],
}) {
  const [introReady, setIntroReady] = useState(false)
  const [mediaFailed, setMediaFailed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  const showcaseProducts = useMemo(() => getHeroProducts(heroProducts), [heroProducts])
  const isVideo = heroMediaType === 'video'
  const showCustomMedia = Boolean(heroCustomMedia && heroImage && !mediaFailed && !(reduceMotion && isVideo))

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIntroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    setMediaFailed(false)
  }, [heroImage, heroMediaType])

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

  function handleExplore() {
    if (typeof onScrollToCollection === 'function') onScrollToCollection()
  }

  function handleProductClick(product) {
    if (typeof onDiscoverProduct === 'function') onDiscoverProduct(product)
  }

  return (
    <section
      className={`wz-hero ${showCustomMedia ? 'has-custom-media' : 'has-product-stage'}`}
      aria-labelledby="wz-hero-title"
    >
      <div className="wz-hero-media" aria-hidden="true">
        {showCustomMedia && (
          isVideo ? (
            <video
              src={heroImage}
              className="wz-hero-video"
              autoPlay={!reduceMotion}
              muted
              loop={!reduceMotion}
              playsInline
              preload={reduceMotion ? 'none' : 'metadata'}
              tabIndex={-1}
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <img
              src={heroImage}
              alt=""
              className="wz-hero-image"
              fetchPriority="high"
              decoding="async"
              onError={() => setMediaFailed(true)}
            />
          )
        )}
        <div className="wz-hero-overlay" />
        <div className="wz-hero-glow" />
        <div className="wz-hero-grain" />
      </div>

      <div className={`wz-hero-inner ${showCustomMedia ? 'is-media-mode' : 'is-catalog-mode'}`}>
        <div className={`wz-hero-content ${introReady ? 'is-loaded' : ''}`}>
          <div className="wz-hero-kicker">
            <span className="wz-hero-kicker-line" />
            <span>WAZYO <i aria-hidden="true">·</i> Boutique en ligne en Algérie</span>
          </div>

          <h1 id="wz-hero-title" className="wz-hero-title">
            De belles trouvailles,
            <br />
            <span>à chaque envie.</span>
          </h1>

          <p className="wz-hero-subtitle">
            High-tech, maison, beauté, mode, loisirs et bien plus. Découvrez des produits qui accompagnent toutes vos envies.
          </p>

          <div className="wz-hero-highlights" aria-label="Les univers WAZYO">
            <span>High-tech</span>
            <i aria-hidden="true">✦</i>
            <span>Maison</span>
            <i aria-hidden="true">✦</i>
            <span>Loisirs</span>
            <i aria-hidden="true">✦</i>
            <span>Et bien plus</span>
          </div>

          <div className="wz-hero-actions">
            <button type="button" onClick={handleExplore} className="wz-hero-primary">
              <span>Explorer la boutique</span>
              <span className="wz-hero-arrow" aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="wz-hero-note">
            <span className="wz-hero-note-dot" aria-hidden="true" />
            <span>Une boutique, plusieurs univers à découvrir</span>
          </div>
        </div>

        <div className="wz-hero-stage" aria-label="Aperçu de produits du catalogue WAZYO">
            <div className="wz-hero-stage-orbit wz-hero-stage-orbit--one" aria-hidden="true" />
            <div className="wz-hero-stage-orbit wz-hero-stage-orbit--two" aria-hidden="true" />
            <div className="wz-hero-stage-heading">
              <span>APERÇU DU CATALOGUE</span>
              <strong>À découvrir maintenant</strong>
            </div>

            {showcaseProducts.length > 0 ? (
              <div className="wz-hero-product-grid">
                {showcaseProducts.map((product, index) => {
                  const image = getProductImage(product)
                  const category = String(product.categorie || 'À découvrir').trim()
                  const price = formatPrice(product.prix)

                  return (
                    <button
                      key={product.id || product.nom}
                      type="button"
                      className={`wz-hero-product wz-hero-product--${index + 1}`}
                      onClick={() => handleProductClick(product)}
                      disabled={!onDiscoverProduct}
                      aria-label={`Découvrir ${product.nom}`}
                    >
                      <span className="wz-hero-product-image">
                        <img src={image} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
                      </span>
                      <span className="wz-hero-product-info">
                        <span className="wz-hero-product-category">{category}</span>
                        <strong>{product.nom}</strong>
                        {price && <span className="wz-hero-product-price">{price}</span>}
                      </span>
                      <span className="wz-hero-product-open" aria-hidden="true">↗</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="wz-hero-stage-empty">
                <span>WAZYO</span>
                <strong>Vos prochaines découvertes commencent ici.</strong>
              </div>
            )}

            <div className="wz-hero-stage-foot">
              <span>UNE SÉLECTION QUI ÉVOLUE</span>
              <span>W<span>·</span>Z</span>
            </div>
          </div>
      </div>

      <div className="wz-hero-bottom-rule" aria-hidden="true" />

      <style>{`
        .wz-hero{
          --wz-hero-gold:#d8bb78;
          position:relative;
          isolation:isolate;
          width:100%;
          min-height:620px;
          height:min(700px,78svh);
          overflow:hidden;
          background:
            radial-gradient(ellipse at 78% 44%,rgba(213,183,112,.16),transparent 31%),
            radial-gradient(ellipse at 45% 110%,rgba(117,84,37,.15),transparent 46%),
            linear-gradient(115deg,#07080b 0%,#0d1017 52%,#08090d 100%);
          border-bottom:1px solid rgba(213,183,112,.20);
        }
        .wz-hero-media,.wz-hero-overlay,.wz-hero-glow,.wz-hero-grain{
          position:absolute;inset:0;pointer-events:none;
        }
        .wz-hero-media{z-index:-3;overflow:hidden;background:#090b10;}
        .wz-hero-image,.wz-hero-video{
          display:block;width:100%;height:100%;object-fit:cover;object-position:center;
          opacity:.72;filter:saturate(.86) contrast(1.04) brightness(.76);
          animation:wzHeroKenBurns 28s ease-in-out infinite alternate;
        }
        .wz-hero-overlay{
          z-index:-2;
          background:
            linear-gradient(90deg,rgba(5,6,10,.96) 0%,rgba(5,6,10,.84) 36%,rgba(5,6,10,.34) 72%,rgba(5,6,10,.18) 100%),
            linear-gradient(0deg,#080a0f 0%,rgba(8,10,15,.04) 36%,rgba(8,10,15,.22) 100%);
        }
        .wz-hero.has-custom-media .wz-hero-overlay{
          background:
            linear-gradient(90deg,rgba(5,6,10,.92) 0%,rgba(5,6,10,.76) 36%,rgba(5,6,10,.30) 72%,rgba(5,6,10,.12) 100%),
            linear-gradient(0deg,#080a0f 0%,rgba(8,10,15,.06) 42%,rgba(8,10,15,.18) 100%);
        }
        .wz-hero-glow{
          z-index:-1;opacity:.60;
          background:
            radial-gradient(ellipse at 80% 44%,rgba(213,183,112,.18),transparent 34%),
            linear-gradient(115deg,transparent 38%,rgba(213,183,112,.045) 60%,transparent 78%);
          animation:wzHeroGlow 10s ease-in-out infinite alternate;
        }
        .wz-hero-grain{
          z-index:0;opacity:.075;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.24'/%3E%3C/svg%3E");
          mix-blend-mode:soft-light;
        }
        .wz-hero::before{
          content:'';position:absolute;z-index:1;top:0;left:clamp(18px,3vw,48px);right:clamp(18px,3vw,48px);
          height:1px;background:linear-gradient(90deg,transparent,rgba(216,187,120,.35),transparent);
          pointer-events:none;
        }
        .wz-hero-inner{
          position:relative;z-index:2;width:min(1340px,calc(100% - 68px));height:100%;margin:0 auto;
          display:grid;grid-template-columns:minmax(360px,.91fr) minmax(470px,1.09fr);
          align-items:center;gap:clamp(24px,4vw,62px);box-sizing:border-box;
        }
        .wz-hero-inner.is-media-mode{grid-template-columns:minmax(360px,650px) 1fr;}
        .wz-hero-content{
          position:relative;width:100%;max-width:680px;padding:52px 0 62px;
          opacity:0;transform:translateY(18px);
          transition:opacity .85s ease,transform .9s cubic-bezier(.2,.72,.2,1);
          text-align:left;
        }
        .wz-hero-content.is-loaded{opacity:1;transform:translateY(0);}
        .wz-hero-kicker,.wz-hero-title,.wz-hero-subtitle,.wz-hero-actions,.wz-hero-note{
          animation:wzHeroReveal .8s cubic-bezier(.2,.72,.2,1) both;animation-play-state:paused;
        }
        .wz-hero-content.is-loaded .wz-hero-kicker,.wz-hero-content.is-loaded .wz-hero-title,
        .wz-hero-content.is-loaded .wz-hero-subtitle,.wz-hero-content.is-loaded .wz-hero-actions,
        .wz-hero-content.is-loaded .wz-hero-note{animation-play-state:running;}
        .wz-hero-content.is-loaded .wz-hero-kicker{animation-delay:.04s;}
        .wz-hero-content.is-loaded .wz-hero-title{animation-delay:.11s;}
        .wz-hero-content.is-loaded .wz-hero-subtitle{animation-delay:.20s;}
        .wz-hero-content.is-loaded .wz-hero-actions{animation-delay:.29s;}
        .wz-hero-content.is-loaded .wz-hero-note{animation-delay:.36s;}
        .wz-hero-kicker{
          display:flex;align-items:center;gap:12px;margin-bottom:20px;color:#e2ca91;
          font-size:10px;line-height:1;font-weight:850;letter-spacing:.19em;text-transform:uppercase;
        }
        .wz-hero-kicker i{color:#f0d79c;font-style:normal;padding:0 2px;}
        .wz-hero-kicker-line{width:38px;height:1px;flex:0 0 auto;background:#d8bb78;box-shadow:0 0 18px rgba(216,187,120,.42);}
        .wz-hero-title{
          margin:0;max-width:720px;color:#fff;font-family:'Outfit',Arial,sans-serif;
          font-size:clamp(48px,5.3vw,78px);line-height:.99;font-weight:850;letter-spacing:-.065em;
          text-wrap:balance;text-shadow:0 12px 42px rgba(0,0,0,.42);
        }
        .wz-hero-title span{
          position:relative;color:#e0c27d;font-style:normal;font-weight:780;
          text-shadow:0 0 38px rgba(216,187,120,.15);
        }
        .wz-hero-subtitle{
          max-width:540px;margin:21px 0 0;color:rgba(255,255,255,.77);
          font-size:14px;line-height:1.75;font-weight:400;letter-spacing:.008em;
        }
        .wz-hero-highlights{
          display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:17px;
          color:rgba(255,255,255,.72);font-size:9px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;
        }
        .wz-hero-highlights i{color:#d5b770;font-size:9px;font-style:normal;}
        .wz-hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px;}
        .wz-hero-primary{
          min-height:52px;padding:0 25px;border-radius:10px;cursor:pointer;font-family:inherit;
          display:inline-flex;align-items:center;justify-content:center;gap:18px;
          border:1px solid #e4ca8d;background:linear-gradient(135deg,#ead49c 0%,#c6a45f 100%);
          color:#15130e;font-size:10px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;
          box-shadow:0 12px 32px rgba(0,0,0,.22),0 0 0 1px rgba(255,255,255,.13) inset;
          transition:transform .24s ease,box-shadow .24s ease,filter .24s ease;
        }
        .wz-hero-primary:hover{transform:translateY(-2px);filter:brightness(1.06);box-shadow:0 17px 38px rgba(0,0,0,.30),0 0 28px rgba(216,187,120,.12);}
        .wz-hero-primary:active{transform:translateY(0) scale(.985);}
        .wz-hero-primary:focus-visible{outline:2px solid #f1dfb2;outline-offset:4px;}
        .wz-hero-arrow{font-size:16px;line-height:1;transition:transform .24s ease;}
        .wz-hero-primary:hover .wz-hero-arrow{transform:translate(3px,-2px);}
        .wz-hero-note{
          display:flex;align-items:center;gap:9px;margin-top:21px;color:rgba(255,255,255,.48);
          font-size:10px;font-weight:650;letter-spacing:.04em;
        }
        .wz-hero-note-dot{width:6px;height:6px;border-radius:50%;background:#d8bb78;box-shadow:0 0 0 4px rgba(216,187,120,.10);}

        .wz-hero-stage{
          position:relative;isolation:isolate;min-width:0;width:100%;max-width:670px;margin-left:auto;
          padding:22px 22px 17px;border:1px solid rgba(213,183,112,.22);border-radius:24px;
          background:linear-gradient(145deg,rgba(23,26,34,.78),rgba(8,10,15,.92));
          box-shadow:0 28px 70px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
        }
        .wz-hero-stage::before{
          content:'';position:absolute;z-index:-1;inset:9px;border:1px solid rgba(213,183,112,.07);
          border-radius:17px;pointer-events:none;
        }
        .wz-hero-stage-orbit{
          position:absolute;z-index:0;border:1px solid rgba(213,183,112,.17);border-radius:50%;pointer-events:none;
          box-shadow:0 0 40px rgba(213,183,112,.04),inset 0 0 40px rgba(213,183,112,.025);
        }
        .wz-hero-stage-orbit--one{width:410px;height:410px;top:3%;right:-8%;}
        .wz-hero-stage-orbit--two{width:290px;height:290px;bottom:-18%;left:-5%;border-color:rgba(213,183,112,.09);}
        .wz-hero-stage-heading{
          position:relative;z-index:2;display:flex;flex-direction:column;gap:5px;margin:0 0 15px 2px;
        }
        .wz-hero-stage-heading span{color:#d5b770;font-size:8px;font-weight:900;letter-spacing:.22em;}
        .wz-hero-stage-heading strong{color:#f7f4ed;font-size:17px;font-weight:800;letter-spacing:-.025em;}
        .wz-hero-product-grid{
          position:relative;z-index:1;display:grid;grid-template-columns:1.12fr .88fr;
          grid-template-rows:172px 172px;gap:11px;
        }
        .wz-hero-product{
          position:relative;min-width:0;overflow:hidden;display:flex;flex-direction:column;
          justify-content:space-between;padding:8px;border:1px solid rgba(213,183,112,.17);
          border-radius:15px;background:linear-gradient(145deg,#1a1e27,#0c0f15);
          color:#fff;text-align:left;cursor:pointer;
          box-shadow:0 10px 24px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.035);
          transition:transform .26s ease,border-color .26s ease,box-shadow .26s ease;
        }
        .wz-hero-product:hover:not(:disabled){
          transform:translateY(-3px);border-color:rgba(224,194,125,.58);
          box-shadow:0 16px 34px rgba(0,0,0,.32),0 0 20px rgba(213,183,112,.06);
        }
        .wz-hero-product:focus-visible{outline:2px solid #e5cb8d;outline-offset:3px;}
        .wz-hero-product:disabled{cursor:default;}
        .wz-hero-product--1{grid-row:1 / span 2;grid-column:1;}
        .wz-hero-product--2{grid-row:1;grid-column:2;}
        .wz-hero-product--3{grid-row:2;grid-column:2;}
        .wz-hero-product-image{
          position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;
          overflow:hidden;border-radius:10px;
          background:radial-gradient(ellipse at 50% 45%,rgba(213,183,112,.14),transparent 66%);
        }
        .wz-hero-product-image img{
          display:block;width:100%;height:100%;object-fit:contain;padding:9px;box-sizing:border-box;
          filter:drop-shadow(0 12px 16px rgba(0,0,0,.38));transition:transform .5s ease;
        }
        .wz-hero-product:hover .wz-hero-product-image img{transform:scale(1.055);}
        .wz-hero-product-info{
          position:relative;display:flex;flex-direction:column;gap:3px;min-width:0;padding:8px 5px 3px;
        }
        .wz-hero-product-category{
          color:#d5b770;font-size:7px;line-height:1.2;font-weight:850;letter-spacing:.13em;text-transform:uppercase;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        .wz-hero-product-info strong{
          overflow:hidden;color:#f7f4ed;font-size:11px;line-height:1.3;font-weight:750;
          text-overflow:ellipsis;white-space:nowrap;
        }
        .wz-hero-product-price{color:#e0c27d;font-size:11px;font-weight:850;font-variant-numeric:tabular-nums;}
        .wz-hero-product-open{
          position:absolute;top:12px;right:12px;width:23px;height:23px;display:grid;place-items:center;
          border:1px solid rgba(213,183,112,.30);border-radius:50%;background:rgba(7,8,12,.65);
          color:#e7cc91;font-size:12px;backdrop-filter:blur(8px);
        }
        .wz-hero-stage-foot{
          position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;margin-top:13px;padding:9px 3px 0;
          border-top:1px solid rgba(213,183,112,.12);color:rgba(247,244,237,.40);
          font-size:8px;font-weight:850;letter-spacing:.16em;
        }
        .wz-hero-stage-foot span:last-child{color:#d5b770;font-size:10px;letter-spacing:.18em;}
        .wz-hero-stage-foot span:last-child span{color:rgba(213,183,112,.45);padding:0 3px;}
        .wz-hero-stage-empty{
          position:relative;z-index:1;min-height:350px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
          border:1px dashed rgba(213,183,112,.22);border-radius:15px;color:#f7f4ed;text-align:center;padding:20px;
        }
        .wz-hero-stage-empty span{color:#d5b770;font-size:12px;font-weight:900;letter-spacing:.28em;}
        .wz-hero-stage-empty strong{max-width:250px;font-size:20px;line-height:1.2;}

        .wz-hero-bottom-rule{
          position:absolute;z-index:2;bottom:0;left:clamp(18px,3vw,48px);right:clamp(18px,3vw,48px);height:1px;
          background:linear-gradient(90deg,transparent,rgba(213,183,112,.28),transparent);
        }
        @keyframes wzHeroReveal{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wzHeroKenBurns{from{transform:scale(1.04) translate3d(-.35%,0,0)}to{transform:scale(1.10) translate3d(.45%,-.25%,0)}}
        @keyframes wzHeroGlow{from{opacity:.38;transform:scale(.96)}to{opacity:.72;transform:scale(1.045)}}

        @media(max-width:1100px){
          .wz-hero{height:auto;min-height:660px;padding:18px 0 32px;}
          .wz-hero-inner{height:auto;grid-template-columns:minmax(300px,.85fr) minmax(390px,1.15fr);gap:22px;}
          .wz-hero-title{font-size:clamp(44px,5.2vw,64px);}
          .wz-hero-stage{padding:17px;}
          .wz-hero-product-grid{grid-template-rows:155px 155px;}
        }
        @media(max-width:820px){
          .wz-hero{height:auto;min-height:0;padding:34px 0 28px;}
          .wz-hero-inner{width:min(700px,calc(100% - 36px));height:auto;grid-template-columns:1fr;gap:25px;}
          .wz-hero-content{max-width:620px;padding:15px 0 0;}
          .wz-hero-title{font-size:clamp(48px,9vw,72px);}
          .wz-hero-subtitle{max-width:570px;}
          .wz-hero-stage{width:100%;max-width:none;margin:0;padding:18px;}
          .wz-hero-product-grid{grid-template-rows:185px 185px;}
        }
        @media(max-width:520px){
          .wz-hero{padding:28px 0 24px;}
          .wz-hero-inner{width:calc(100% - 28px);gap:20px;}
          .wz-hero-content{padding:6px 0 0;}
          .wz-hero-kicker{gap:8px;margin-bottom:14px;font-size:8px;letter-spacing:.13em;}
          .wz-hero-kicker-line{width:24px;}
          .wz-hero-title{font-size:clamp(40px,11.3vw,56px);line-height:1.02;letter-spacing:-.06em;}
          .wz-hero-subtitle{margin-top:15px;font-size:13px;line-height:1.62;}
          .wz-hero-highlights{gap:6px;margin-top:12px;font-size:8px;letter-spacing:.04em;}
          .wz-hero-actions{margin-top:19px;}
          .wz-hero-primary{width:100%;min-height:49px;}
          .wz-hero-note{margin-top:14px;font-size:9px;}
          .wz-hero-stage{padding:12px;border-radius:17px;}
          .wz-hero-stage::before{inset:6px;border-radius:13px;}
          .wz-hero-stage-heading{margin:0 0 10px 2px;}
          .wz-hero-stage-heading strong{font-size:15px;}
          .wz-hero-product-grid{grid-template-rows:150px 150px;gap:8px;}
          .wz-hero-product{padding:6px;border-radius:11px;}
          .wz-hero-product-info{padding:6px 3px 2px;gap:2px;}
          .wz-hero-product-category{font-size:6px;letter-spacing:.08em;}
          .wz-hero-product-info strong{font-size:9px;}
          .wz-hero-product-price{font-size:9px;}
          .wz-hero-product-open{top:8px;right:8px;width:19px;height:19px;font-size:10px;}
          .wz-hero-product-image img{padding:5px;}
          .wz-hero-stage-foot{font-size:7px;margin-top:9px;}
        }
        @media(max-width:360px){
          .wz-hero-inner{width:calc(100% - 22px);}
          .wz-hero-stage{padding:9px;}
          .wz-hero-product-grid{grid-template-rows:132px 132px;gap:6px;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-hero-image,.wz-hero-video,.wz-hero-glow,.wz-hero-kicker,.wz-hero-title,
          .wz-hero-subtitle,.wz-hero-actions,.wz-hero-note,.wz-hero-product,
          .wz-hero-product-image img{animation:none!important;transition:none!important;}
          .wz-hero-content,.wz-hero-content.is-loaded{opacity:1!important;transform:none!important;}
        }
      `}</style>
    </section>
  )
}
