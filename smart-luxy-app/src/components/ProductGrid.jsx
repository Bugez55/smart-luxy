import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

function SkeletonCard() {
  return (
    <div className="pcard" style={{ pointerEvents: 'none' }}>
      <div className="pcard-img" style={{ background: '#1a1a1a' }}>
        <div className="skeleton" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="pcard-body" style={{ gap: 10 }}>
        <div className="skeleton" style={{ height: 14, borderRadius: 6, width: '85%' }} />
        <div className="skeleton" style={{ height: 14, borderRadius: 6, width: '60%' }} />
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
  if (!avg) return null
  const full = Math.floor(avg)
  const half = avg - full >= 0.5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{
            fontSize: 12,
            color: i <= full ? '#F9A825' : (i === full + 1 && half) ? '#F9A825' : 'rgba(255,255,255,.15)',
          }}>★</span>
        ))}
      </div>
      {count !== null && count !== undefined && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700 }}>
          ({count > 0 ? count.toLocaleString() : avg.toFixed(1)})
        </span>
      )}
    </div>
  )
}

export default function ProductGrid({ products, categories, activeCat, onCatChange, loading, onProductClick, onAddToCart, onBuyNow }) {
  const [reviews, setReviews] = useState({})

  useEffect(() => {
    if (products.length === 0) return
    supabase.from('reviews').select('product_id, note').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => {
        if (!map[r.product_id]) map[r.product_id] = []
        map[r.product_id].push(r.note)
      })
      const avgs = {}
      Object.entries(map).forEach(([id, notes]) => {
        avgs[id] = { avg: notes.reduce((a, b) => a + b, 0) / notes.length, count: notes.length }
      })
      setReviews(avgs)
    })
  }, [products])

  return (
    <>
      <div className="cats">
        {categories.map(cat => (
          <button key={cat} className={`cat-btn ${activeCat === cat ? 'active' : ''}`}
            onClick={() => onCatChange(cat)}>
            {cat}
          </button>
        ))}
      </div>

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
  const imgs = (() => {
    try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) }
    catch { return [] }
  })()

  const mainImg = imgs[0]?.url || p.img
  const disc = p.prix_old && p.prix_old > p.prix ? Math.round(100 - (p.prix / p.prix_old) * 100) : 0
  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock   = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5
  const cardBg     = p.card_color || '#141414'

  return (
    <div className="pcard" style={{ opacity: outOfStock ? 0.65 : 1, background: cardBg }}>

      {/* Image */}
      <div className="pcard-img" onClick={() => onOpen(p)}>
        {mainImg
          ? <img src={mainImg} alt={p.nom} loading="lazy" />
          : <span className="pcard-emoji">{p.emoji || '📦'}</span>
        }

        {p.badge && <div className="pcard-badge">{p.badge}</div>}
        {p.video_url && (
          <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.7)', borderRadius:6, padding:'2px 7px', fontSize:10, fontWeight:800, color:'white', zIndex:2, display:'flex', alignItems:'center', gap:3 }}>
            ▶️ Vidéo
          </div>
        )}
        {disc > 0 && (
          <div className="pcard-badge" style={{ left: 'auto', right: 10, background: '#ef4444' }}>
            -{disc}%
          </div>
        )}

        {outOfStock && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,.8)', color: '#fca5a5',
            fontSize: 11, fontWeight: 800, padding: '5px 0',
            textAlign: 'center', letterSpacing: '.06em',
          }}>ÉPUISÉ</div>
        )}

        {lowStock && !outOfStock && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(239,68,68,.92)', color: 'white',
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
            animation: 'stockPulse 1.5s ease-in-out infinite',
          }}>🔥 Plus que {p.stock}</div>
        )}

        {/* Miniatures en bas */}
        {imgs.length > 1 && (
          <div style={{
            position: 'absolute', bottom: outOfStock ? 30 : lowStock ? 36 : 6,
            right: 6, display: 'flex', gap: 3, zIndex: 3,
          }}>
            {imgs.slice(0, 4).map((img, i) => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: 3, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,.4)',
                opacity: i === 0 ? 1 : 0.7,
              }}>
                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            {imgs.length > 4 && (
              <div style={{
                width: 18, height: 18, borderRadius: 3,
                background: 'rgba(0,0,0,.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: 'white', fontWeight: 800,
              }}>+{imgs.length - 4}</div>
            )}
          </div>
        )}

        <div className="pcard-quickview">👁 Voir</div>
      </div>

      {/* Body */}
      <div className="pcard-body">
        <div className="pcard-name" onClick={() => onOpen(p)}>{p.nom}</div>

        {/* Étoiles + ventes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 16 }}>
          {reviewData
            ? <Stars avg={reviewData.avg} count={reviewData.count} />
            : (
              <div style={{ display: 'flex', gap: 1 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,.1)' }}>★</span>
                ))}
              </div>
            )
          }
          {p.ventes > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              ⚡ {p.ventes} vendus
            </span>
          )}
        </div>

        {/* Prix */}
        <div className="pcard-prices">
          <span className="pcard-prix">{fmt(p.prix)}</span>
          {p.prix_old > p.prix && <span className="pcard-old">{fmt(p.prix_old)}</span>}
        </div>

        {/* Boutons */}
        <div className="pcard-actions">
          <button className="btn-cart" disabled={outOfStock}
            onClick={e => { e.stopPropagation(); onAddToCart(p) }}
            style={{ opacity: outOfStock ? 0.4 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}>
            🛒 Panier
          </button>
          <button className="btn-buy" disabled={outOfStock}
            onClick={e => { e.stopPropagation(); onBuyNow(p) }}
            style={{ opacity: outOfStock ? 0.4 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}>
            ⚡ Acheter
          </button>
        </div>
      </div>

      <style>{`@keyframes stockPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
    </div>
  )
}
