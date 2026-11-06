
import { useRef, useState, useEffect } from 'react'
import { supabase } from '../supabase'

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-DZ') + ' DA'
}

function getCategoryCover(product) {
  if (!product) return ''
  try {
    const raw = typeof product.images === 'string'
      ? JSON.parse(product.images)
      : (product.images || [])
    if (Array.isArray(raw)) {
      const firstImage = raw.find(image =>
        (typeof image === 'string' && image.trim()) ||
        (image && typeof image.url === 'string' && image.url.trim())
      )
      if (typeof firstImage === 'string') return firstImage
      if (firstImage?.url) return firstImage.url
    }
  } catch {}
  return product.img || ''
}

function SkeletonCard() {
  return (
    <div className="pcard" style={{ pointerEvents: 'none' }}>
      <div className="pcard-img" style={{ background: 'var(--card2)' }}>
        <div className="skeleton" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="pcard-body" style={{ gap: 10 }}>
        <div className="skeleton" style={{ height: 14, borderRadius: 6, width: '85%' }} />
        <div className="skeleton" style={{ height: 12, borderRadius: 6, width: '42%' }} />
        <div className="skeleton" style={{ height: 24, borderRadius: 6, width: '50%', marginTop: 4 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <div className="skeleton" style={{ height: 36, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 36, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  )
}

function Stars({ avg, count }) {
  if (!avg || !count) return null

  const full = Math.floor(avg)
  const half = avg - full >= 0.5

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} aria-label={`Note ${avg.toFixed(1)} sur 5, ${count} avis`}>
      <div style={{ display: 'flex', gap: 1 }} aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            style={{
              fontSize: 11,
              color: i <= full || (i === full + 1 && half) ? '#F9A825' : 'var(--g5)',
            }}
          >
            ★
          </span>
        ))}
      </div>
      <span style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 700 }}>
        {avg.toFixed(1)} ({count})
      </span>
    </div>
  )
}

