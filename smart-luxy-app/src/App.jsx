import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import AnnouncementBar from './components/AnnouncementBar'
import Header from './components/Header'
import ProductGrid from './components/ProductGrid'
import ProductPage from './components/ProductPage'
import TrackingPage from './components/TrackingPage'
import Cart from './components/Cart'
import OrderModal from './components/OrderModal'
import SuccessScreen from './components/SuccessScreen'
import PolitiquesPage from './components/PolitiquesPage'
import AdminLogin from './components/admin/AdminLogin'
import AdminPanel from './components/admin/AdminPanel'
import { notifyTelegram, genId, alertStockBas, resumeQuotidien } from './utils/notify'
import CONFIG from './config'
import { getSettings } from './utils/useSettings'
import NotFound from './components/NotFound'
import WAButton from './components/WAButton'
import AIChatbot from './components/AIChatbot'
import ProductGallery from './components/ProductGallery'

// ── Facebook Pixel — Tracking événements ──
function fbq(...args) {
  if (typeof window !== 'undefined' && window.fbq) window.fbq(...args)
}

export default function App() {
  const [isNotFound] = useState(() => {
    const path = window.location.pathname
    return path !== '/' && path !== '' && !path.startsWith('/#')
  })

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
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [promoInfo, setPromoInfo] = useState(null)
  const [orderItems, setOrderItems] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)
  const [toasts, setToasts] = useState([])
  const [politiqueTab, setPolitiqueTab] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    setProducts(data || [])
    setLoading(false)
  }, [])

  // ── Chargement produits + ouverture directe via URL hash ──
  useEffect(() => {
    async function init() {
      await loadProducts()
      // Lire le hash APRÈS que les produits soient chargés
      const hash = window.location.hash // ex: #produit-abc123
      if (hash.startsWith('#produit-')) {
        const productId = hash.replace('#produit-', '')
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()
        if (data) setOpenProduct(data)
      }
    }
    init()
  }, [loadProducts])

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
    fbq('track', 'AddToCart', {
      content_name: product.nom,
      content_ids: [product.id],
      content_type: 'product',
      value: product.prix * qty,
      currency: 'DZD',
    })
  }

  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)) }

  function changeQty(id, delta) {
    setCart(prev => prev.map(i => i.id === id
      ? { ...i, qty: Math.max(1, i.qty + delta) } : i
    ))
  }

  const cartTotal = cart.reduce((s, i) => s + Number(i.prix) * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  async function submitOrder(form) {
    const id = genId()
    const order = {
      id,
      items: form.items,
      nom_client: form.nom,
      telephone: form.tel,
      wilaya: form.wilaya,
      commune: form.commune,
      adresse: form.adresse || '',
      note: form.note || '',
      mode_livraison: form.mode_livraison || 'domicile',
      frais_livraison: form.frais_livraison || 0,
      total: form.total || form.items.reduce((s, i) => s + Number(i.prix) * i.qty, 0),
      statut: 'new'
    }

    const { error } = await supabase.from('orders').insert(order)
    if (error) { toast('❌ Erreur. Veuillez réessayer.', 'error'); return }

    // ── Déduire le stock + alerter si stock bas ──
    for (const item of form.items) {
      const prod = products.find(p => p.id === item.id)
      if (prod && prod.stock !== null && prod.stock !== undefined) {
        const newStock = Math.max(0, prod.stock - item.qty)
        await supabase.from('products').update({ stock: newStock }).eq('id', item.id)
        // Alerte Telegram si stock devient bas (≤5) ou épuisé
        if (newStock <= 5) {
          alertStockBas(prod, newStock)
        }
      }
    }

    fbq('track', 'Purchase', {
      value: order.total,
      currency: 'DZD',
      content_ids: order.items.map(i => i.id),
      content_type: 'product',
      num_items: order.items.reduce((s,i) => s + i.qty, 0),
    })
    notifyTelegram(order)
    setLastOrder(order)
    setOrderItems(null)
    setCart([])
    setCartOpen(false)
    setPromoInfo(null)
    // Recharger les produits pour afficher le nouveau stock
    loadProducts()
  }

  async function handleLogin(pw) {
    // 1. Vérifier d'abord le mot de passe dans Supabase (settings)
    const settings = await getSettings()
    const pwSupabase = settings.admin_password || null

    // 2. Vérifier le mot de passe Vercel (fallback)
    const pwVercel = import.meta.env.VITE_ADMIN_PASSWORD || 'Satellite200223@luxy'

    // 3. Accepter si correspond à l'un ou l'autre
    if (pw === pwSupabase || pw === pwVercel) {
      localStorage.setItem('sl_admin', '1')
      setAdminAuth(true)
    } else {
      toast('❌ Mot de passe incorrect', 'error')
    }
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

  // ── Admin ────────────────────────────────────────────
  if (isAdmin) {
    if (!adminAuth) return <AdminLogin onLogin={handleLogin} />
    return <AdminPanel onLogout={handleLogout} onToast={toast} />
  }

  // ── Boutique ─────────────────────────────────────────
  return (
    <div className="app">
      <AnnouncementBar />
      <Header
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        search={search}
        onSearch={setSearch}
      />

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <h1>Smart <em>Luxy</em></h1>
          <p>Boutique en ligne · Livraison partout en Algérie 🇩🇿</p>

          {/* ✅ Badges 69 wilayas */}
          <div className="hero-badges">
            <div className="hero-badge">🚚 Livraison <span>69 wilayas</span></div>
            <div className="hero-badge">💳 Paiement <span>à la livraison</span></div>
            <div className="hero-badge">✅ Qualité <span>garantie</span></div>
          </div>

          <div className="search-big">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </section>

        <ProductGrid
          products={filtered}
          categories={categories}
          activeCat={activeCat}
          onCatChange={setActiveCat}
          loading={loading}
          onProductClick={(p) => {
            setOpenProduct(p)
            window.history.pushState({}, '', '#produit-' + p.id)
            fbq('track', 'ViewContent', {
              content_name: p.nom,
              content_ids: [p.id],
              content_type: 'product',
              value: p.prix,
              currency: 'DZD',
            })
          }}
          onAddToCart={addToCart}
          onBuyNow={p => setOrderItems([{ ...p, qty: 1 }])}
        />
      </main>

      {/* ════════════════════════════════════════
          GALERIE PRODUITS DÉFILANTE
      ════════════════════════════════════════ */}
      {!openProduct && !cartOpen && !orderItems && !lastOrder && !trackingOpen && (
        <ProductGallery products={products} onProductClick={setOpenProduct} />
      )}

      <footer className="footer">
        <div className="fbn">Smart <em>Luxy</em></div>
        <p className="ftag">{CONFIG.slogan}</p>

        {/* Infos contact */}
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:10, flexWrap:'wrap' }}>
          <a href={`tel:+${CONFIG.telephone}`} style={{
            color:'rgba(255,255,255,.4)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>📞 +{CONFIG.telephone}</a>
          <span style={{ color:'rgba(255,255,255,.1)', fontSize:12 }}>|</span>
          <a href={`mailto:${CONFIG.email}`} style={{
            color:'rgba(255,255,255,.4)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>✉️ {CONFIG.email}</a>
          <span style={{ color:'rgba(255,255,255,.1)', fontSize:12 }}>|</span>
          <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer" style={{
            color:'rgba(37,211,102,.5)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>💬 WhatsApp</a>
        </div>

        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:12, flexWrap:'wrap' }}>
          <button
            onClick={() => setPolitiqueTab('confidentialite')}
            style={{
              background:'none', border:'none',
              color:'rgba(255,255,255,.3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.3)'}
          >
            🔒 Politique de confidentialité
          </button>
          <span style={{ color:'rgba(255,255,255,.1)', fontSize:12 }}>|</span>
          <button
            onClick={() => setPolitiqueTab('retour')}
            style={{
              background:'none', border:'none',
              color:'rgba(255,255,255,.3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.3)'}
          >
            🔄 Politique de retour
          </button>
          <span style={{ color:'rgba(255,255,255,.1)', fontSize:12 }}>|</span>
          <button
            onClick={() => setTrackingOpen(true)}
            style={{
              background:'none', border:'none',
              color:'rgba(255,255,255,.3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.3)'}
          >
            📦 Suivre ma commande
          </button>
        </div>
        <p style={{ color:'rgba(255,255,255,.12)', fontSize:11, marginTop:12 }}>
          © {new Date().getFullYear()} Smart Luxy · Tous droits réservés
        </p>
      </footer>

      {/* Product detail */}
      <div className={`overlay ${openProduct ? 'on' : ''}`} onClick={() => {
          setOpenProduct(null)
          window.history.pushState({}, '', window.location.pathname)
        }} />
      {openProduct && (
        <ProductPage
          product={openProduct}
          onClose={() => {
            setOpenProduct(null)
            window.history.pushState({}, '', window.location.pathname)
          }}
          onAddToCart={(qty) => {
            addToCart(openProduct, qty)
            setOpenProduct(null)
            window.history.pushState({}, '', window.location.pathname)
          }}
          allProducts={products}
          onBuyNow={(qty) => {
            setOrderItems([{ ...openProduct, qty }])
            setOpenProduct(null)
            window.history.pushState({}, '', window.location.pathname)
          }}
          onSubmitOrder={async (form) => {
            await submitOrder(form)
            setOpenProduct(null)
            window.history.pushState({}, '', window.location.pathname)
          }}
          onPolitique={(tab) => setPolitiqueTab(tab)}
        />
      )}

      {/* Cart */}
      <div className={`overlay ${cartOpen ? 'on' : ''}`} onClick={() => setCartOpen(false)} />
      <Cart
        open={cartOpen}
        items={cart}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        onOrder={(promo, totalFinal) => { setCartOpen(false); setPromoInfo(promo); setOrderItems(cart)
            fbq('track', 'InitiateCheckout', {
              value: cart.reduce((s,i) => s + i.prix * i.qty, 0),
              currency: 'DZD',
              num_items: cart.reduce((s,i) => s + i.qty, 0),
            }) }}
      />

      {/* Order modal */}
      {orderItems && (
        <OrderModal
          items={orderItems}
          onClose={() => setOrderItems(null)}
          onSubmit={submitOrder}
        />
      )}

      {/* Success */}
      {lastOrder && (
        <SuccessScreen
          order={lastOrder}
          onClose={() => setLastOrder(null)}
        />
      )}

      {/* Politiques */}
      {politiqueTab && (
        <PolitiquesPage
          defaultTab={politiqueTab}
          onClose={() => setPolitiqueTab(null)}
        />
      )}

      {/* Tracking */}
      {trackingOpen && <TrackingPage onClose={() => setTrackingOpen(false)} />}
      <AIChatbot products={products} />
      <WAButton />

      {/* Toasts */}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}
