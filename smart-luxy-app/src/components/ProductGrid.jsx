
import { useRef, useState, useEffect } from 'react'
import { supabase } from '../supabase'

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-DZ') + ' DA'
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

  return (
    <>
      <div className="wz-categories-wrap">
        <div className="wz-categories-label">CATÉGORIES</div>
        <div className="cats wz-categories-scroll">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${activeCat === cat ? 'active' : ''}`}
              onClick={() => onCatChange(cat)}
              aria-pressed={activeCat === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .wz-categories-wrap{
          width:100%;
          box-sizing:border-box;
          padding:0 20px 20px;
        }
        .wz-categories-label{
          max-width:1180px;
          margin:0 auto 8px;
          color:var(--g4);
          font-size:9px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .wz-categories-scroll{
          max-width:1180px;
          margin:0 auto;
          display:flex;
          gap:8px;
          overflow-x:auto;
          overflow-y:hidden;
          padding:2px 2px 6px;
          scrollbar-width:none;
          -webkit-overflow-scrolling:touch;
          overscroll-behavior-x:contain;
          scroll-snap-type:x proximity;
        }
        .wz-categories-scroll::-webkit-scrollbar{display:none;}
        .wz-categories-scroll .cat-btn{
          flex:0 0 auto;
          scroll-snap-align:start;
          white-space:nowrap;
          min-height:38px;
        }
        @media(max-width:640px){
          .wz-categories-wrap{padding:0 14px 16px;}
          .wz-categories-label{font-size:8px;margin-bottom:7px;}
          .wz-categories-scroll{gap:7px;padding-bottom:5px;}
          .wz-categories-scroll .cat-btn{
            min-height:36px;
            padding-left:13px!important;
            padding-right:13px!important;
            font-size:11px!important;
          }
        }
      `}</style>

      <style>{`
        /* WAZYO — cartes produits premium */

        .pcard{
          position:relative;
          overflow:hidden;
          isolation:isolate;
          border:1px solid rgba(255,255,255,.065);
          border-radius:20px!important;
          background:linear-gradient(160deg,rgba(255,255,255,.035),rgba(255,255,255,.012)),var(--card)!important;
          box-shadow:0 10px 30px rgba(0,0,0,.20);
          transition:
            transform .38s cubic-bezier(.22,1,.36,1),
            box-shadow .38s ease,
            border-color .38s ease;
          will-change:transform;
        }

        .pcard::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius:inherit;
          pointer-events:none;
          background:linear-gradient(
            135deg,
            rgba(255,255,255,.055),
            transparent 30%,
            transparent 72%,
            rgba(213,183,112,.035)
          );
          opacity:.55;
          transition:opacity .35s ease;
          z-index:1;
        }

        .pcard-img{
          position:relative;
          overflow:hidden;
          height:clamp(230px,25vw,300px)!important;
          background:
            radial-gradient(ellipse at 50% 40%,rgba(213,183,112,.12),transparent 60%),
            linear-gradient(145deg,#171b24,#0c0f15)!important;
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
          transition:
            transform .65s cubic-bezier(.2,.7,.3,1),
            filter .5s ease;
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

        .pcard-prices{
          display:flex;
          align-items:baseline;
        }

        .pcard-actions{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px!important;
          padding-top:4px;
        }

        .pcard-actions button{
          min-height:43px;
          border-radius:12px!important;
          transition:
            transform .22s ease,
            box-shadow .22s ease,
            background .22s ease;
        }

        @media (hover:hover) and (pointer:fine){
          .pcard:hover{
            transform:translateY(-5px);
            border-color:rgba(213,183,112,.27);
            box-shadow:
              0 24px 55px rgba(0,0,0,.34),
              0 8px 25px rgba(213,183,112,.055);
          }

          .pcard:hover::after{opacity:.9;}

          .pcard:hover .pcard-img img{
            transform:scale(1.055);
            filter:drop-shadow(0 18px 24px rgba(0,0,0,.32));
          }

          .pcard:hover .pcard-quickview{
            opacity:1;
            transform:translateY(0);
          }

          .pcard:hover .pcard-name{
            color:var(--br3);
          }

          .pcard-actions button:hover{
            transform:translateY(-2px);
          }
        }

        @media (hover:none){
          .pcard:active{transform:scale(.992);}
          .pcard:active .pcard-img img{transform:scale(1.018);}
          .pcard-quickview{display:none!important;}
        }

        /* Ajustements propres au thème Cinéma premium */
        :root[data-wazyo-preset="cinematic"] .pcard{
          border-radius:21px!important;
          border-color:rgba(213,183,112,.20)!important;
          background:linear-gradient(155deg,#191d27,#0d1017)!important;
          box-shadow:
            0 17px 44px rgba(0,0,0,.27),
            inset 0 1px 0 rgba(255,255,255,.035)!important;
        }

        :root[data-wazyo-preset="cinematic"] .pcard-img{
          background:
            radial-gradient(ellipse at 50% 42%,rgba(213,183,112,.15),transparent 62%),
            linear-gradient(145deg,#111722,#090c12)!important;
        }

        :root[data-wazyo-preset="cinematic"] .pcard-img::before{
          border-color:rgba(213,183,112,.12);
        }

        :root[data-wazyo-preset="cinematic"] .pcard-body{
          background:transparent!important;
        }

        :root[data-wazyo-preset="cinematic"] .pcard-actions button{
          min-height:44px;
        }

        @media(max-width:900px){
          .pcard-img{height:clamp(205px,32vw,270px)!important;}
          .pcard-body{padding:14px!important;}
        }

        @media(max-width:640px){
          .pgrid{
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:12px!important;
            padding-left:12px!important;
            padding-right:12px!important;
          }

          .pcard{border-radius:16px!important;}

          .pcard-img{
            height:clamp(155px,49vw,220px)!important;
          }

          .pcard-img::before{
            inset:7px;
            border-radius:11px;
          }

          .pcard-img img{padding:9px;}

          .pcard-body{
            padding:12px 11px 13px!important;
            gap:8px!important;
          }

          .pcard-name{
            font-size:12px!important;
            min-height:2.8em;
          }

          .pcard-prix{font-size:17px!important;}
          .pcard-old{font-size:10px!important;}

          .pcard .pcard-badge{
            font-size:8px!important;
            padding:7px 8px!important;
            border-radius:10px!important;
          }

          .pcard-actions{
            grid-template-columns:1fr!important;
            gap:7px!important;
          }

          .pcard-actions button{
            min-height:39px;
            font-size:11px!important;
            padding:8px!important;
          }
        }

        @media(prefers-reduced-motion:reduce){
          .pcard,
          .pcard-img img,
          .pcard::after,
          .pcard-quickview,
          .pcard-actions button{
            transition:none!important;
            animation:none!important;
          }

          .pcard:hover{
            transform:none!important;
          }
        }
      `}</style>

      <div className="wz-products-head">
        <div className="wz-products-head-main">
          <div className="wz-products-eyebrow">COLLECTION WAZYO</div>
          <h2>{activeCat === 'Tous' ? 'Notre sélection' : activeCat}</h2>
          <p>{activeCat === 'Tous' ? 'Des produits utiles, choisis pour aller à l’essentiel.' : 'Découvrez les produits de cette catégorie.'}</p>
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
    </>
  )
}