export default function ProductGrid({
  products,
  categoryProducts = products,
  categories,
  activeCat,
  onCatChange,
  loading,
  onProductClick,
  onAddToCart,
  onBuyNow,
}) {
  const [reviews, setReviews] = useState({})

  useEffect(() => {
    if (products.length === 0) return

    supabase
      .from('reviews')
      .select('product_id, note')
      .then(({ data }) => {
        if (!data) return

        const map = {}
        data.forEach(r => {
          if (!map[r.product_id]) map[r.product_id] = []
          map[r.product_id].push(Number(r.note))
        })

        const avgs = {}
        Object.entries(map).forEach(([id, notes]) => {
          if (!notes.length) return
          avgs[id] = {
            avg: notes.reduce((a, b) => a + b, 0) / notes.length,
            count: notes.length,
          }
        })

        setReviews(avgs)
      })
  }, [products])

  const editorialSelections = (categories || [])
    .filter(category => category && category !== 'Tous')
    .map(category => {
      const matchingProducts = (categoryProducts || []).filter(product => product.categorie === category)
      const featuredProduct = matchingProducts.find(product => getCategoryCover(product))
      return featuredProduct ? {
        category,
        product: featuredProduct,
        image: getCategoryCover(featuredProduct),
        count: matchingProducts.length,
      } : null
    })
    .filter(Boolean)
    .slice(0, 2)

  function exploreEditorialCategory(category) {
    onCatChange(category)
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div id="categories" className="wz-categories-wrap">
        <div className="wz-categories-heading">
          <div className="wz-categories-label">NOS CATÉGORIES</div>
          <div className="wz-categories-hint">Explorez les univers de la boutique</div>
        </div>
        <div className="cats wz-categories-scroll wz-category-cards" aria-label="Choisir une catégorie">
          {categories.map(cat => {
            const matchingProducts = cat === 'Tous'
              ? categoryProducts
              : categoryProducts.filter(product => product.categorie === cat)
            const coverProduct = matchingProducts.find(product => getCategoryCover(product))
            const cover = getCategoryCover(coverProduct)
            const isActive = activeCat === cat

            return (
              <button
                key={cat}
                type="button"
                className={`wz-category-card ${isActive ? 'is-active' : ''}`}
                onClick={() => onCatChange(cat)}
                aria-pressed={isActive}
              >
                {cover && (
                  <img
                    className="wz-category-card-image"
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={event => { event.currentTarget.style.display = 'none' }}
                  />
                )}
                <span className="wz-category-card-shade" aria-hidden="true" />
                <span className="wz-category-card-content">
                  <span className="wz-category-card-kicker">{cat === 'Tous' ? 'TOUTE LA BOUTIQUE' : 'COLLECTION'}</span>
                  <strong>{cat === 'Tous' ? 'Tout découvrir' : cat}</strong>
                  <small>{matchingProducts.length} produit{matchingProducts.length > 1 ? 's' : ''}</small>
                </span>
                <span className="wz-category-card-arrow" aria-hidden="true">↗</span>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        .wz-categories-wrap{
          width:100%;
          box-sizing:border-box;
          padding:2px 20px 24px;
        }
        .wz-categories-heading{
          max-width:1320px;
          margin:0 auto 12px;
          display:flex;
          align-items:baseline;
          justify-content:space-between;
          gap:14px;
        }
        .wz-categories-label{
          margin:0;
          color:var(--br3);
          font-size:9px;
          font-weight:900;
          letter-spacing:.20em;
          text-transform:uppercase;
        }
        .wz-categories-hint{
          color:rgba(255,255,255,.36);
          font-size:10px;
          letter-spacing:.025em;
        }
        .wz-categories-scroll{
          max-width:1320px;
          margin:0 auto;
          display:flex;
          gap:12px;
          overflow-x:auto;
          overflow-y:hidden;
          padding:2px 2px 9px;
          scrollbar-width:none;
          -webkit-overflow-scrolling:touch;
          overscroll-behavior-x:contain;
          scroll-snap-type:x mandatory;
        }
        .wz-categories-scroll::-webkit-scrollbar{display:none;}
        .wz-category-card{
          position:relative;
          isolation:isolate;
          flex:0 0 clamp(158px,17vw,214px);
          height:128px;
          overflow:hidden;
          display:flex;
          align-items:flex-end;
          padding:15px 15px 14px;
          text-align:left;
          color:#fff;
          background:radial-gradient(ellipse at 72% 26%,rgba(213,183,112,.22),transparent 55%),linear-gradient(140deg,#20232c,#0b0e14 78%);
          border:1px solid rgba(213,183,112,.17);
          border-radius:17px;
          box-shadow:0 9px 26px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.05);
          cursor:pointer;
          scroll-snap-align:start;
          transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;
        }
        .wz-category-card-image{
          position:absolute;
          z-index:-2;
          inset:0;
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:center;
          opacity:.63;
          filter:saturate(.82) contrast(1.04);
          transform:scale(1.015);
          transition:transform .65s cubic-bezier(.2,.7,.3,1),opacity .35s ease;
        }
        .wz-category-card-shade{
          position:absolute;
          z-index:-1;
          inset:0;
          background:linear-gradient(180deg,rgba(5,7,12,.04) 0%,rgba(5,7,12,.30) 38%,rgba(5,7,12,.94) 100%),linear-gradient(90deg,rgba(5,7,12,.20),transparent 80%);
        }
        .wz-category-card-content{
          min-width:0;
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:4px;
        }
        .wz-category-card-kicker{
          color:#e2ca8e;
          font-size:7px;
          line-height:1.2;
          font-weight:900;
          letter-spacing:.18em;
        }
        .wz-category-card-content strong{
          max-width:100%;
          overflow:hidden;
          color:#fff;
          font-size:15px;
          line-height:1.15;
          font-weight:750;
          letter-spacing:-.025em;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .wz-category-card-content small{
          color:rgba(255,255,255,.66);
          font-size:9px;
          line-height:1.2;
          font-weight:600;
        }
        .wz-category-card-arrow{
          position:absolute;
          top:10px;
          right:11px;
          width:25px;
          height:25px;
          display:grid;
          place-items:center;
          border:1px solid rgba(255,255,255,.24);
          border-radius:50%;
          background:rgba(5,7,12,.26);
          color:#f1d99e;
          font-size:13px;
          opacity:.88;
          backdrop-filter:blur(8px);
        }
        .wz-category-card.is-active{
          border-color:rgba(230,201,137,.82);
          box-shadow:0 0 0 1px rgba(230,201,137,.22),0 15px 32px rgba(0,0,0,.34),0 0 24px rgba(213,183,112,.10);
        }
        .wz-category-card.is-active .wz-category-card-image{opacity:.78;}
        .wz-category-card:focus-visible{outline:2px solid #f1d99e;outline-offset:3px;}
        @media(hover:hover) and (pointer:fine){
          .wz-category-card:hover{transform:translateY(-3px);border-color:rgba(230,201,137,.54);box-shadow:0 16px 32px rgba(0,0,0,.32);}
          .wz-category-card:hover .wz-category-card-image{transform:scale(1.075);opacity:.83;}
        }
        @media(max-width:640px){
          .wz-categories-wrap{padding:0 14px 18px;}
          .wz-categories-heading{margin-bottom:10px;}
          .wz-categories-label{font-size:8px;}
          .wz-categories-hint{font-size:9px;}
          .wz-categories-scroll{gap:9px;padding-bottom:7px;}
          .wz-category-card{flex-basis:148px;height:112px;padding:12px 12px 11px;border-radius:14px;}
          .wz-category-card-content strong{font-size:13px;}
          .wz-category-card-content small{font-size:8px;}
          .wz-category-card-arrow{width:22px;height:22px;top:8px;right:9px;}
        }
        @media(max-width:380px){
          .wz-category-card{flex-basis:136px;height:104px;}
          .wz-categories-hint{display:none;}
        }
        @media(prefers-reduced-motion:reduce){.wz-category-card,.wz-category-card-image{transition:none!important;}}
      `}</style>

      <style>{`
        .pcard{
          position:relative;
          overflow:hidden;
          isolation:isolate;
          border:1px solid rgba(255,255,255,.065);
          border-radius:20px!important;
          background:linear-gradient(160deg,rgba(255,255,255,.035),rgba(255,255,255,.012)),var(--card)!important;
          box-shadow:0 10px 30px rgba(0,0,0,.20);
          transition:transform .38s cubic-bezier(.22,1,.36,1),box-shadow .38s ease,border-color .38s ease;
          will-change:transform;
        }

        .pcard::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius:inherit;
          pointer-events:none;
          background:linear-gradient(135deg,rgba(255,255,255,.055),transparent 30%,transparent 72%,rgba(213,183,112,.035));
          opacity:.55;
          transition:opacity .35s ease;
          z-index:1;
        }

        .pcard-img{
          position:relative;
          overflow:hidden;
          height:clamp(230px,25vw,300px)!important;
          background:radial-gradient(ellipse at 50% 40%,rgba(213,183,112,.12),transparent 60%),linear-gradient(145deg,#171b24,#0c0f15)!important;
          isolation:isolate;
          cursor:pointer;
        }

        .pcard-img::before{
          content:"";
          position:absolute;
          inset:11px;
          border:1px solid rgba(255,255,255,.065);
          border-radius:14px;
          pointer-events:none;
          z-index:1;
        }

        .pcard-img img{
          width:100%;
          height:100%;
          object-fit:contain!important;
          padding:15px;
          box-sizing:border-box;
          transform-origin:center;
          filter:drop-shadow(0 14px 20px rgba(0,0,0,.27));
          transition:transform .65s cubic-bezier(.2,.7,.3,1),filter .5s ease;
          -webkit-user-drag:none;
        }

        .pcard .pcard-badge{
          z-index:3;
          font-size:10px!important;
          line-height:1!important;
          padding:8px 12px!important;
          border-radius:999px!important;
          letter-spacing:.04em;
          backdrop-filter:blur(10px);
          box-shadow:0 6px 18px rgba(0,0,0,.24);
        }

        .pcard-quickview{
          position:absolute;
          inset:auto 14px 14px;
          width:auto;
          height:36px;
          display:flex;
          align-items:center;
          justify-content:center;
          margin:0 auto;
          padding:0 16px;
          border:1px solid rgba(213,183,112,.32);
          border-radius:999px;
          background:rgba(8,10,15,.78);
          color:#f7f4ed;
          font-size:9px;
          font-weight:900;
          letter-spacing:.14em;
          text-transform:uppercase;
          opacity:0;
          transform:translateY(8px);
          transition:opacity .3s ease,transform .3s ease;
          backdrop-filter:blur(12px);
          pointer-events:none;
          z-index:2;
        }

        .pcard-body{
          position:relative;
          z-index:2;
          padding:17px 17px 18px!important;
          gap:11px!important;
        }

        .pcard-name{
          font-size:15px!important;
          line-height:1.4!important;
          min-height:2.7em;
          transition:color .25s ease;
        }

        .pcard-prix{
          font-size:23px!important;
          letter-spacing:-.035em;
          font-variant-numeric:tabular-nums;
        }

        .pcard-prices{display:flex;align-items:baseline;}

        .pcard-actions{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px!important;
          padding-top:4px;
        }

        .pcard-actions button{
          min-height:43px;
          border-radius:12px!important;
          transition:transform .22s ease,box-shadow .22s ease,background .22s ease;
        }

        @media (hover:hover) and (pointer:fine){
          .pcard:hover{
            transform:translateY(-5px);
            border-color:rgba(213,183,112,.27);
            box-shadow:0 24px 55px rgba(0,0,0,.34),0 8px 25px rgba(213,183,112,.055);
          }
          .pcard:hover::after{opacity:.9;}
          .pcard:hover .pcard-img img{
            transform:scale(1.055);
            filter:drop-shadow(0 18px 24px rgba(0,0,0,.32));
          }
          .pcard:hover .pcard-quickview{opacity:1;transform:translateY(0);}
          .pcard:hover .pcard-name{color:var(--br3);}
          .pcard-actions button:hover{transform:translateY(-2px);}
        }

        @media (hover:none){
          .pcard:active{transform:scale(.992);}
          .pcard:active .pcard-img img{transform:scale(1.018);}
          .pcard-quickview{display:none!important;}
        }

        :root[data-wazyo-preset="cinematic"] .pcard{
          border-radius:21px!important;
          border-color:rgba(213,183,112,.20)!important;
          background:linear-gradient(155deg,#191d27,#0d1017)!important;
          box-shadow:0 17px 44px rgba(0,0,0,.27),inset 0 1px 0 rgba(255,255,255,.035)!important;
        }

        :root[data-wazyo-preset="cinematic"] .pcard-img{
          height:clamp(250px,27vw,330px)!important;
          background:
            radial-gradient(ellipse at 50% 38%,rgba(220,194,133,.19),transparent 58%),
            radial-gradient(ellipse at 50% 100%,rgba(91,111,143,.10),transparent 54%),
            linear-gradient(145deg,#151b27 0%,#0b0e15 100%)!important;
          border-bottom:1px solid rgba(213,183,112,.10);
        }
        :root[data-wazyo-preset="cinematic"] .pcard-img::before{
          inset:10px;
          border-color:rgba(213,183,112,.15);
          border-radius:15px;
          box-shadow:inset 0 0 34px rgba(213,183,112,.025);
        }
        :root[data-wazyo-preset="cinematic"] .pcard-img::after{
          opacity:.38;
          background:linear-gradient(180deg,transparent 58%,rgba(5,7,12,.28) 100%);
        }
        :root[data-wazyo-preset="cinematic"] .pcard-img img{
          position:relative;
          z-index:0;
          width:100%;
          height:100%;
          padding:clamp(7px,1.2vw,13px);
          object-fit:contain!important;
          filter:drop-shadow(0 18px 22px rgba(0,0,0,.34)) saturate(1.04) contrast(1.025);
          transition:transform .75s cubic-bezier(.2,.7,.3,1),filter .55s ease;
        }
        :root[data-wazyo-preset="cinematic"] .pcard:hover .pcard-img img{
          transform:scale(1.045);
          filter:drop-shadow(0 22px 28px rgba(0,0,0,.42)) saturate(1.10) contrast(1.035);
        }
        :root[data-wazyo-preset="cinematic"] .pcard-body{background:transparent!important;}
        :root[data-wazyo-preset="cinematic"] .pcard-actions button{min-height:44px;}

        @media(max-width:900px){
          .pcard-img{height:clamp(205px,32vw,270px)!important;}
          .pcard-body{padding:14px!important;}
        }

        @media(max-width:640px){
          :root[data-wazyo-preset="cinematic"] .pcard-img{
            height:clamp(172px,47vw,226px)!important;
          }
          :root[data-wazyo-preset="cinematic"] .pcard-img img{padding:6px!important;}
          :root[data-wazyo-preset="cinematic"] .pcard-img::before{inset:7px;border-radius:11px;}
          .pgrid{
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:12px!important;
            padding-left:12px!important;
            padding-right:12px!important;
          }
          .pcard{border-radius:16px!important;}
          .pcard-img{height:clamp(155px,49vw,220px)!important;}
          .pcard-img::before{inset:7px;border-radius:11px;}
          .pcard-img img{padding:9px;}
          .pcard-body{padding:12px 11px 13px!important;gap:8px!important;}
          .pcard-name{font-size:12px!important;min-height:2.8em;}
          .pcard-prix{font-size:17px!important;}
          .pcard-old{font-size:10px!important;}
          .pcard .pcard-badge{font-size:8px!important;padding:7px 8px!important;border-radius:10px!important;}

          .pcard-actions{
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
            gap:6px!important;
          }
          .pcard-actions button{
            min-width:0;
            min-height:38px;
            padding:6px 2px!important;
            font-size:9px!important;
            letter-spacing:-.015em;
            white-space:nowrap;
          }
        }

        @media(max-width:380px){
          :root[data-wazyo-preset="cinematic"] .pcard-img{height:clamp(164px,46vw,190px)!important;}
          :root[data-wazyo-preset="cinematic"] .pcard-img img{padding:4px!important;}
        }

        @media(prefers-reduced-motion:reduce){
          .pcard,.pcard-img img,.pcard::after,.pcard-quickview,.pcard-actions button{
            transition:none!important;
            animation:none!important;
          }
          .pcard:hover{transform:none!important;}
        }
      `}</style>

      <div className="wz-products-head">
        <div className="wz-products-head-main">
          <div className="wz-products-eyebrow">COLLECTION WAZYO</div>
          <h2>{activeCat === 'Tous' ? 'Notre sélection' : activeCat}</h2>
          <p>{activeCat === 'Tous' ? 'Des découvertes et des nouveautés pour toutes vos envies.' : 'Retrouvez les articles de cet univers.'}</p>
        </div>
        <div className="wz-products-count">
          <span>{products.length}</span> produit{products.length > 1 ? 's' : ''}
        </div>
      </div>

      <style>{`
        .wz-products-head{
          width:100%;
          max-width:1320px;
          margin:0 auto;
          padding:2px 24px 22px;
          box-sizing:border-box;
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:20px;
        }
        .wz-products-head-main{min-width:0;}
        .wz-products-eyebrow{
          color:var(--br);
          font-size:9px;
          font-weight:900;
          letter-spacing:.18em;
          text-transform:uppercase;
          margin-bottom:7px;
        }
        .wz-products-eyebrow::after{
          content:"";
          display:inline-block;
          width:26px;
          height:1px;
          margin-left:10px;
          vertical-align:middle;
          background:currentColor;
          opacity:.65;
        }
        .wz-products-head h2{
          margin:0;
          color:#fff;
          font-size:clamp(25px,3vw,38px);
          line-height:1.05;
          letter-spacing:-.035em;
          font-weight:800;
        }
        .wz-products-head p{
          margin:8px 0 0;
          color:var(--g4);
          font-size:12px;
          line-height:1.55;
        }
        .wz-products-count{
          flex:0 0 auto;
          padding:8px 12px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:999px;
          background:rgba(255,255,255,.025);
          color:var(--g4);
          font-size:10px;
          font-weight:800;
          letter-spacing:.04em;
          white-space:nowrap;
        }
        .wz-products-count span{color:var(--br3);}
        @media(max-width:640px){
          .wz-products-head{
            padding:0 14px 16px;
            align-items:flex-end;
            gap:12px;
          }
          .wz-products-eyebrow{font-size:8px;margin-bottom:6px;}
          .wz-products-head h2{font-size:25px;}
          .wz-products-head p{font-size:11px;margin-top:6px;max-width:290px;}
          .wz-products-count{font-size:9px;padding:7px 10px;}
        }
      `}</style>

      <style>{`
        /* WAZYO catalog refresh — real product media and dynamic categories. */
        .wz-categories-wrap{
          padding:8px clamp(14px,2.5vw,28px) 30px;
        }
        .wz-categories-heading{
          margin-bottom:15px;
          align-items:center;
        }
        .wz-categories-label{
          color:#e0c27d;
          font-size:10px;
          letter-spacing:.22em;
        }
        .wz-categories-hint{
          color:rgba(247,244,237,.52);
          font-size:11px;
        }
        .wz-categories-scroll{gap:14px;}
        .wz-category-card{
          flex-basis:clamp(168px,17vw,220px);
          height:140px;
          border-radius:14px;
          border-color:rgba(213,183,112,.22);
          background:
            radial-gradient(ellipse at 75% 20%,rgba(213,183,112,.18),transparent 55%),
            linear-gradient(145deg,#171a21 0%,#0b0d12 100%);
          box-shadow:0 10px 28px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.045);
        }
        .wz-category-card-image{
          opacity:.72;
          filter:saturate(.9) contrast(1.05);
        }
        .wz-category-card-shade{
          background:
            linear-gradient(180deg,rgba(5,7,12,.02) 0%,rgba(5,7,12,.22) 36%,rgba(5,7,12,.92) 100%),
            linear-gradient(90deg,rgba(5,7,12,.12),transparent 85%);
        }
        .wz-category-card-kicker{
          color:#e0c27d;
          font-size:8px;
          letter-spacing:.19em;
        }
        .wz-category-card-content strong{
          font-size:16px;
          letter-spacing:-.02em;
        }
        .wz-category-card-content small{
          font-size:10px;
          color:rgba(255,255,255,.72);
        }
        .wz-category-card-arrow{
          border-color:rgba(213,183,112,.34);
          background:rgba(7,8,12,.48);
          color:#f0d79c;
        }
        .wz-category-card.is-active{
          border-color:rgba(224,194,125,.92);
          box-shadow:0 0 0 1px rgba(224,194,125,.20),0 14px 34px rgba(0,0,0,.34);
        }

        .wz-products-head{
          max-width:1320px;
          padding:10px clamp(16px,2.5vw,28px) 24px;
          margin-top:4px;
        }
        .wz-products-eyebrow{
          color:#d5b770;
          font-size:10px;
          letter-spacing:.20em;
        }
        .wz-products-head h2{
          font-family:'Outfit',system-ui,sans-serif;
          font-size:clamp(28px,3.4vw,40px);
          letter-spacing:-.045em;
          font-weight:800;
        }
        .wz-products-head p{
          max-width:520px;
          font-size:13px;
          color:rgba(247,244,237,.58);
        }
        .wz-products-count{
          border-color:rgba(213,183,112,.20);
          background:rgba(213,183,112,.055);
          color:rgba(247,244,237,.72);
          font-size:11px;
          padding:9px 13px;
        }
        .wz-products-count span{color:#e0c27d;}

        .pgrid{
          width:100%;
          max-width:1320px;
          grid-template-columns:repeat(auto-fill,minmax(min(100%,232px),1fr));
          gap:17px;
          padding:0 clamp(14px,2.2vw,26px) 58px;
        }
        .pcard{
          border:1px solid rgba(213,183,112,.16)!important;
          border-radius:17px!important;
          background:linear-gradient(155deg,#171a22 0%,#0c0f15 100%)!important;
          box-shadow:0 13px 34px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.035)!important;
        }
        .pcard-img{
          height:clamp(230px,23vw,292px)!important;
          background:
            radial-gradient(ellipse at 50% 38%,rgba(213,183,112,.13),transparent 60%),
            linear-gradient(145deg,#171b24 0%,#0b0e15 100%)!important;
          border-bottom:1px solid rgba(213,183,112,.11);
        }
        .pcard-img::before{
          inset:9px!important;
          border:1px solid rgba(213,183,112,.12)!important;
          border-radius:12px!important;
        }
        .pcard-img img{
          object-fit:contain!important;
          padding:clamp(10px,1.1vw,16px)!important;
          filter:drop-shadow(0 16px 22px rgba(0,0,0,.32)) saturate(1.02);
        }
        .pcard-body{
          padding:16px 16px 17px!important;
          gap:10px!important;
          background:linear-gradient(180deg,rgba(255,255,255,.012),transparent)!important;
        }
        .pcard-name{
          color:#f7f4ed!important;
          font-size:14px!important;
          line-height:1.42!important;
          min-height:2.8em;
          font-weight:750!important;
        }
        .pcard-prices{gap:8px!important;}
        .pcard-prix{
          color:#e4c77f!important;
          font-family:'Outfit',system-ui,sans-serif!important;
          font-size:22px!important;
          font-weight:800!important;
          letter-spacing:-.035em;
        }
        .pcard-old{
          color:rgba(247,244,237,.45)!important;
          font-size:12px!important;
        }
        .pcard-actions{
          gap:8px!important;
          padding-top:3px;
        }
        .pcard-actions button{
          min-height:42px!important;
          border-radius:9px!important;
          font-size:11px!important;
          font-weight:800!important;
        }
        .pcard .btn-cart{
          border-color:rgba(213,183,112,.30)!important;
          background:rgba(213,183,112,.055)!important;
          color:#e8d7ad!important;
        }
        .pcard .btn-buy{
          background:linear-gradient(135deg,#ead49c 0%,#c6a45f 100%)!important;
          color:#17130b!important;
          border:1px solid #e2c582!important;
          box-shadow:0 5px 14px rgba(0,0,0,.18);
        }
        .pcard-badge{
          border-radius:7px!important;
          font-size:9px!important;
          letter-spacing:.06em!important;
        }

        @media(max-width:900px){
          .pgrid{gap:14px!important;}
          .pcard-img{height:clamp(210px,31vw,265px)!important;}
        }
        @media(max-width:640px){
          .wz-categories-wrap{padding:2px 13px 20px;}
          .wz-categories-heading{align-items:flex-start;margin-bottom:10px;}
          .wz-categories-label{font-size:8px;}
          .wz-categories-hint{font-size:9px;text-align:right;}
          .wz-categories-scroll{gap:9px;}
          .wz-category-card{flex-basis:148px;height:116px;padding:12px;}
          .wz-category-card-content strong{font-size:13px;}
          .wz-category-card-content small{font-size:9px;}
          .wz-products-head{
            padding:0 14px 16px;
            align-items:flex-end;
            gap:10px;
          }
          .wz-products-head h2{font-size:25px;}
          .wz-products-head p{font-size:10px;max-width:250px;}
          .wz-products-count{padding:7px 9px;font-size:9px;}
          .pgrid{
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
            gap:11px!important;
            padding:0 12px 42px!important;
          }
          .pcard{border-radius:14px!important;}
          .pcard-img{height:clamp(164px,43vw,218px)!important;}
          .pcard-img::before{inset:7px!important;border-radius:10px!important;}
          .pcard-img img{padding:7px!important;}
          .pcard-body{padding:11px 10px 12px!important;gap:7px!important;}
          .pcard-name{font-size:12px!important;min-height:2.75em;}
          .pcard-prix{font-size:16px!important;}
          .pcard-old{font-size:9px!important;}
          .pcard-actions{gap:5px!important;}
          .pcard-actions button{min-height:36px!important;padding:5px 2px!important;font-size:9px!important;}
        }
        @media(max-width:380px){
          .wz-category-card{flex-basis:135px;height:108px;}
          .wz-categories-hint{display:none;}
          .pcard-img{height:clamp(150px,42vw,178px)!important;}
          .pcard-body{padding:10px 8px!important;}
          .pcard-actions button{font-size:8px!important;}
        }
        @media(prefers-reduced-motion:reduce){
          .pcard,.pcard-img img,.wz-category-card,.wz-category-card-image{
            transition:none!important;
            animation:none!important;
          }
          .pcard:hover,.wz-category-card:hover{transform:none!important;}
        }
      `}</style>

      {loading ? (
        <div className="pgrid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 48 }}>🔍</div>
          <p>Aucun produit trouvé.</p>
        </div>
      ) : (
        <div className="pgrid">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              reviewData={reviews[p.id]}
              onOpen={onProductClick}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
            />
          ))}
        </div>
      )}

      {editorialSelections.length > 0 && (
        <section className="wz-editorial-section" aria-label="Découvrir nos univers">
          <div className="wz-editorial-heading">
            <span>LES UNIVERS WAZYO</span>
            <h2>Des idées pour chaque envie.</h2>
            <p>Parcourez des sélections variées, pensées autour de vos découvertes du moment.</p>
          </div>

          <div className="wz-editorial-grid">
            {editorialSelections.map((selection, index) => (
              <article
                className={`wz-editorial-card wz-editorial-card--${index + 1}`}
                key={selection.category}
              >
                <div className="wz-editorial-card-media">
                  <img
                    src={selection.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="wz-editorial-card-shade" aria-hidden="true" />
                <div className="wz-editorial-card-copy">
                  <span className="wz-editorial-card-kicker">À EXPLORER · {selection.count} ARTICLE{selection.count > 1 ? 'S' : ''}</span>
                  <h3>{selection.category}</h3>
                  <p>Découvrez notre sélection dans cet univers.</p>
                  <button type="button" onClick={() => exploreEditorialCategory(selection.category)}>
                    Explorer l’univers <span aria-hidden="true">↗</span>
                  </button>
                </div>
                <span className="wz-editorial-card-index" aria-hidden="true">0{index + 1}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .wz-editorial-section{
          width:min(1320px,100%);
          margin:0 auto;
          padding:12px clamp(14px,2.3vw,28px) 64px;
          box-sizing:border-box;
        }
        .wz-editorial-heading{
          display:grid;
          grid-template-columns:1fr auto;
          align-items:end;
          gap:7px 20px;
          margin-bottom:18px;
        }
        .wz-editorial-heading > span{
          grid-column:1 / -1;
          color:#d5b770;
          font-size:9px;
          font-weight:900;
          letter-spacing:.22em;
        }
        .wz-editorial-heading h2{
          margin:0;
          color:#f7f4ed;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:clamp(25px,3.2vw,38px);
          font-weight:800;
          line-height:1.04;
          letter-spacing:-.045em;
        }
        .wz-editorial-heading p{
          margin:0;
          max-width:390px;
          color:rgba(247,244,237,.52);
          font-size:11px;
          line-height:1.6;
          text-align:right;
        }
        .wz-editorial-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:16px;
        }
        .wz-editorial-card{
          position:relative;
          isolation:isolate;
          min-height:260px;
          overflow:hidden;
          display:flex;
          align-items:flex-end;
          border:1px solid rgba(213,183,112,.24);
          border-radius:18px;
          background:linear-gradient(140deg,#191d26,#090b10);
          box-shadow:0 15px 38px rgba(0,0,0,.23),inset 0 1px 0 rgba(255,255,255,.05);
        }
        .wz-editorial-card-media{
          position:absolute;
          z-index:0;
          inset:0 0 0 28%;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          background:radial-gradient(ellipse at 55% 50%,rgba(213,183,112,.20),transparent 64%);
        }
        .wz-editorial-card-media img{
          display:block;
          width:100%;
          height:100%;
          object-fit:contain;
          padding:18px;
          box-sizing:border-box;
          filter:drop-shadow(0 20px 26px rgba(0,0,0,.42));
          transition:transform .55s ease,filter .55s ease;
        }
        .wz-editorial-card-shade{
          position:absolute;
          z-index:1;
          inset:0;
          background:
            linear-gradient(90deg,#0b0d12 0%,rgba(11,13,18,.96) 28%,rgba(11,13,18,.64) 49%,rgba(11,13,18,.04) 100%),
            linear-gradient(0deg,rgba(5,6,9,.48),transparent 45%);
        }
        .wz-editorial-card-copy{
          position:relative;
          z-index:2;
          width:min(61%,330px);
          padding:25px 25px 27px;
        }
        .wz-editorial-card-kicker{
          display:block;
          margin-bottom:11px;
          color:#d5b770;
          font-size:8px;
          font-weight:900;
          letter-spacing:.18em;
        }
        .wz-editorial-card-copy h3{
          margin:0;
          color:#fff;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:clamp(23px,2.6vw,32px);
          font-weight:800;
          line-height:1.02;
          letter-spacing:-.045em;
          text-wrap:balance;
        }
        .wz-editorial-card-copy p{
          margin:10px 0 17px;
          color:rgba(255,255,255,.68);
          font-size:11px;
          line-height:1.6;
        }
        .wz-editorial-card-copy button{
          min-height:38px;
          display:inline-flex;
          align-items:center;
          gap:15px;
          padding:0 14px;
          border:1px solid rgba(213,183,112,.48);
          border-radius:8px;
          background:rgba(213,183,112,.08);
          color:#f0d99f;
          font-family:inherit;
          font-size:9px;
          font-weight:850;
          letter-spacing:.07em;
          text-transform:uppercase;
          cursor:pointer;
          transition:background .2s ease,border-color .2s ease,transform .2s ease;
        }
        .wz-editorial-card-copy button:hover{
          transform:translateY(-2px);
          border-color:#e6c988;
          background:rgba(213,183,112,.16);
        }
        .wz-editorial-card-copy button:focus-visible{
          outline:2px solid #f0d99f;
          outline-offset:3px;
        }
        .wz-editorial-card-index{
          position:absolute;
          z-index:2;
          right:18px;
          bottom:14px;
          color:rgba(213,183,112,.55);
          font-family:'Outfit',system-ui,sans-serif;
          font-size:27px;
          font-weight:300;
          letter-spacing:-.08em;
        }
        @media(hover:hover) and (pointer:fine){
          .wz-editorial-card:hover .wz-editorial-card-media img{
            transform:scale(1.055);
            filter:drop-shadow(0 24px 32px rgba(0,0,0,.5));
          }
        }
        @media(max-width:760px){
          .wz-editorial-grid{grid-template-columns:1fr;gap:12px;}
          .wz-editorial-card{min-height:230px;}
          .wz-editorial-card-copy{width:min(64%,320px);padding:20px;}
          .wz-editorial-card-copy h3{font-size:27px;}
        }
        @media(max-width:480px){
          .wz-editorial-section{padding:8px 12px 44px;}
          .wz-editorial-heading{grid-template-columns:1fr;gap:7px;margin-bottom:13px;}
          .wz-editorial-heading h2{font-size:27px;}
          .wz-editorial-heading p{text-align:left;font-size:10px;}
          .wz-editorial-card{min-height:205px;border-radius:14px;}
          .wz-editorial-card-media{inset:0 0 0 25%;}
          .wz-editorial-card-media img{padding:10px;}
          .wz-editorial-card-copy{width:65%;padding:15px;}
          .wz-editorial-card-kicker{font-size:7px;margin-bottom:8px;}
          .wz-editorial-card-copy h3{font-size:23px;}
          .wz-editorial-card-copy p{font-size:10px;margin:8px 0 12px;}
          .wz-editorial-card-copy button{min-height:34px;padding:0 10px;font-size:8px;}
          .wz-editorial-card-index{right:12px;bottom:10px;font-size:21px;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-editorial-card-media img,.wz-editorial-card-copy button{transition:none!important;}
        }
      `}</style>
    </>
  )
}

function ProductCard({ product: p, reviewData, onOpen, onAddToCart, onBuyNow }) {
  const [selectedImg, setSelectedImg] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const pointerStartX = useRef(null)
  const pointerStartY = useRef(null)
  const pointerId = useRef(null)
  const suppressNextClick = useRef(false)

  const imgs = (() => {
    try {
      return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
    } catch {
      return []
    }
  })()

  const selectedIndex = Math.max(0, imgs.findIndex(img => img?.url === selectedImg))
  const currentIndex = imgs.length ? (selectedImg ? selectedIndex : 0) : 0
  const mainImg = selectedImg || imgs[0]?.url || p.img

  useEffect(() => {
    setImageFailed(false)
  }, [mainImg])

  const productModels = (() => {
    try {
      const raw = typeof p.models === 'string' ? JSON.parse(p.models) : (p.models || [])
      return Array.isArray(raw) ? raw.filter(m => m && String(m.name || '').trim()) : []
    } catch {
      return []
    }
  })()

  const isModelProduct = p.show_models === true && productModels.length > 0
  const productColors = (() => {
    try {
      const raw = typeof p.colors === 'string' ? JSON.parse(p.colors) : (p.colors || [])
      return Array.isArray(raw) ? raw.filter(color => color && String(color.name || '').trim()) : []
    } catch {
      return []
    }
  })()
  const isColorProduct = p.show_colors === true && productColors.length > 0
  const hasSelectableVariants = isModelProduct || isColorProduct
  const selectableVariants = [
    ...(isModelProduct ? productModels : []),
    ...(isColorProduct ? productColors : []),
  ]
  const parentStockAvailable = p.stock === null || p.stock === undefined ||
    !Number.isFinite(Number(p.stock)) || Number(p.stock) > 0
  const hasAvailableVariant = selectableVariants.some(variant => {
    const stock = variant.stock !== '' && variant.stock !== null && variant.stock !== undefined
      ? Number(variant.stock)
      : null
    return stock === null || !Number.isFinite(stock) ? parentStockAvailable : stock > 0
  })
  const modelPrices = isModelProduct ? productModels.map(m =>
    m.price !== '' && m.price !== null && m.price !== undefined && Number.isFinite(Number(m.price))
      ? Math.max(0, Number(m.price))
      : Number(p.prix || 0)
  ) : []

  const cardPrice = isModelProduct ? Math.min(...modelPrices) : Number(p.prix || 0)
  const hasDiscount = !hasSelectableVariants && Number(p.prix_old) > Number(p.prix)
  const discount = hasDiscount ? Math.round(100 - (Number(p.prix) / Number(p.prix_old)) * 100) : 0
  const saving = hasDiscount ? Math.max(0, Number(p.prix_old) - Number(p.prix)) : 0
  const outOfStock = hasSelectableVariants
    ? !hasAvailableVariant
    : p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0
  const lowStock = !hasSelectableVariants && p.stock !== null && p.stock !== undefined && Number(p.stock) > 0 && Number(p.stock) <= 5
  const cardBg = p.card_color || 'var(--card)'

  function goToImage(nextIndex) {
    if (!imgs.length) return
    const normalized = ((nextIndex % imgs.length) + imgs.length) % imgs.length
    setSelectedImg(imgs[normalized]?.url || '')
  }

  function handlePointerDown(e) {
    if (imgs.length < 2 || e.pointerType === 'mouse') return
    pointerStartX.current = e.clientX
    pointerStartY.current = e.clientY
    pointerId.current = e.pointerId
    suppressNextClick.current = false
  }

  function handlePointerMove(e) {
    if (pointerId.current == null || pointerStartX.current == null || pointerStartY.current == null) return

    const dx = e.clientX - pointerStartX.current
    const dy = e.clientY - pointerStartY.current

    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.08) {
      suppressNextClick.current = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {}
    }
  }

  function handlePointerUp(e) {
    if (pointerId.current == null || pointerStartX.current == null || pointerStartY.current == null) return

    const dx = e.clientX - pointerStartX.current
    const dy = e.clientY - pointerStartY.current
    const horizontalSwipe = Math.abs(dx) >= 38 && Math.abs(dx) > Math.abs(dy) * 1.08

    if (horizontalSwipe && imgs.length > 1) {
      if (dx < 0) goToImage(currentIndex + 1)
      else goToImage(currentIndex - 1)
      suppressNextClick.current = true
    }

    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {}

    pointerStartX.current = null
    pointerStartY.current = null
    pointerId.current = null
  }

  function handlePointerCancel() {
    pointerStartX.current = null
    pointerStartY.current = null
    pointerId.current = null
  }

  function handleImageClick() {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    onOpen(p)
  }

  return (
    <article className="pcard" style={{ opacity: outOfStock ? 0.68 : 1, background: cardBg }}>
      <div
        className="pcard-img"
        onClick={handleImageClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          touchAction: imgs.length > 1 ? 'pan-y' : 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {mainImg && !imageFailed ? (
          <img
            src={mainImg}
            alt={p.nom}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setImageFailed(true)}
            onDragStart={e => e.preventDefault()}
          />
        ) : (
          <span className="pcard-emoji">{p.emoji || '📦'}</span>
        )}

        <span className="pcard-quickview" aria-hidden="true">Voir le produit</span>

        {imgs.length > 1 && (
          <span
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Faites glisser horizontalement pour voir les autres photos.
          </span>
        )}

        {p.badge && <div className="pcard-badge">{p.badge}</div>}

        {discount > 0 && (
          <div className="pcard-badge" style={{ left: 'auto', right: 10, background: '#ef4444', color: 'white' }}>
            -{discount}%
          </div>
        )}

        {p.video_url && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'rgba(0,0,0,.68)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 999,
              padding: '4px 8px',
              fontSize: 10,
              fontWeight: 800,
              color: 'white',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backdropFilter: 'blur(8px)',
            }}
          >
            ▶ Vidéo
          </div>
        )}

        {outOfStock && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,.82)',
              color: '#fecaca',
              fontSize: 10,
              fontWeight: 900,
              padding: '6px 0',
              textAlign: 'center',
              letterSpacing: '.1em',
              zIndex: 4,
            }}
          >
            ÉPUISÉ
          </div>
        )}

        {lowStock && !outOfStock && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(213,183,112,.96)',
              color: '#17140d',
              border: '1px solid rgba(255,255,255,.24)',
              fontSize: 9,
              fontWeight: 900,
              padding: '5px 9px',
              borderRadius: 999,
              zIndex: 4,
              boxShadow: '0 6px 18px rgba(0,0,0,.22)',
            }}
          >
            Plus que {p.stock}
          </div>
        )}
      </div>

      <div className="pcard-body">
        <div className="pcard-name" onClick={() => onOpen(p)}>
          {p.nom}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 16 }}>
          {reviewData ? (
            <Stars avg={reviewData.avg} count={reviewData.count} />
          ) : (
            <span style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 600 }}>
              Pas encore d’avis
            </span>
          )}

          {p.ventes > 0 && (
            <span style={{ fontSize: 10, color: 'var(--g4)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {p.ventes} vendu{p.ventes > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="pcard-prices" style={{ gap: 9, flexWrap: 'wrap' }}>
          {isModelProduct && (
            <span style={{ fontSize: 9, color: 'var(--g4)', fontWeight: 800, alignSelf: 'center' }}>
              À partir de
            </span>
          )}
          <span className="pcard-prix">{fmt(cardPrice)}</span>
          {hasDiscount && <span className="pcard-old">{fmt(p.prix_old)}</span>}
        </div>

        {saving > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 999,
              background: 'rgba(134,239,172,.07)',
              border: '1px solid rgba(134,239,172,.16)',
              color: '#9ed6ae',
              fontSize: 9,
              fontWeight: 800,
              marginTop: -1,
            }}
          >
            Économisez {fmt(saving)}
          </div>
        )}

        <div className="pcard-actions">
          <button
            className="btn-cart"
            disabled={outOfStock}
            aria-label={hasSelectableVariants ? `Choisir une variante pour ${p.nom}` : `Ajouter ${p.nom} au panier`}
            onClick={e => {
              e.stopPropagation()
              if (hasSelectableVariants) onOpen(p)
              else onAddToCart(p)
            }}
            style={{
              opacity: outOfStock ? 0.42 : 1,
              cursor: outOfStock ? 'not-allowed' : 'pointer',
            }}
          >
            {hasSelectableVariants ? 'Choisir' : 'Ajouter'}
          </button>

          <button
            className="btn-buy"
            disabled={outOfStock}
            aria-label={`Acheter ${p.nom}`}
            onClick={e => {
              e.stopPropagation()
              onBuyNow(p)
            }}
            style={{
              opacity: outOfStock ? 0.42 : 1,
              cursor: outOfStock ? 'not-allowed' : 'pointer',
            }}
          >
            Commander
          </button>
        </div>
      </div>
    </article>
  )
}
