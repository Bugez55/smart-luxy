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
          {products.map(p => <ProductCard key={p.id} product={p} onOpen={onProductClick} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />)}
        </div>
      )}
    </>
  )
}

function ProductCard({ product: p, onOpen, onAddToCart, onBuyNow }) {
  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
  const mainImg = imgs[0]?.url || p.img

  const disc = p.prix_old && p.prix_old > p.prix
    ? Math.round(100 - (p.prix / p.prix_old) * 100) : 0

  return (
    <div className="pcard">
      <div className="pcard-img" onClick={() => onOpen(p)}>
        {mainImg
          ? <img src={mainImg} alt={p.nom} loading="lazy" />
          : <span className="pcard-emoji">{p.emoji || '📦'}</span>
        }
        {p.badge && <div className="pcard-badge">{p.badge}</div>}
        {disc > 0 && <div className="pcard-badge" style={{ left: 'auto', right: 10, background: '#ef4444' }}>-{disc}%</div>}
      </div>
      <div className="pcard-body">
        <div className="pcard-name" onClick={() => onOpen(p)}>{p.nom}</div>
        <div className="pcard-prices">
          <span className="pcard-prix">{fmt(p.prix)}</span>
          {p.prix_old > p.prix && <span className="pcard-old">{fmt(p.prix_old)}</span>}
        </div>
        <div className="pcard-actions">
          <button className="btn-cart" onClick={e => { e.stopPropagation(); onAddToCart(p) }}>
            🛒 Panier
          </button>
          <button className="btn-buy" onClick={e => { e.stopPropagation(); onBuyNow(p) }}>
            ⚡ Acheter
          </button>
        </div>
      </div>
    </div>
  )
}
