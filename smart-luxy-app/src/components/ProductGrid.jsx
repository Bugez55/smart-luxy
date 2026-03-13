function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

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
        <div className="spinner">Chargement des produits…</div>
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
    <div className="pcard" style={{ opacity: outOfStock ? 0.6 : 1 }}>
      <div className="pcard-img" onClick={() => onOpen(p)}>
        {mainImg
          ? <img src={mainImg} alt={p.nom} loading="lazy" />
          : <span className="pcard-emoji">{p.emoji || '📦'}</span>
        }
        {p.badge && <div className="pcard-badge">{p.badge}</div>}
        {disc > 0 && <div className="pcard-badge" style={{ left:'auto', right:10, background:'#ef4444' }}>-{disc}%</div>}

        {/* Badge stock */}
        {outOfStock && (
          <div style={{
            position:'absolute', bottom:8, left:0, right:0, textAlign:'center',
            background:'rgba(0,0,0,.75)', color:'#fca5a5',
            fontSize:11, fontWeight:800, padding:'4px 0', letterSpacing:'.04em',
          }}>ÉPUISÉ</div>
        )}
        {lowStock && !outOfStock && (
          <div style={{
            position:'absolute', bottom:8, left:8,
            background:'rgba(239,68,68,.9)', color:'white',
            fontSize:10, fontWeight:800, padding:'3px 8px',
            borderRadius:6, letterSpacing:'.03em',
            animation:'stockPulse 1.5s ease-in-out infinite',
          }}>
            🔥 Plus que {p.stock}
          </div>
        )}
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
          >
            🛒 Panier
          </button>
          <button
            className="btn-buy"
            disabled={outOfStock}
            onClick={e => { e.stopPropagation(); onBuyNow(p) }}
            style={{ opacity: outOfStock ? 0.4 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}
          >
            ⚡ Acheter
          </button>
        </div>
      </div>

      <style>{`
        @keyframes stockPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
