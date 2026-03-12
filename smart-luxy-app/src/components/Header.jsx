export default function Header({ cartCount, onCartOpen, search, onSearch }) {
  return (
    <header className="hdr">
      <div className="hdr-inner">
        <a className="logo" href="/">
          <div className="logo-box">
            <span style={{ fontSize: 22, fontWeight: 900, color: '#C9A84C', fontFamily: 'Fraunces, serif' }}>S</span>
          </div>
          <div>
            <div className="logo-nm">Smart <em>Luxy</em></div>
            <div className="logo-sb">Boutique · Algérie</div>
          </div>
        </a>

        <div className="hdr-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Rechercher..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        <button className="cart-btn" onClick={onCartOpen}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Panier
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  )
}
