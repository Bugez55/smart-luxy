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
  const [checkoutProduct, setCheckoutProduct] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [promoInfo, setPromoInfo] = useState(null)
  const [affiliateOffer, setAffiliateOffer] = useState(null)
  const [heroSettings, setHeroSettings] = useState({ url: '', type: '' })
  const [orderItems, setOrderItems] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)
  const [toasts, setToasts] = useState([])
  const [politiqueTab, setPolitiqueTab] = useState(null)

  // ── Mode maintenance (piloté par le réglage Supabase) ──
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceChecked, setMaintenanceChecked] = useState(false)

  useEffect(() => {
    let mounted = true
    getSettings().then(s => {
      if (!mounted) return
      setMaintenanceMode(String(s?.maintenance || 'false').toLowerCase() === 'true')
      setHeroSettings({
        url: String(s?.hero_media_url || '').trim(),
        type: String(s?.hero_media_type || '').trim().toLowerCase(),
      })
      setMaintenanceChecked(true)
    }).catch(err => {
      // En cas d'erreur de lecture des settings, ne jamais bloquer la boutique.
      console.error('maintenance settings:', err)
      if (mounted) {
        setMaintenanceMode(false)
        setHeroSettings({ url: '', type: '' })
        setMaintenanceChecked(true)
      }
    })
    return () => { mounted = false }
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

  // ── Chargement produits + ouverture directe + affiliation ──
  useEffect(() => {
    let cancelled = false

    async function init() {
      await loadProducts()

      try {
        const searchParams = new URLSearchParams(window.location.search)
        const refCode = String(searchParams.get('ref') || '').trim().toUpperCase()
        let offerData = null

        if (refCode) {
          // Même visiteur = même clé persistante. Le RPC compte au maximum
          // un clic unique par lien et par jour.
          let visitorKey = localStorage.getItem('wazyo_affiliate_visitor_key')
          if (!visitorKey) {
            visitorKey = window.crypto?.randomUUID
              ? window.crypto.randomUUID()
              : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
            localStorage.setItem('wazyo_affiliate_visitor_key', visitorKey)
          }

          const { data, error } = await supabase.rpc('track_affiliate_click', {
            p_code: refCode,
            p_visitor_key: visitorKey,
          })

          if (error) {
            console.error('Suivi du clic influenceur :', error)
            // Si le suivi du clic échoue, on vérifie tout de même si le lien
            // est valide afin de ne pas bloquer la remise pour le client.
            const fallback = await supabase.rpc('get_affiliate_link', { p_code: refCode })
            if (!fallback.error) offerData = fallback.data
          } else {
            offerData = data
          }

          if (offerData?.code) {
            localStorage.setItem('wazyo_affiliate_offer', JSON.stringify(offerData))
          } else {
            localStorage.removeItem('wazyo_affiliate_offer')
          }
        } else {
          // Conserver l'offre après navigation/rechargement, mais revalider
          // son statut et ses dates côté serveur à chaque démarrage.
          let savedOffer = null
          try {
            savedOffer = JSON.parse(localStorage.getItem('wazyo_affiliate_offer') || 'null')
          } catch {
            savedOffer = null
          }

          if (savedOffer?.code) {
            const { data, error } = await supabase.rpc('get_affiliate_link', {
              p_code: savedOffer.code,
            })
            if (!error && data?.code) {
              offerData = data
              localStorage.setItem('wazyo_affiliate_offer', JSON.stringify(data))
            } else {
              localStorage.removeItem('wazyo_affiliate_offer')
            }
          }
        }

        if (!cancelled) setAffiliateOffer(offerData?.code ? offerData : null)
      } catch (e) {
        console.error('Initialisation affiliation :', e)
      }

      // Lire le hash APRÈS le chargement des produits et du lien.
      const hash = window.location.hash
      if (hash.startsWith('#produit-')) {
        const productId = hash.replace('#produit-', '')
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()
        if (!cancelled && data) setOpenProduct(data)
      }
    }

    init().catch(e => console.error('Initialisation boutique :', e))
    return () => { cancelled = true }
  }, [loadProducts])

  // ── Bouton retour physique du téléphone/navigateur — ferme la page produit ──
  useEffect(() => {
    function handlePopState() {
      const hash = window.location.hash
      if (!hash.startsWith('#produit-')) {
        // L'utilisateur est revenu en arrière depuis la page produit → on la ferme
        setOpenProduct(null)
        setCheckoutProduct(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Appliquer le thème + garde-fou de contraste ──
  useEffect(() => {
    getSettings().then(s => {
      const r = document.documentElement
      const hexToRgb = (hex) => {
        if (!hex) return null
        let h = String(hex).trim().replace('#','')
        if (h.length === 3) h = h.split('').map(c => c + c).join('')
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
      }
      const lum = (hex) => {
        const rgb = hexToRgb(hex)
        if (!rgb) return .05
        const c = rgb.map(v => {
          const x = v / 255
          return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)
        })
        return .2126*c[0] + .7152*c[1] + .0722*c[2]
      }
      const contrast = (a,b) => {
        const A = lum(a), B = lum(b)
        const hi = Math.max(A,B), lo = Math.min(A,B)
        return (hi + .05) / (lo + .05)
      }
      const pickText = (bg, preferred, fallbackLight='#fff', fallbackDark='#111') => {
        if (preferred && contrast(preferred, bg) >= 4.2) return preferred
        return lum(bg) > .52 ? fallbackDark : fallbackLight
      }

      const bg = s.theme_bg || localStorage.getItem('sl_theme_bg') || '#0a0a0a'
      const card = s.theme_card || localStorage.getItem('sl_theme_card') || '#141414'
      const accent = s.theme_accent || localStorage.getItem('sl_theme_accent') || '#C9A84C'
      const bgLight = lum(bg) > .52
      const text = pickText(bg, s.theme_text, '#ffffff', '#111111')
      const sub = pickText(bg, s.theme_text_sub, '#b8b8b8', '#5f5f5f')
      const cardText = lum(card) > .52 ? '#171717' : '#f7f7f7'
      const cardSub = lum(card) > .52 ? '#666666' : '#bdbdbd'

      r.style.setProperty('--bk', bg)
      r.style.setProperty('--bk2', bg)
      r.style.setProperty('--card', card)
      r.style.setProperty('--card2', card)
      r.style.setProperty('--card3', card)
      r.style.setProperty('--br', accent)
      r.style.setProperty('--br2', accent)
      r.style.setProperty('--br3', accent)
      r.style.setProperty('--g3', text)
      r.style.setProperty('--g4', sub)
      r.style.setProperty('--wz-card-text', cardText)
      r.style.setProperty('--wz-card-sub', cardSub)
      r.style.setProperty('--wz-mode', bgLight ? 'light' : 'dark')
      r.style.setProperty('--wz-page-border', bgLight ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.08)')
      r.style.setProperty('--wz-soft-fill', bgLight ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.035)')
      r.dataset.themeMode = bgLight ? 'light' : 'dark'
      document.body.style.background = bg
      localStorage.setItem('sl_theme_bg', bg)
      localStorage.setItem('sl_theme_card', card)
      localStorage.setItem('sl_theme_accent', accent)
      localStorage.setItem('sl_theme_text', text)
      localStorage.setItem('sl_theme_text_sub', sub)
    }).catch(() => {})
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
      const items = Array.isArray(form.items) ? form.items : []
      const hasColors = items.some(i => i?.color || i?.couleur)
      const offerCode = String(affiliateOffer?.code || '').trim()
      const targetProductId = affiliateOffer?.product_id
      const includesTarget = !!offerCode && items.some(i => String(i?.id) === String(targetProductId))
      const allItemsAreTarget = !!offerCode && items.length > 0 &&
        items.every(i => String(i?.id) === String(targetProductId))

      // Le SQL actuel applique une seule réduction influenceur à un seul
      // produit. Refuser les paniers mélangés évite de créer une commande
      // sans la remise promise ou d'appliquer la remise à d'autres articles.
      if (includesTarget && !allItemsAreTarget) {
        toast('La remise influenceur s’applique uniquement à ce produit. Passe cette commande séparément depuis sa fiche.', 'error')
        return false
      }

      const useAffiliate = allItemsAreTarget
      const rpcName = useAffiliate
        ? (hasColors ? 'create_order_with_colors_affiliate' : 'create_order_with_affiliate')
        : (hasColors ? 'create_order_with_colors' : 'create_order')

      const rpcArgs = {
        p_nom_client: form.nom,
        p_telephone: form.tel,
        p_wilaya: form.wilaya,
        p_commune: form.commune,
        p_adresse: form.adresse || '',
        p_note: form.note || '',
        p_items: items,
        p_mode_livraison: form.mode_livraison || 'domicile',
        // Conserver strictement le calcul de livraison côté SQL existant.
        p_frais_livraison: form.frais_livraison || 0,
        p_mode_paiement: form.mode_paiement || 'livraison',
        p_promo_code: useAffiliate ? null : (form.promo_code || null),
        p_fbc: fbc,
        p_fbp: fbp,
      }
      if (useAffiliate) rpcArgs.p_affiliate_code = offerCode

      const { data: order, error } = await supabase.rpc(rpcName, rpcArgs)

      if (error || !order) {
        console.error('Erreur RPC commande Wazyo:', {
          rpcName,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
        toast('❌ Commande non enregistrée. Vérifie les informations et réessaie.', 'error')
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
  if (!maintenanceChecked) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bk)', color:'var(--g4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
        Chargement…
      </div>
    )
  }

  if (maintenanceMode) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bk)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
        <div style={{ maxWidth:520, width:'100%', padding:'48px 28px', border:'1px solid rgba(201,168,76,.22)', borderRadius:20, background:'rgba(20,20,20,.9)', boxShadow:'0 20px 60px rgba(0,0,0,.35)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔧</div>
          <h1 style={{ margin:'0 0 12px', fontSize:28 }}>Site en maintenance</h1>
          <p style={{ margin:0, color:'var(--g3)', lineHeight:1.7 }}>
            Notre boutique est momentanément indisponible. Nous revenons très bientôt. Merci pour votre patience.
          </p>
        </div>
      </div>
    )
  }

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
        {/* ── Hero plein écran ── */}
        <Hero
          heroImage={heroSettings.url || products[0]?.img}
          heroMediaType={heroSettings.url ? heroSettings.type : 'image'}
          heroFallbackImage={products[0]?.img}
          onScrollToCollection={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
        />

        <TrustMarquee />

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
          onBuyNow={p => { setCheckoutProduct(p); setOpenProduct(null); window.scrollTo({ top:0, behavior:'auto' }) }}
        />
      </main>

      {/* ════════════════════════════════════════
          GALERIE PRODUITS DÉFILANTE
      ════════════════════════════════════════ */}
      {!openProduct && !checkoutProduct && !cartOpen && !orderItems && !lastOrder && !trackingOpen && (
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

      {/* Direct checkout depuis la page d'accueil */}
      {checkoutProduct && (
        <ProductPage
          checkoutOnly
          product={checkoutProduct}
          affiliateOffer={affiliateOffer}
          allProducts={products}
          onClose={() => setCheckoutProduct(null)}
          onSubmitOrder={async (form) => {
            const ok = await submitOrder(form)
            if (ok) setCheckoutProduct(null)
            return ok
          }}
          onPolitique={(tab) => setPolitiqueTab(tab)}
        />
      )}

      {/* Product detail */}
      <div className={`overlay ${openProduct ? 'on' : ''}`} onClick={() => {
          setOpenProduct(null)
          window.history.pushState({}, '', window.location.pathname)
        }} />
      {openProduct && (
        <ProductPage
          product={openProduct}
          affiliateOffer={affiliateOffer}
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

      {/* Toasts */}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}
