function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function Cart({ open, items, total, onClose, onRemove, onChangeQty, onOrder }) {
  return (
    <div className={`cart-drawer ${open ? 'on' : ''}`}>
      <div className="cart-hdr">
        <h2>🛒 Mon panier {items.length > 0 && `(${items.reduce((s,i)=>s+i.qty,0)})`}</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <div style={{ fontSize: 48 }}>🛒</div>
          <p>Votre panier est vide</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map(item => {
              const imgs = (() => { try { return typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []) } catch { return [] } })()
              const mainImg = imgs[0]?.url || item.img
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    {mainImg ? <img src={mainImg} alt={item.nom} /> : item.emoji || '📦'}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.nom}</div>
                    <div className="cart-item-price">{fmt(Number(item.prix) * item.qty)}</div>
                    <div className="cart-item-ctrl">
                      <button onClick={() => onChangeQty(item.id, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => onChangeQty(item.id, +1)}>+</button>
                    </div>
                  </div>
                  <button className="cart-del" onClick={() => onRemove(item.id)}>🗑</button>
                </div>
              )
            })}
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <strong>{fmt(total)}</strong>
            </div>
            <button className="btn-confirm" onClick={onOrder}>
              Commander maintenant →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