function ProductCard({ product: p, reviewData, onOpen, onAddToCart, onBuyNow }) {
  const [selectedImg, setSelectedImg] = useState('')
  const pointerStartX = useRef(null)
  const pointerStartY = useRef(null)
  const pointerId = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
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
  const productModels = (() => {
    try {
      const raw = typeof p.models === 'string' ? JSON.parse(p.models) : (p.models || [])
      return Array.isArray(raw) ? raw.filter(m => m && String(m.name || '').trim()) : []
    } catch { return [] }
  })()
  const isModelProduct = p.show_models === true && productModels.length > 0
  const modelPrices = isModelProduct ? productModels.map(m =>
    m.price !== '' && m.price !== null && m.price !== undefined && Number.isFinite(Number(m.price))
      ? Math.max(0, Number(m.price))
      : Number(p.prix || 0)
  ) : []
  const cardPrice = isModelProduct ? Math.min(...modelPrices) : Number(p.prix || 0)
  const hasDiscount = !isModelProduct && Number(p.prix_old) > Number(p.prix)
  const discount = hasDiscount
    ? Math.round(100 - (Number(p.prix) / Number(p.prix_old)) * 100)
    : 0
  const saving = hasDiscount ? Math.max(0, Number(p.prix_old) - Number(p.prix)) : 0
  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5
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

    // Dès qu'on détecte une vraie intention horizontale, on capture
    // le pointeur pour ne pas perdre le geste sur mobile.
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
    <article
      className="pcard"
      style={{ opacity: outOfStock ? 0.68 : 1, background: cardBg }}
    >
      {/* Image */}
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
        {mainImg ? (
          <img src={mainImg} alt={p.nom} loading="lazy" draggable={false} onDragStart={e => e.preventDefault()} />
        ) : (
          <span className="pcard-emoji">{p.emoji || '📦'}</span>
        )}

        <span className="pcard-quickview" aria-hidden="true">
          Voir le produit
        </span>

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
          <div
            className="pcard-badge"
            style={{ left: 'auto', right: 10, background: '#ef4444', color: 'white' }}
          >
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

      {/* Body */}
      <div className="pcard-body">
        <div className="pcard-name" onClick={() => onOpen(p)}>
          {p.nom}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            minHeight: 16,
          }}
        >
          {reviewData ? (
            <Stars avg={reviewData.avg} count={reviewData.count} />
          ) : (
            <span
              style={{
                fontSize: 10,
                color: 'var(--g4)',
                fontWeight: 600,
              }}
            >
              Pas encore d’avis
            </span>
          )}

          {p.ventes > 0 && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--g4)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {p.ventes} vendu{p.ventes > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Prix */}
        <div className="pcard-prices" style={{ gap: 9, flexWrap: 'wrap' }}>
          {isModelProduct && <span style={{ fontSize:9, color:'var(--g4)', fontWeight:800, alignSelf:'center' }}>À partir de</span>}
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

        {/* Boutons */}
        <div className="pcard-actions">
          <button
            className="btn-cart"
            disabled={outOfStock}
            aria-label={`Ajouter ${p.nom} au panier`}
            onClick={e => {
              e.stopPropagation()
              onAddToCart(p)
            }}
            style={{
              opacity: outOfStock ? 0.42 : 1,
              cursor: outOfStock ? 'not-allowed' : 'pointer',
            }}
          >
            Ajouter
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
