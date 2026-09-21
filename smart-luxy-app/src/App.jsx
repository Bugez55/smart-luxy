import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import AnnouncementBar from './components/AnnouncementBar'
import Header from './components/Header'
import Hero from './components/Hero'
import TrustMarquee from './components/TrustMarquee'
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
import { getSettings, saveSetting } from './utils/useSettings'
import NotFound from './components/NotFound'
import WAButton from './components/WAButton'
import ProductGallery from './components/ProductGallery'
import CookieConsent from './components/CookieConsent'
import { sendCapiEvent } from './utils/api'

// ── Facebook Pixel — Tracking événements ──
function fbq(...args) {
  if (typeof window !== 'undefined' && window.fbq) window.fbq(...args)
}

export default function App() {

  const [isNotFound] = useState(() => {
    const path = window.location.pathname
    return path !== '/' && path !== '' && !path.startsWith('/#')
  })

  const [isAdmin] = useState(() => window.location.search.includes('admin'))
  const [adminAuth, setAdminAuth] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

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
  const [showTopButton, setShowTopButton] = useState(false)

  // Petit bouton de retour en haut, utile sur les longues pages mobiles.
  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 520)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // ── Bouton retour physique du téléphone/navigateur — ferme la page produit ──
  useEffect(() => {
    function handlePopState() {
      const hash = window.location.hash
      if (!hash.startsWith('#produit-')) {
        // L'utilisateur est revenu en arrière depuis la page produit → on la ferme
        setOpenProduct(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Appliquer le thème depuis Supabase + cache localStorage ──
  useEffect(() => {
    getSettings().then(s => {
      const r = document.documentElement
      if (s.theme_bg)       { r.style.setProperty('--bk', s.theme_bg); r.style.setProperty('--bk2', s.theme_bg); document.body.style.background = s.theme_bg; localStorage.setItem('sl_theme_bg', s.theme_bg) }
      if (s.theme_card)     { r.style.setProperty('--card', s.theme_card); r.style.setProperty('--card2', s.theme_card); localStorage.setItem('sl_theme_card', s.theme_card) }
      if (s.theme_accent)   { r.style.setProperty('--br', s.theme_accent); r.style.setProperty('--br2', s.theme_accent); r.style.setProperty('--br3', s.theme_accent); localStorage.setItem('sl_theme_accent', s.theme_accent) }
      if (s.theme_text)     { r.style.setProperty('--g3', s.theme_text);     localStorage.setItem('sl_theme_text', s.theme_text) }
      if (s.theme_text_sub) { r.style.setProperty('--g4', s.theme_text_sub); localStorage.setItem('sl_theme_text_sub', s.theme_text_sub) }
    })
  }, [])

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
    window.fbq && fbq('track', 'AddToCart', {
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
    function getCookie(name) {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return m ? decodeURIComponent(m[1]) : null
    }

    const fbc = getCookie('_fbc')
    const fbp = getCookie('_fbp')

    try {
      const { data: order, error } = await supabase.rpc('create_order', {
        p_nom_client: form.nom,
        p_telephone: form.tel,
        p_wilaya: form.wilaya,
        p_commune: form.commune,
        p_adresse: form.adresse || '',
        p_note: form.note || '',
        p_items: form.items,
        p_mode_livraison: form.mode_livraison || 'domicile',
        // Kept for backward compatibility; the SQL RPC ignores this
        // client-controlled amount and calculates the real tariff itself.
        p_frais_livraison: form.frais_livraison || 0,
        p_mode_paiement: form.mode_paiement || 'livraison',
        p_promo_code: form.promo_code || null,
        p_fbc: fbc,
        p_fbp: fbp,
      })

      if (error || !order) {
        console.error('create_order:', error)
        toast('❌ Erreur. Vérifie tes informations et réessaie.', 'error')
        return false
      }

      // Stock is decremented atomically inside create_order().
      for (const alert of order.stock_alerts || []) {
        alertStockBas({ nom: alert.nom }, Number(alert.stock))
      }

      const contentIds = (order.items || []).map(i => i.id)

      // Browser Pixel: same event_id as CAPI Lead for deduplication.
      window.fbq && fbq('track', 'Lead', {
        value: order.total,
        currency: 'DZD',
        content_ids: contentIds,
        content_type: 'product',
      }, { eventID: order.id })

      // Server-side Meta event. Best effort: never block the customer flow.
      sendCapiEvent({
        eventName: 'Lead',
        eventId: order.id,
        phone: order.telephone,
        firstName: order.nom_client?.split(' ')[0],
        lastName: order.nom_client?.split(' ').slice(1).join(' '),
        city: order.wilaya,
        value: order.total,
        contentIds,
        eventSourceUrl: window.location.href,
        fbc,
        fbp,
      }).catch(e => console.error('CAPI Lead:', e))

      notifyTelegram(order)
      setLastOrder(order)
      setOrderItems(null)
      setCart([])
      setCartOpen(false)
      setPromoInfo(null)
      loadProducts()
      return true
    } catch (e) {
      console.error('Erreur soumission commande:', e)
      toast('❌ Une erreur est survenue. Vérifie tes informations et réessaie.', 'error')
      return false
    }
  }

  // ── Vraie authentification Supabase Auth (remplace le mdp en clair) ──
  useEffect(() => {
    if (!isAdmin) { setAuthLoading(false); return }
    let mounted = true

    const refreshAdminAuth = async (session) => {
      if (!session) {
        if (mounted) { setAdminAuth(false); setAuthLoading(false) }
        return
      }

      const { data: admin, error } = await supabase.rpc('is_admin')
      if (mounted) {
        setAdminAuth(!error && !!admin)
        setAuthLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => refreshAdminAuth(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshAdminAuth(session)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [isAdmin])

  async function handleLogin(email, pw) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) {
      toast('❌ Identifiants incorrects', 'error')
      return false
    }
    return true
  }

  async function handleLogout() {
    await supabase.auth.signOut()
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
    if (authLoading) return <div style={{ minHeight:'100vh', background:'var(--bk)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--g4)' }}>Chargement…</div>
    if (!adminAuth) return <AdminLogin onLogin={handleLogin} />
    return <AdminPanel onLogout={handleLogout} onToast={toast} />
  }

  // ── Boutique ─────────────────────────────────────────
  return (
    <>
      <style>{`
        html, body, #root {
          width: 100%;
          min-width: 0;
          margin: 0;
          padding: 0;
        }

        html {
          scrollbar-width: none;
        }

        html::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        body {
          overflow-x: hidden;
        }

        .app {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin: 0;
          padding: 0;
          overflow-x: clip;
        }
      `}</style>

      <div className="app">
      <AnnouncementBar />
      <Header
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        search={search}
        onSearch={setSearch}
      />

      <main>
        {/* ── Hero plein écran ── */}
        <Hero
          heroImage={products[0]?.img}
          onScrollToCollection={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
        />

        <TrustMarquee />

        {/* ── Pourquoi Wazyo ? ── */}
        <section className="wz-why">
          <div className="wz-why-head">
            <span className="wz-why-kicker">POURQUOI WAZYO ?</span>
            <h2>Simple. Clair. Pensé pour vous.</h2>
            <p>Une expérience d’achat directe, avec les informations essentielles visibles dès le départ.</p>
          </div>

          <div className="wz-why-grid">
            <div className="wz-why-card">
              <div className="wz-why-icon">🚚</div>
              <div>
                <strong>Livraison partout</strong>
                <span>Nous livrons dans les 69 wilayas.</span>
              </div>
            </div>

            <div className="wz-why-card">
              <div className="wz-why-icon">💳</div>
              <div>
                <strong>Paiement à la livraison</strong>
                <span>Vous payez à la réception de votre commande.</span>
              </div>
            </div>

            <div className="wz-why-card">
              <div className="wz-why-icon">💬</div>
              <div>
                <strong>Support WhatsApp</strong>
                <span>Une question ? Notre support reste accessible.</span>
              </div>
            </div>
          </div>

          <style>{`
            .wz-why{width:100%;box-sizing:border-box;padding:46px 20px 18px;background:linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,0));}
            .wz-why-head{max-width:920px;margin:0 auto 22px;text-align:center;}
            .wz-why-kicker{display:inline-block;font-size:9px;font-weight:900;letter-spacing:.18em;color:var(--br);margin-bottom:9px;}
            .wz-why-head h2{margin:0;color:var(--g3);font-family:Georgia,'Times New Roman',serif;font-size:clamp(26px,5vw,42px);line-height:1.05;letter-spacing:-.03em;font-weight:600;}
            .wz-why-head p{max-width:620px;margin:12px auto 0;color:var(--g4);font-size:12px;line-height:1.65;}
            .wz-why-grid{max-width:920px;margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
            .wz-why-card{display:flex;align-items:flex-start;gap:11px;padding:15px 14px;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.018));box-shadow:0 12px 30px rgba(0,0,0,.10);}
            .wz-why-icon{width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex:0 0 38px;border-radius:11px;background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.16);font-size:19px;}
            .wz-why-card strong{display:block;color:var(--g3);font-size:12px;font-weight:900;line-height:1.25;margin-top:2px;}
            .wz-why-card span{display:block;color:var(--g4);font-size:10px;line-height:1.45;margin-top:4px;}
            @media(max-width:720px){
              .wz-why{padding:34px 14px 12px;}
              .wz-why-head{margin-bottom:16px;}
              .wz-why-head p{font-size:11px;max-width:340px;}
              .wz-why-grid{grid-template-columns:1fr;gap:8px;max-width:520px;}
              .wz-why-card{padding:13px 12px;}
            }
          `}</style>
        </section>

        {/* ── Recherche + badges (juste au-dessus des produits) ── */}
        <section id="collection" className="hero" style={{ minHeight:'auto', padding:'48px 20px 24px' }}>
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
            window.fbq && fbq('track', 'ViewContent', {
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
        <div className="fbn">Wazyo</div>
        <p className="ftag">{CONFIG.slogan}</p>

        {/* Infos contact */}
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:10, flexWrap:'wrap' }}>
          <a href={`tel:+${CONFIG.telephone}`} style={{
            color:'var(--g3)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>📞 +{CONFIG.telephone}</a>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <a href={`mailto:${CONFIG.email}`} style={{
            color:'var(--g3)', fontSize:12, textDecoration:'none',
            display:'flex', alignItems:'center', gap:4,
          }}>✉️ {CONFIG.email}</a>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
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
              color:'var(--g3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'var(--g3)'}
          >
            🔒 Politique de confidentialité
          </button>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <button
            onClick={() => setPolitiqueTab('retour')}
            style={{
              background:'none', border:'none',
              color:'var(--g3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'var(--g3)'}
          >
            🔄 Politique de retour
          </button>
          <span style={{ color:'var(--g3)', fontSize:12 }}>|</span>
          <button
            onClick={() => setTrackingOpen(true)}
            style={{
              background:'none', border:'none',
              color:'var(--g3)', fontSize:12,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3,
              padding:0, transition:'color .2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = 'var(--g3)'}
          >
            📦 Suivre ma commande
          </button>
        </div>
        <p style={{ color:'var(--g3)', fontSize:11, marginTop:12 }}>
          © {new Date().getFullYear()} Wazyo · Tous droits réservés
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
            const ok = await submitOrder(form)
            if (ok) {
              setOpenProduct(null)
              window.history.pushState({}, '', window.location.pathname)
            }
            return ok
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
            window.fbq && fbq('track', 'InitiateCheckout', {
              value: cart.reduce((s,i) => s + i.prix * i.qty, 0),
              currency: 'DZD',
              num_items: cart.reduce((s,i) => s + i.qty, 0),
            }) }}
      />

      {/* Order modal */}
      {orderItems && (
        <OrderModal
          items={orderItems}
          promo={promoInfo}
          onClose={() => { setOrderItems(null); setPromoInfo(null) }}
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
      <WAButton />
      <CookieConsent />

      {showTopButton && !openProduct && !cartOpen && !orderItems && !lastOrder && !trackingOpen && !politiqueTab && (
        <button
          type="button"
          aria-label="Revenir en haut"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position:'fixed',
            left:'16px',
            bottom:'18px',
            zIndex:180,
            width:44,
            height:44,
            borderRadius:'50%',
            border:'1px solid rgba(201,168,76,.35)',
            background:'rgba(12,12,12,.90)',
            color:'#E9C46A',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            fontSize:19,
            fontWeight:900,
            cursor:'pointer',
            boxShadow:'0 10px 28px rgba(0,0,0,.30)',
            backdropFilter:'blur(12px)',
            WebkitBackdropFilter:'blur(12px)',
          }}
        >
          ↑
        </button>
      )}

      {/* Toasts */}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>
        ))}
      </div>
      </div>
    </>
  )
}
