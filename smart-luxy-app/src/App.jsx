import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import Header from './components/Header'
import ProductGrid from './components/ProductGrid'
import ProductPage from './components/ProductPage'
import Cart from './components/Cart'
import OrderModal from './components/OrderModal'
import SuccessScreen from './components/SuccessScreen'
import AdminLogin from './components/admin/AdminLogin'
import AdminPanel from './components/admin/AdminPanel'
import { notifyTelegram, genId } from './utils/notify'

const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD || 'smartluxy2025'

export default function App() {
  const [isAdmin] = useState(() =>
    window.location.search.includes('admin') || localStorage.getItem('sl_admin') === '1'
  )
  const [adminAuth, setAdminAuth] = useState(() => localStorage.getItem('sl_admin') === '1')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [activeCat, setActiveCat] = useState('Tous')
  const [search, setSearch] = useState('')
  const [openProduct, setOpenProduct] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderItems, setOrderItems] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)
  const [toasts, setToasts] = useState([])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products').select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Ouvre le bon produit si l'URL contient #produit-XX
  useEffect(() => {
    if (products.length === 0) return
    function handleHash() {
      const hash = window.location.hash
      if (hash.startsWith('#produit-')) {
        const id = parseInt(hash.replace('#produit-', ''), 10)
        const prod = products.find(p => p.id === id)
        if (prod) setOpenProduct(prod)
      } else {
        setOpenProduct(null)
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [products])

  function handleOpenProduct(prod) {
    window.location.hash = 'produit-' + prod.id
    setOpenProduct(prod)
  }

  function handleCloseProduct() {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    setOpenProduct(null)
  }

  function toast(msg, type = 'default') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }

  function addToCart(product, qty = 1) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
      return [...prev, { ...product, qty }]
    })
    toast(`✅ ${product.nom} ajouté au panier`)
  }

  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)) }

  function changeQty(id, delta) {
    setCart(prev => prev.map(i => i.id === id
      ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  }

  const cartTotal = cart.reduce((s, i) => s + Number(i.prix) * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  async function submitOrder(form) {
    const id = genId()
    const order = {
      id, items: form.items,
      nom_client: form.nom, telephone: form.tel,
      wilaya: form.wilaya, commune: form.commune,
      adresse: form.adresse || '', note: form.note || '',
      total: form.items.reduce((s, i) => s + Number(i.prix) * i.qty, 0),
      statut: 'new'
    }
    const { error } = await supabase.from('orders').insert(order)
    if (error) { toast('❌ Erreur. Veuillez réessayer.', 'error'); return }
    notifyTelegram(order)
    setLastOrder(order)
    setOrderItems(null)
    setCart([])
    setCartOpen(false)
  }

  function handleLogin(pw) {
    if (pw === ADMIN_PW) { localStorage.setItem('sl_admin', '1'); setAdminAuth(true) }
    else toast('❌ Mot de passe incorrect', 'error')
  }
  function handleLogout() {
    localStorage.removeItem('sl_admin')
    setAdminAuth(false)
    window.location.href = '/'
  }

  const categories = ['Tous', ...new Set(products.map(p => p.categorie).filter(Boolean))]
  const filtered = products.filter(p => {
    if (activeCat !== 'Tous' && p.categorie !== activeCat) return false
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (isAdmin) {
    if (!adminAuth) return <AdminLogin onLogin={handleLogin} />
    return <AdminPanel onLogout={handleLogout} onToast={toast} />
  }

  return (
    <div className="app">
      <Header cartCount={cartCount} onCartOpen={() => setCartOpen(true)} search={search} onSearch={setSearch} />
      <main>
        <section className="hero">
          <h1>Smart <em>Luxy</em></h1>
          <p>Boutique en ligne · Livraison partout en Algérie</p>
          <div className="search-big">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </section>
        <ProductGrid
          products={filtered} categories={categories} activeCat={activeCat}
          onCatChange={setActiveCat} loading={loading}
          onProductClick={handleOpenProduct}
          onAddToCart={addToCart}
          onBuyNow={p => setOrderItems([{ ...p, qty: 1 }])}
        />
      </main>
      <footer className="footer">
        <div className="fbn">Smart <em>Luxy</em></div>
        <p className="ftag">Boutique en ligne · Algérie 🇩🇿</p>
      </footer>
      <div className={`overlay ${openProduct ? 'on' : ''}`} onClick={handleCloseProduct} />
      {openProduct && (
        <ProductPage
          product={openProduct}
          onClose={handleCloseProduct}
          onAddToCart={(qty) => { addToCart(openProduct, qty); handleCloseProduct() }}
          onBuyNow={(qty) => { setOrderItems([{ ...openProduct, qty }]); handleCloseProduct() }}
        />
      )}
      <div className={`overlay ${cartOpen ? 'on' : ''}`} onClick={() => setCartOpen(false)} />
      <Cart open={cartOpen} items={cart} total={cartTotal} onClose={() => setCartOpen(false)}
        onRemove={removeFromCart} onChangeQty={changeQty}
        onOrder={() => { setCartOpen(false); setOrderItems(cart) }} />
      {orderItems && <OrderModal items={orderItems} onClose={() => setOrderItems(null)} onSubmit={submitOrder} />}
      {lastOrder && <SuccessScreen order={lastOrder} onClose={() => setLastOrder(null)} />}
      <div className="toasts">
        {toasts.map(t => <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>)}
      </div>
    </div>
  )
}
