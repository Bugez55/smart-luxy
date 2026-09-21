import { useState, useEffect } from 'react'
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
        /* Wazyo premium product-card micro-interactions */
        .pcard-thumb{
          appearance:none;
          border:1px solid rgba(255,255,255,.32);
          padding:0;
          margin:0;
          width:19px;
          height:19px;
          border-radius:4px;
          overflow:hidden;
          background:transparent;
          opacity:.72;
          cursor:pointer;
          transition:transform .2s ease, opacity .2s ease, border-color .2s ease;
        }
        .pcard-thumb img{
          display:block;
          width:100%;
          height:100%;
          object-fit:cover;
        }
        .pcard-thumb.active{
          opacity:1;
          border-color:white;
          transform:scale(1.06);
        }
        .pcard-thumb:focus-visible{
          outline:2px solid white;
          outline-offset:2px;
        }
        .pcard-image-hint{
          position:absolute;
          left:10px;
          right:10px;
          bottom:8px;
          padding:4px 7px;
          border-radius:999px;
          background:rgba(0,0,0,.48);
          color:rgba(255,255,255,.9);
          font-size:9px;
          font-weight:800;
          text-align:center;
          letter-spacing:.02em;
          opacity:0;
          transform:translateY(5px);
          pointer-events:none;
          transition:opacity .22s ease, transform .22s ease;
          backdrop-filter:blur(8px);
          z-index:3;
        }
        @media (hover:hover) and (pointer:fine){
          .pcard:hover .pcard-image-hint{
            opacity:1;
            transform:translateY(0);
          }
        }
        @media(max-width:640px){
          .pcard-image-hint{
            display:none;
          }
          .pcard-thumb{
            width:22px;
            height:22px;
          }
        }

        .pcard{
          position:relative;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.055);
          transition:transform .28s ease, box-shadow .28s ease, border-color .28s ease;
          will-change:transform;
        }
        .pcard::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius:inherit;
          pointer-events:none;
          background:linear-gradient(135deg,rgba(255,255,255,.07),transparent 28%,transparent 72%,rgba(255,255,255,.025));
          opacity:.45;
          transition:opacity .28s ease;
        }
        .pcard-img{
          overflow:hidden;
        }
        .pcard-img img{
          transition:transform .5s cubic-bezier(.2,.7,.2,1), filter .35s ease;
          transform-origin:center;
        }
        .pcard-quickview{
          transform:translateY(8px);
          opacity:0;
          transition:opacity .25s ease, transform .25s ease, background .25s ease;
        }
        @media (hover:hover) and (pointer:fine){
          .pcard:hover{
            transform:translateY(-4px);
            border-color:rgba(255,255,255,.11);
            box-shadow:0 18px 40px rgba(0,0,0,.28);
          }
          .pcard:hover::after{opacity:.8;}
          .pcard:hover .pcard-img img{
            transform:scale(1.045);
            filter:saturate(1.03);
          }
          .pcard:hover .pcard-quickview{
            opacity:1;
            transform:translateY(0);
          }
        }
        @media (hover:none){
          .pcard:active{transform:scale(.992);}
          .pcard:active .pcard-img img{transform:scale(1.018);}
        }
        @media(max-width:640px){
          .pcard{border-color:rgba(255,255,255,.06);}
          .pcard-quickview{
            opacity:1;
            transform:none;
            background:rgba(0,0,0,.48)!important;
          }
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
  const imgs = (() => {
    try {
      return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
    } catch {
      return []
    }
  })()

  const mainImg = selectedImg || imgs[0]?.url || p.img
  const hasDiscount = Number(p.prix_old) > Number(p.prix)
  const discount = hasDiscount
    ? Math.round(100 - (Number(p.prix) / Number(p.prix_old)) * 100)
    : 0
  const saving = hasDiscount ? Math.max(0, Number(p.prix_old) - Number(p.prix)) : 0
  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5
  const cardBg = p.card_color || 'var(--card)'

  return (
    <article
      className="pcard"
      style={{ opacity: outOfStock ? 0.68 : 1, background: cardBg }}
    >
      {/* Image */}
      <div className="pcard-img" onClick={() => onOpen(p)}>
        {mainImg ? (
          <img src={mainImg} alt={p.nom} loading="lazy" />
        ) : (
          <span className="pcard-emoji">{p.emoji || '📦'}</span>
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
              background: 'rgba(239,68,68,.94)',
              color: 'white',
              fontSize: 10,
              fontWeight: 900,
              padding: '4px 9px',
              borderRadius: 999,
              animation: 'stockPulse 1.5s ease-in-out infinite',
              zIndex: 4,
              boxShadow: '0 6px 18px rgba(239,68,68,.25)',
            }}
          >
            🔥 Plus que {p.stock}
          </div>
        )}

        {imgs.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: outOfStock ? 32 : lowStock ? 40 : 8,
              right: 8,
              display: 'flex',
              gap: 4,
              zIndex: 4,
              padding: 3,
              borderRadius: 7,
              background: 'rgba(0,0,0,.35)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {imgs.slice(0, 4).map((img, i) => {
              const active = (selectedImg || imgs[0]?.url) === img.url
              return (
                <button
                  key={i}
                  type="button"
                  className={`pcard-thumb ${active ? 'active' : ''}`}
                  aria-label={`Voir l’image ${i + 1} de ${imgs.length}`}
                  onClick={e => {
                    e.stopPropagation()
                    setSelectedImg(img.url)
                  }}
                >
                  <img src={img.url} alt="" />
                </button>
              )
            })}
            {imgs.length > 4 && (
              <div
                style={{
                  width: 19,
                  height: 19,
                  borderRadius: 4,
                  background: 'rgba(0,0,0,.72)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: 'white',
                  fontWeight: 900,
                }}
              >
                +{imgs.length - 4}
              </div>
            )}
          </div>
        )}

        <div className="pcard-quickview">Voir le produit</div>
        <div className="pcard-image-hint">Touchez les miniatures pour voir les autres vues</div>
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
          <span className="pcard-prix">{fmt(p.prix)}</span>
          {hasDiscount && <span className="pcard-old">{fmt(p.prix_old)}</span>}
        </div>

        {saving > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 5,
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(34,197,94,.09)',
              border: '1px solid rgba(34,197,94,.18)',
              color: '#86efac',
              fontSize: 10,
              fontWeight: 800,
              marginTop: -2,
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
            🛒 Panier
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
            ⚡ Commander
          </button>
        </div>
      </div>

      <style>{`@keyframes stockPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }`}</style>
    </article>
  )
}
