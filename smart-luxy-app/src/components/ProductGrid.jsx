function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

// ── Skeleton card pendant le chargement ──
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

export default function ProductGrid({
  products, categories, activeCat, onCatChange,
  loading, onProductClick, onAddToCart, onBuyNow
}) {
  return (
    <>
      <div className="cats">
        {categories.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${activeCat === cat ? 'active' : ''}`}
            onClick={() => onCatChange(cat)}
          >{cat}</button>
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
              key={p.id} product={p}
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

function ProductCard({ product: p, onOpen, onAddToCart, onBuyNow }) {
  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
  const mainImg = imgs[0]?.url || p.img
  const disc = p.prix_old && p.prix_old > p.prix ? Math.round(100 - (p.prix / p.prix_old) * 100) : 0
  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5

  return (
    <div
      className="pcard"
      style={{ opacity: outOfStock ? 0.65 : 1 }}
    >
      <div className="pcard-img" onClick={() => onOpen(p)}>
        {mainImg
          ? <img src={mainImg} alt={p.nom} loading="lazy" />
          : <span className="pcard-emoji">{p.emoji || '📦'}</span>
        }

        {/* Badges */}
        {p.badge && <div className="pcard-badge">{p.badge}</div>}
        {disc > 0 && (
          <div className="pcard-badge" style={{ left: 'auto', right: 10, background: '#ef4444' }}>
            -{disc}%
          </div>
        )}

        {/* Stock */}
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
            fontSize: 10, fontWeight: 800, padding: '3px 8px',
            borderRadius: 6, animation: 'stockPulse 1.5s ease-in-out infinite',
          }}>🔥 Plus que {p.stock}</div>
        )}

        {/* Quick view hint */}
        <div className="pcard-quickview">👁 Voir</div>
      </div>

      <div className="pcard-body">
        <div className="pcard-name" onClick={() => onOpen(p)}>{p.nom}</div>
        <div className="pcard-prices">
          <span className="pcard-prix">{fmt(p.prix)}</span>
          {p.prix_old > p.prix && <span className="pcard-old">{fmt(p.prix_old)}</span>}
        </div>
        <div className="pcard-actions">
          <button
            className="btn-cart"
            disabled={outOfStock}
            onClick={e => { e.stopPropagation(); onAddToCart(p) }}
            style={{ opacity: outOfStock ? 0.4 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}
          >🛒 Panier</button>
          <button
            className="btn-buy"
            disabled={outOfStock}
            onClick={e => { e.stopPropagation(); onBuyNow(p) }}
            style={{ opacity: outOfStock ? 0.4 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}
          >⚡ Acheter</button>
        </div>
      </div>

      <style>{`
        @keyframes stockPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      `}</style>
    </div>
  )
}
