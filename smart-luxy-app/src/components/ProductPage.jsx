import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import DOMPurify from 'dompurify'
import CountdownTimer from './CountdownTimer'
import { WILAYAS, getCommunesByWilaya } from '../data/wilayas'
import { getSettings } from '../utils/useSettings'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function ProductPage({ product: p, allProducts, onClose, onAddToCart, onBuyNow, onSubmitOrder, onPolitique, checkoutItems = null, checkoutOnly = false, promo = null }) {
  const [openFaq, setOpenFaq] = useState(null)
  const [ordered, setOrdered] = useState(false)
  const [lang, setLang] = useState('ar')
  const rtl = lang === 'ar'
  const [imgIdx, setImgIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const imgRef2 = useRef()
  const [selectedBundle, setSelectedBundle] = useState(null)
  const [qty, setQty] = useState(1)
  const [form, setForm] = useState({ nom:'', tel:'', wilaya:'', commune:'', adresse:'', note:'', website:'' })
  const [modeLiv, setModeLiv] = useState('domicile')
  const [modePaiement, setModePaiement] = useState('livraison')
  const [paiementInfo, setPaiementInfo] = useState({ ccp:'', ccp_nom:'', baridimob:'', ccp_actif:false, baridimob_actif:false })
  const [preuvePaiement, setPreuvePaiement] = useState('')
  const [copiedPayment, setCopiedPayment] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [telError, setTelError] = useState(false)
  const [telShake, setTelShake] = useState(false)
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [wilayaSearch, setWilayaSearch] = useState('')
  const [communeOpen, setCommuneOpen] = useState(false)
  const [communeSearch, setCommuneSearch] = useState('')
  const [stickyVisible, setStickyVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [shippingRates, setShippingRates] = useState({})
  const [freeShip, setFreeShip] = useState(null)
  const formRef = useRef()
  const topRef = useRef()

  async function loadShippingRates() {
    const [{ data: rates }, settings] = await Promise.all([
      supabase.from('shipping_rates').select('wilaya,bureau,domicile'),
      getSettings(),
    ])
    const map = {}
    for (const row of rates || []) map[row.wilaya] = { bureau: Number(row.bureau) || 0, domicile: Number(row.domicile) || 0 }
    setShippingRates(map)
    const fs = Number(settings?.free_ship)
    setFreeShip(Number.isFinite(fs) && fs > 0 ? fs : null)
    setPaiementInfo({
      ccp:             settings?.ccp_numero       || '',
      ccp_nom:         settings?.ccp_nom          || '',
      baridimob:       settings?.baridimob_numero || '',
      ccp_actif:       settings?.ccp_actif === 'true',
      baridimob_actif: settings?.baridimob_actif === 'true',
    })
  }

  useEffect(() => {
    loadShippingRates().catch(() => {})
    const onFocus = () => loadShippingRates().catch(() => {})
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(() => loadShippingRates().catch(() => {}), 30000)
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer) }
  }, [])

  const imgs = (() => { try { return typeof p.images==='string' ? JSON.parse(p.images) : (p.images||[]) } catch { return [] } })()
  const imgsGallery = (() => { try { return typeof p.images_gallery==='string' ? JSON.parse(p.images_gallery) : (p.images_gallery||[]) } catch { return [] } })()
  const specs = (() => { try { return typeof p.specs==='string' ? JSON.parse(p.specs) : (p.specs||[]) } catch { return [] } })()
  const bundles = (() => { try { return typeof p.bundles==='string' ? JSON.parse(p.bundles) : (p.bundles||[]) } catch { return [] } })()
  const faq = (() => { try { return typeof p.faq==='string' ? JSON.parse(p.faq) : (p.faq||[]) } catch { return [] } })()

  const mainImg = imgs[0]?.url || p.img
  const hasBundles = bundles.length > 0
  const activeBundle = selectedBundle !== null ? bundles[selectedBundle] : null
  const currentPrix = activeBundle ? activeBundle.prix : p.prix
  const currentQty = activeBundle ? activeBundle.qty : qty

  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5
  const isPromo = p.badge?.includes('Promo') || p.prix_old
  const disc = p.prix_old && p.prix_old > p.prix ? Math.round(100-(p.prix/p.prix_old)*100) : 0

  const wilayaNom = form.wilaya ? form.wilaya.replace(/^\d+ — /, '') : ''
  const productSubtotal = activeBundle ? Number(activeBundle.prix) : Number(p.prix) * qty
  const checkoutSubtotal = checkoutOnly && Array.isArray(checkoutItems)
    ? checkoutItems.reduce((sum, item) => sum + Number(item.prix || 0) * Number(item.qty || 0), 0)
    : productSubtotal
  const prixLiv = wilayaNom && shippingRates[wilayaNom] ? shippingRates[wilayaNom][modeLiv] : null
  const fraisLivBase = prixLiv !== null && prixLiv !== undefined ? prixLiv : null
  const fraisLiv = freeShip !== null && checkoutSubtotal >= freeShip ? 0 : fraisLivBase
  const totalFinal = checkoutSubtotal + (fraisLiv || 0)
  const communes = wilayaNom ? getCommunesByWilaya(wilayaNom) : []
  const wilayasOptions = WILAYAS.map(w => `${w.code} — ${w.nom}`)
  const filteredWilayas = wilayasOptions.filter(opt => {
    const q = wilayaSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (!q) return true
    return opt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
  })
  const filteredCommunes = communes.filter(opt => {
    const q = communeSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (!q) return true
    return String(opt).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
  })


  // Convertir URL vidéo en embed
  function getEmbedUrl(url) {
    if (!url) return null
    url = url.trim()

    // YouTube — toutes les variantes
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id = null
      try {
        if (url.includes('youtu.be/')) {
          id = url.split('youtu.be/')[1]?.split(/[?&#]/)[0]
        } else if (url.includes('youtube.com/shorts/')) {
          id = url.split('youtube.com/shorts/')[1]?.split(/[?&#]/)[0]
        } else {
          id = new URL(url).searchParams.get('v')
        }
      } catch { id = null }
      return id ? { type:'youtube', src:`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` } : null
    }

    // TikTok — variantes mobiles et desktop
    if (url.includes('tiktok.com')) {
      const id = url.match(/\/video\/([0-9]+)/)?.[1] || url.match(/([0-9]{15,})/)?.[1]
      if (id) return { type:'tiktok', src:`https://www.tiktok.com/embed/v2/${id}` }
      // Lien court vm.tiktok.com → bouton externe
      return { type:'external', src: url }
    }

    // Instagram Reels
    if (url.includes('instagram.com/reel') || url.includes('instagram.com/p/')) {
      const id = url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1]
      if (id) return { type:'instagram', src:`https://www.instagram.com/p/${id}/embed/` }
    }

    // Facebook vidéo
    if (url.includes('facebook.com') && url.includes('video')) {
      return { type:'facebook', src:`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false` }
    }

    return { type:'external', src: url }
  }

  function setF(k, v) {
    setForm(f => ({ ...f, [k]:v, ...(k==='wilaya'?{commune:''}:{}) }))
    if (k === 'tel' && telError) setTelError(false)
  }
  function isValidTel(v) {
    const digits = (v || '').replace(/[^\d]/g, '')
    return /^0\d{9}$/.test(digits)
  }

  function formatAlgerianPhone(v) {
    const digits = (v || '').replace(/\D/g, '').slice(0, 10)
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }

  const telDigits = (form.tel || '').replace(/\D/g, '')
  const telValid = isValidTel(form.tel)

  // Sur mobile, le clavier + sa barre d'outils cachent souvent le champ en cours
  // de saisie. On recentre le champ à l'écran juste après l'ouverture du clavier.
  function handleFocusScroll(e) {
    const el = e.target
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  // Lock body scroll
  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Swipe natif sur l'image
  useEffect(() => {
    const el = document.querySelector('[data-img-swipe]')
    if (!el || imgs.length < 2) return
    let tx = 0, ty = 0
    const onTS = e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY }
    const onTM = e => { if (Math.abs(e.touches[0].clientX - tx) > Math.abs(e.touches[0].clientY - ty)) e.preventDefault() }
    const onTE = e => {
      const dx = e.changedTouches[0].clientX - tx
      const dy = Math.abs(e.changedTouches[0].clientY - ty)
      if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
        if (dx < 0) setImgIdx(i => (i+1)%imgs.length)
        else setImgIdx(i => (i-1+imgs.length)%imgs.length)
      } else if (Math.abs(dx) < 10 && dy < 10) setLb(true)
    }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: false })
    el.addEventListener('touchend', onTE, { passive: true })
    return () => { el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE) }
  }, [imgs.length])

  // Observer sticky
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting), { threshold: 0 })
    if (topRef.current) obs.observe(topRef.current)
    return () => obs.disconnect()
  }, [])

  // Barre de progression de lecture du produit
  useEffect(() => {
    const root = document.querySelector('.pp-root')
    if (!root) return

    const update = () => {
      const max = root.scrollHeight - root.clientHeight
      const pct = max > 0 ? Math.min(100, Math.max(0, (root.scrollTop / max) * 100)) : 0
      setScrollProgress(pct)
    }

    root.addEventListener('scroll', update, { passive: true })
    update()
    return () => root.removeEventListener('scroll', update)
  }, [])

  async function copyPaymentNumber(value, type) {
    if (!value) return
    try {
      await navigator.clipboard?.writeText(String(value))
      setCopiedPayment(type)
      setTimeout(() => setCopiedPayment(''), 1800)
    } catch {
      // Clipboard may be unavailable on older/mobile browsers.
    }
  }

  async function handleOrder() {
    if (!form.nom || !form.tel || !form.wilaya || !form.commune) return
    if (!isValidTel(form.tel)) { setTelError(true); setTelShake(true); setTimeout(() => setTelShake(false), 500); return }
    // Anti-bot honeypot — si ce champ caché est rempli, c'est un robot
    if (form.website) { console.warn('Bot détecté'); return }
    if (!checkoutOnly && hasBundles && selectedBundle === null) return
    setOrdering(true)
    const prixUnit = activeBundle ? Math.round(activeBundle.prix / activeBundle.qty) : p.prix
    const submitItems = checkoutOnly && Array.isArray(checkoutItems)
      ? checkoutItems
      : [{ ...p, qty: currentQty, prix: prixUnit }]
    try {
      await onSubmitOrder({
        ...form,
        items: submitItems,
        mode_livraison: modeLiv,
        mode_paiement:  modePaiement,
        preuve_paiement: preuvePaiement || null,
        frais_livraison: fraisLiv || 0,
        total: totalFinal,
        promo_code: promo?.code || null,
      })
    } finally {
      setOrdering(false)
    }
  }

  const inp = {
    background:'var(--card2)', border:'1px solid #2a2a2a', borderRadius:10,
    padding:'12px 14px', color:'var(--g3)', fontSize:'16px', width:'100%',
    outline:'none', boxSizing:'border-box', fontFamily:'inherit',
    WebkitTextSizeAdjust:'100%', touchAction:'manipulation',
    direction: rtl ? 'rtl' : 'ltr',
  }
  const lbl = { fontSize:11, fontWeight:800, color:'var(--g3)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }

  const renderOrderForm = () => (
    <>
      {/* ══════════════════════════════════════════
          FORMULAIRE DE COMMANDE — style MarketDZ
      ══════════════════════════════════════════ */}
      <div ref={formRef} className="pp-order-card" style={{ margin:'0 12px 16px', background:'var(--card)', border:'1px solid rgba(201,168,76,.25)', borderRadius:18, direction: rtl ? 'rtl' : 'ltr' }}>

        {/* En-tête formulaire */}
        <div style={{ position:'relative', background:'linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.05))', borderBottom:'1px solid rgba(201,168,76,.2)', padding:'16px', textAlign:'center' }}>
          <button onClick={() => setLang(l => l==='fr'?'ar':'fr')} style={{
            position:'absolute', top:12, right:12,
            background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.3)', borderRadius:20,
            padding:'5px 12px', color:'var(--br)', fontSize:11, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap',
          }}>
            {lang==='fr' ? '🇩🇿 عربي' : '🇫🇷 FR'}
          </button>
          <div style={{ fontSize:17, fontWeight:900, color:'var(--g3)', marginBottom:3 }}>{lang==='ar' ? '🛒 أدخل طلبك' : '🛒 Passer commande'}</div>
          <div style={{ fontSize:12, color:'var(--g3)' }}>{lang==='ar' ? 'الدفع عند الاستلام ✅ في كل الجزائر 🇩🇿' : 'Paiement à la livraison ✅ Partout en Algérie 🇩🇿'}</div>
        </div>

        <div style={{ padding:16 }}>

          {checkoutOnly && Array.isArray(checkoutItems) && checkoutItems.length > 0 && (
            <div style={{ background:'var(--card2)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'10px 12px', marginBottom:14 }}>
              {checkoutItems.map((item, i) => (
                <div key={`${item.id}-${i}`} style={{ display:'flex', justifyContent:'space-between', gap:10, fontSize:12, marginBottom:i < checkoutItems.length - 1 ? 6 : 0 }}>
                  <span style={{ color:'var(--g3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nom} ×{item.qty}</span>
                  <span style={{ color:'var(--br)', fontWeight:800, flexShrink:0 }}>{fmt(Number(item.prix) * Number(item.qty))}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Progression de commande ── */}
          {(() => {
            const steps = [
              { label: lang==='ar' ? 'المنتج' : 'Produit', done: !hasBundles || selectedBundle !== null },
              { label: lang==='ar' ? 'التوصيل' : 'Livraison', done: !!form.wilaya && !!form.commune },
              { label: lang==='ar' ? 'المعلومات' : 'Coordonnées', done: !!form.nom && !!form.tel && isValidTel(form.tel) },
              { label: lang==='ar' ? 'التأكيد' : 'Confirmation', done: false },
            ]
            let active = steps.findIndex(x => !x.done)
            if (active < 0) active = steps.length - 1
            return (
              <div className="pp-order-steps" aria-label={lang==='ar' ? 'تقدم الطلب' : 'Progression de la commande'}>
                {steps.map((step, i) => (
                  <div key={step.label} className={`pp-order-step ${step.done ? 'is-done' : ''} ${i === active ? 'is-active' : ''}`}>
                    <div className="pp-order-step-line" aria-hidden="true" />
                    <div className="pp-order-step-dot">{step.done ? '✓' : i + 1}</div>
                    <div className="pp-order-step-label">{step.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* ── PACKS / BUNDLES ── */}
          {!checkoutOnly && hasBundles && (
            <div style={{ marginBottom:18 }}>
              <div style={lbl}>Choisir une offre</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bundles.map((b, i) => {
                  const isSelected = selectedBundle === i
                  const prixParUnit = b.qty > 1 ? Math.round(b.prix / b.qty) : null
                  return (
                    <div key={i} onClick={() => setSelectedBundle(isSelected ? null : i)} style={{
                      display:'flex', alignItems:'center', gap:12,
                      background: isSelected ? 'rgba(201,168,76,.12)' : 'var(--card2)',
                      border:`2px solid ${isSelected ? '#C9A84C' : 'var(--g3)'}`,
                      borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all .2s',
                    }}>
                      {/* Radio */}
                      <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${isSelected?'#C9A84C':'var(--g3)'}`, background:isSelected?'#C9A84C':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
                        {isSelected && <span style={{ fontSize:12, color:'#000', fontWeight:900 }}>✓</span>}
                      </div>
                      {/* Image si disponible */}
                      {mainImg && <img src={mainImg} alt="" style={{ width:44, height:44, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
                      {/* Label */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--g3)' }}>{b.label}</div>
                        {prixParUnit && <div style={{ fontSize:11, color:'var(--g3)', marginTop:1 }}>{fmt(prixParUnit)} / unité</div>}
                      </div>
                      {/* Prix */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:900, color:isSelected?'#C9A84C':'var(--g3)' }}>{fmt(b.prix)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantité si pas de bundles */}
          {!checkoutOnly && !hasBundles && (
            <div className="pp-qty-block" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:7 }}>
                <label style={{ ...lbl, marginBottom:0 }}>{lang==='ar' ? 'الكمية' : 'Quantité' }</label>
                <span className="pp-qty-stock" style={{ fontSize:10, color: outOfStock ? '#fca5a5' : 'var(--g4)', fontWeight:800 }}>
                  {outOfStock
                    ? (lang==='ar' ? 'غير متوفر' : 'Indisponible')
                    : p.stock !== null && p.stock !== undefined
                      ? `${p.stock} ${lang==='ar' ? 'en stock' : 'en stock'}`
                      : (lang==='ar' ? 'Stock disponible' : 'Stock disponible')}
                </span>
              </div>

              <div className="pp-qty-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'9px 10px', background:'var(--card2)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14 }}>
                <button
                  type="button"
                  aria-label={lang==='ar' ? 'إنقاص الكمية' : 'Diminuer la quantité'}
                  disabled={qty <= 1}
                  onClick={() => setQty(q => Math.max(1,q-1))}
                  style={{ background:qty<=1?'rgba(255,255,255,.04)':'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, width:42, height:42, color:qty<=1?'#555':'var(--g3)', fontSize:20, cursor:qty<=1?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', flexShrink:0 }}
                >−</button>

                <div style={{ minWidth:110, textAlign:'center' }}>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:6 }}>
                    <span style={{ color:'var(--g3)', fontWeight:900, fontSize:22, lineHeight:1 }}>{qty}</span>
                    <span style={{ color:'var(--g4)', fontSize:10, fontWeight:800 }}>{qty > 1 ? (lang==='ar' ? 'unités' : 'unités') : (lang==='ar' ? 'unité' : 'unité')}</span>
                  </div>
                  <div style={{ marginTop:4, fontSize:10, color:'var(--br)', fontWeight:800 }}>
                    {fmt(currentPrix * qty)}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={lang==='ar' ? 'زيادة الكمية' : 'Augmenter la quantité'}
                  disabled={outOfStock || (p.stock !== null && p.stock !== undefined && qty >= Number(p.stock))}
                  onClick={() => setQty(q => (p.stock !== null && p.stock !== undefined ? Math.min(Number(p.stock), q+1) : q+1))}
                  style={{ background:(outOfStock || (p.stock !== null && p.stock !== undefined && qty >= Number(p.stock)))?'rgba(255,255,255,.04)':'rgba(201,168,76,.10)', border:'1px solid rgba(201,168,76,.18)', borderRadius:10, width:42, height:42, color:(outOfStock || (p.stock !== null && p.stock !== undefined && qty >= Number(p.stock)))?'#555':'var(--br)', fontSize:20, cursor:(outOfStock || (p.stock !== null && p.stock !== undefined && qty >= Number(p.stock)))?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', flexShrink:0 }}
                >+</button>
              </div>

              {p.stock !== null && p.stock !== undefined && Number(p.stock) > 0 && qty >= Number(p.stock) && (
                <div style={{ marginTop:6, fontSize:10, color:'#fbbf24', fontWeight:700, textAlign:'center' }}>
                  {lang==='ar' ? 'الكمية maximale disponible' : 'Quantité maximale disponible'}
                </div>
              )}
            </div>
          )}

          {/* ── Mode livraison ── */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>{lang==='ar' ? 'طريقة التوصيل' : 'Mode de livraison' }</label>
            <div className="pp-delivery-options" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {['domicile','bureau'].map(mode => {
                const selected = modeLiv === mode
                const modeFee = wilayaNom && shippingRates[wilayaNom] ? shippingRates[wilayaNom][mode] : null
                const modeLabel = mode==='domicile'
                  ? (lang==='ar' ? 'التوصيل للمنزل' : 'À domicile')
                  : (lang==='ar' ? 'الاستلام من المكتب' : 'Retrait bureau')
                const modeTime = mode==='domicile'
                  ? (lang==='ar' ? '2–5 أيام' : '2–5 jours')
                  : (lang==='ar' ? '1–3 أيام' : '1–3 jours')
                const modeIcon = mode==='domicile' ? '🏠' : '📦'
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setModeLiv(mode)}
                    aria-pressed={selected}
                    className={selected ? 'pp-delivery-card is-selected' : 'pp-delivery-card'}
                    style={{
                      position:'relative', padding:'12px 12px 11px', minHeight:90,
                      background:selected?'linear-gradient(180deg,rgba(201,168,76,.14),rgba(201,168,76,.06))':'var(--card2)',
                      border:`1px solid ${selected?'rgba(201,168,76,.72)':'rgba(255,255,255,.10)'}`,
                      borderRadius:14, color:'var(--g3)', cursor:'pointer', textAlign:'left',
                      transition:'transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease',
                      boxShadow:selected?'0 10px 24px rgba(201,168,76,.08)':'none',
                      display:'flex', flexDirection:'column', justifyContent:'space-between',
                    }}
                  >
                    <span style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', border:`1px solid ${selected?'#C9A84C':'rgba(255,255,255,.18)'}`, background:selected?'#C9A84C':'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontSize:12, fontWeight:900 }}>
                      {selected ? '✓' : ''}
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:8, paddingRight:28 }}>
                      <span style={{ width:32, height:32, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:selected?'rgba(201,168,76,.16)':'rgba(255,255,255,.05)', fontSize:17, flexShrink:0 }}>{modeIcon}</span>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:900, lineHeight:1.25, color:selected?'#E9C46A':'var(--g3)' }}>{modeLabel}</div>
                        <div style={{ fontSize:9, marginTop:4, color:selected?'rgba(233,196,106,.72)':'var(--g4)', fontWeight:700 }}>{modeTime}</div>
                      </div>
                    </div>
                    <div style={{ marginTop:10, display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontSize:9, color:'var(--g4)', fontWeight:700 }}>{lang==='ar' ? 'تكلفة التوصيل' : 'Frais de livraison'}</span>
                      <span style={{ fontSize:13, color:modeFee===0?'#22c55e':(modeFee!==null ? (selected ? '#C9A84C' : 'var(--g3)') : '#777'), fontWeight:900 }}>
                        {modeFee===null
                          ? (lang==='ar' ? 'اختر الولاية' : 'Choisir la wilaya')
                          : modeFee===0
                            ? (lang==='ar' ? 'مجاني' : 'Gratuit')
                            : fmt(modeFee)}
                      </span>
                    </div>
                    {selected && modeFee !== null && (
                      <span style={{ marginTop:7, alignSelf:'flex-start', fontSize:8, fontWeight:900, letterSpacing:'.08em', textTransform:'uppercase', color:'#000', background:'#C9A84C', padding:'3px 6px', borderRadius:999 }}>
                        {lang==='ar' ? 'مختار' : 'Sélectionné'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pp-form-section-title">
            <div className="pp-form-section-icon">📍</div>
            <div>
              <div>{lang==='ar' ? 'معلومات التوصيل' : 'Livraison'}</div>
              <small>{lang==='ar' ? 'Choisis ta wilaya et ta commune' : 'Choisis ta wilaya et ta commune'}</small>
            </div>
          </div>

          {/* ── Wilaya ── */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>{lang==='ar' ? 'الولاية *' : 'Wilaya *' }</label>
            <div style={{ position:'relative' }}>
              <div onClick={() => { setWilayaOpen(o=>!o); setCommuneOpen(false) }} style={{ ...inp, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', color:form.wilaya?'var(--g3)':'var(--g4)' }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{form.wilaya || (lang==='ar' ? 'اختر الولاية' : 'Choisir une wilaya')}</span>
                <span style={{ color:'var(--br)', fontSize:10, flexShrink:0, marginLeft:8 }}>{wilayaOpen?'▲':'▼'}</span>
              </div>
              {wilayaOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:99999, background:'var(--card2)', border:'1px solid #C9A84C', borderRadius:10, marginTop:4, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.9)' }}>
                  <div style={{ padding:8, borderBottom:'1px solid rgba(128,128,128,.22)', background:'rgba(255,255,255,.02)' }}>
                    <div style={{ position:'relative' }}>
                      <span aria-hidden="true" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:.7 }}>⌕</span>
                      <input
                        value={wilayaSearch}
                        onChange={e => setWilayaSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Escape') { setWilayaSearch(''); setWilayaOpen(false) } }}
                        autoFocus
                        placeholder={lang==='ar' ? 'ابحث عن ولاية…' : 'Rechercher une wilaya…'}
                        style={{ ...inp, height:42, padding:'10px 38px 10px 34px', fontSize:14, background:'rgba(0,0,0,.22)', border:'1px solid rgba(201,168,76,.22)', direction:'ltr' }}
                      />
                      {wilayaSearch && (
                        <button type="button" onClick={() => setWilayaSearch('')} aria-label="Effacer la recherche" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:28, height:28, border:'none', borderRadius:'50%', background:'rgba(128,128,128,.16)', color:'var(--g3)', cursor:'pointer', fontSize:15 }}>×</button>
                      )}
                    </div>
                    <div style={{ marginTop:6, padding:'0 3px', fontSize:10, color:'var(--g4)', fontWeight:700 }}>
                      {filteredWilayas.length} / {wilayasOptions.length} wilayas
                    </div>
                  </div>
                  <div style={{ maxHeight:220, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
                    {filteredWilayas.length > 0 ? filteredWilayas.map(opt => (
                      <div key={opt} onClick={() => { setF('wilaya',opt); setWilayaOpen(false); setWilayaSearch(''); setCommuneSearch('') }} style={{ padding:'12px 14px', fontSize:15, cursor:'pointer', color:opt===form.wilaya?'#C9A84C':'var(--g3)', background:opt===form.wilaya?'rgba(201,168,76,.1)':'transparent', borderBottom:'1px solid var(--g3)', touchAction:'manipulation' }}>
                        {opt}
                      </div>
                    )) : (
                      <div style={{ padding:'18px 14px', textAlign:'center', fontSize:12, color:'var(--g4)', fontWeight:700 }}>
                        {lang==='ar' ? 'لا توجد ولاية مطابقة' : 'Aucune wilaya trouvée'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Commune ── */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>{lang==='ar' ? 'البلدية' : 'Commune'} {communes.length>0&&`(${communes.length})`} *</label>
            <div style={{ position:'relative' }}>
              <div onClick={() => { if(form.wilaya){setCommuneOpen(o=>!o); setWilayaOpen(false)} }} style={{ ...inp, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:form.wilaya?'pointer':'not-allowed', opacity:form.wilaya?1:.5, color:form.commune?'var(--g3)':'var(--g4)' }}>
                <span>{form.commune||(form.wilaya?lang==='ar' ? 'اختر البلدية' : 'Choisir une commune':lang==='ar' ? 'اختر الولاية أولاً' : "Choisir d'abord une wilaya")}</span>
                <span style={{ color:'var(--br)', fontSize:10, flexShrink:0, marginLeft:8 }}>{communeOpen?'▲':'▼'}</span>
              </div>
              {communeOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:99999, background:'var(--card2)', border:'1px solid #C9A84C', borderRadius:10, marginTop:4, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.9)' }}>
                  <div style={{ padding:8, borderBottom:'1px solid rgba(128,128,128,.22)', background:'rgba(255,255,255,.02)' }}>
                    <div style={{ position:'relative' }}>
                      <span aria-hidden="true" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:.7 }}>⌕</span>
                      <input
                        value={communeSearch}
                        onChange={e => setCommuneSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Escape') { setCommuneSearch(''); setCommuneOpen(false) } }}
                        autoFocus
                        placeholder={lang==='ar' ? 'ابحث عن البلدية…' : 'Rechercher une commune…'}
                        style={{ ...inp, height:42, padding:'10px 38px 10px 34px', fontSize:14, background:'rgba(0,0,0,.22)', border:'1px solid rgba(201,168,76,.22)', direction:'ltr' }}
                      />
                      {communeSearch && (
                        <button type="button" onClick={() => setCommuneSearch('')} aria-label="Effacer la recherche" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:28, height:28, border:'none', borderRadius:'50%', background:'rgba(128,128,128,.16)', color:'var(--g3)', cursor:'pointer', fontSize:15 }}>×</button>
                      )}
                    </div>
                    <div style={{ marginTop:6, padding:'0 3px', fontSize:10, color:'var(--g4)', fontWeight:700 }}>
                      {filteredCommunes.length} / {communes.length} communes
                    </div>
                  </div>
                  <div style={{ maxHeight:220, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
                    {filteredCommunes.length > 0 ? filteredCommunes.map(opt => (
                      <div key={opt} onClick={() => { setF('commune',opt); setCommuneOpen(false); setCommuneSearch('') }} style={{ padding:'12px 14px', fontSize:15, cursor:'pointer', color:opt===form.commune?'#C9A84C':'var(--g3)', background:opt===form.commune?'rgba(201,168,76,.1)':'transparent', borderBottom:'1px solid var(--g3)', touchAction:'manipulation' }}>
                        {opt}
                      </div>
                    )) : (
                      <div style={{ padding:'18px 14px', textAlign:'center', fontSize:12, color:'var(--g4)', fontWeight:700 }}>
                        {lang==='ar' ? 'لا توجد بلدية مطابقة' : 'Aucune commune trouvée'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pp-form-section-title">
            <div className="pp-form-section-icon">👤</div>
            <div>
              <div>{lang==='ar' ? 'معلومات الاتصال' : 'Vos coordonnées'}</div>
              <small>{lang==='ar' ? 'Utilisées uniquement pour confirmer la commande' : 'Utilisées uniquement pour confirmer la commande'}</small>
            </div>
          </div>

          {/* ── Nom + Tel ── */}
          <div className="pp-contact-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>{lang==='ar' ? 'الاسم الكامل *' : 'Nom complet *' }</label>
              <input placeholder="Votre nom" value={form.nom} onChange={e => setF('nom',e.target.value)} onFocus={handleFocusScroll} style={inp} />
            </div>
            <div>
              <label style={lbl}>{lang==='ar' ? 'الهاتف *' : 'Téléphone *' }</label>
              <div style={{ position:'relative' }}>
                <input
                  placeholder="05 55 00 00 00"
                  value={form.tel}
                  onChange={e => setF('tel', formatAlgerianPhone(e.target.value))}
                  onFocus={handleFocusScroll}
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={14}
                  aria-invalid={telError}
                  style={{
                    ...inp,
                    paddingRight: telValid ? 42 : inp.padding,
                    border: `1px solid ${telError ? '#ef4444' : telValid ? 'rgba(34,197,94,.55)' : '#2a2a2a'}`,
                    boxShadow: telValid ? '0 0 0 3px rgba(34,197,94,.06)' : 'none',
                    animation: telShake ? 'ppTelShake .5s' : 'none'
                  }}
                  type="tel"
                />
                {telValid && (
                  <span
                    aria-hidden="true"
                    style={{
                      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      width:22, height:22, borderRadius:'50%', background:'#22c55e', color:'#06120a',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, fontWeight:900, pointerEvents:'none'
                    }}
                  >✓</span>
                )}
              </div>
              {telDigits.length > 0 && telDigits.length < 10 && !telError && (
                <div style={{ color:'var(--g4)', fontSize:10, marginTop:5 }}>
                  {lang==='ar' ? `${10 - telDigits.length} أرقام متبقية` : `${10 - telDigits.length} chiffre${10 - telDigits.length > 1 ? 's' : ''} restant${10 - telDigits.length > 1 ? 's' : ''}`}
                </div>
              )}
              {telError && (
                <div style={{ color:'#fca5a5', fontSize:11, marginTop:5 }}>
                  {lang==='ar' ? '⚠️ رقم غير صحيح — 10 أرقام' : '⚠️ Numéro invalide — 10 chiffres'}
                </div>
              )}
            </div>
          </div>

          <style>{`@keyframes ppTelShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }`}</style>

          {/* Adresse */}
          {/* ── Mode de paiement : affiché uniquement si un paiement en ligne est activé ── */}
          {(paiementInfo.ccp_actif || paiementInfo.baridimob_actif) && (
            <>
              <div className="pp-form-section-title pp-payment-title">
                <div className="pp-form-section-icon">💳</div>
                <div>
                  <div>{lang==='ar' ? 'طريقة الدفع' : 'Paiement'}</div>
                  <small>{lang==='ar' ? 'Choisis ton mode de paiement préféré' : 'Choisis ton mode de paiement préféré'}</small>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
              <label style={lbl}>{lang==='ar' ? 'طريقة الدفع' : 'Mode de paiement'}</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

                {/* Paiement à la livraison — toujours dispo */}
                <div onClick={() => setModePaiement('livraison')} style={{
                  display:'flex', alignItems:'center', gap:12,
                  background: modePaiement==='livraison' ? 'rgba(34,197,94,.08)' : 'var(--card2)',
                  border:`2px solid ${modePaiement==='livraison' ? '#22c55e' : '#2a2a2a'}`,
                  borderRadius:10, padding:'11px 14px', cursor:'pointer', transition:'all .2s',
                }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${modePaiement==='livraison'?'#22c55e':'var(--g3)'}`, background:modePaiement==='livraison'?'#22c55e':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {modePaiement==='livraison' && <span style={{ fontSize:11, color:'#000', fontWeight:900 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--g3)' }}>💵 {lang==='ar' ? 'الدفع عند الاستلام' : 'Paiement à la livraison'}</div>
                    <div style={{ fontSize:11, color:'var(--g3)' }}>{lang==='ar' ? 'تدفع عند استلام الطرد' : 'Tu paies quand tu reçois le colis'}</div>
                  </div>
                </div>

                {/* BaridiMob */}
                {paiementInfo.baridimob_actif && paiementInfo.baridimob && (
                  <div onClick={() => setModePaiement('baridimob')} style={{
                    display:'flex', alignItems:'center', gap:12,
                    background: modePaiement==='baridimob' ? 'rgba(59,130,246,.08)' : 'var(--card2)',
                    border:`2px solid ${modePaiement==='baridimob' ? '#3b82f6' : '#2a2a2a'}`,
                    borderRadius:10, padding:'11px 14px', cursor:'pointer', transition:'all .2s',
                  }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${modePaiement==='baridimob'?'#3b82f6':'var(--g3)'}`, background:modePaiement==='baridimob'?'#3b82f6':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {modePaiement==='baridimob' && <span style={{ fontSize:11, color:'#fff', fontWeight:900 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--g3)' }}>📱 BaridiMob</div>
                      <div style={{ fontSize:11, color:'var(--g3)' }}>{lang==='ar' ? 'دفع فوري عبر التطبيق' : 'Paiement instantané via l\'appli'}</div>
                    </div>
                  </div>
                )}

                {/* CCP */}
                {paiementInfo.ccp_actif && paiementInfo.ccp && (
                  <div onClick={() => setModePaiement('ccp')} style={{
                    display:'flex', alignItems:'center', gap:12,
                    background: modePaiement==='ccp' ? 'rgba(201,168,76,.08)' : 'var(--card2)',
                    border:`2px solid ${modePaiement==='ccp' ? '#C9A84C' : '#2a2a2a'}`,
                    borderRadius:10, padding:'11px 14px', cursor:'pointer', transition:'all .2s',
                  }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${modePaiement==='ccp'?'#C9A84C':'var(--g3)'}`, background:modePaiement==='ccp'?'#C9A84C':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {modePaiement==='ccp' && <span style={{ fontSize:11, color:'#000', fontWeight:900 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--g3)' }}>🏦 {lang==='ar' ? 'تحويل CCP' : 'Virement CCP'}</div>
                      <div style={{ fontSize:11, color:'var(--g3)' }}>{lang==='ar' ? 'بريد الجزائر' : 'Algeria Post'}</div>
                    </div>
                  </div>
                )}

                {/* Instructions BaridiMob */}
                {modePaiement === 'baridimob' && (
                  <div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#93c5fd', marginBottom:8 }}>
                      📱 {lang==='ar' ? 'كيفية الدفع عبر بريدي موب' : 'Comment payer avec BaridiMob'}
                    </div>
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontSize:11, color:'var(--g4)', fontWeight:800, marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em' }}>
                        {lang==='ar' ? 'رقم الحساب' : 'Numéro de compte'}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(59,130,246,.07)', border:'1px solid rgba(59,130,246,.18)', borderRadius:10, padding:'8px 10px' }}>
                        <span style={{ flex:1, fontFamily:'monospace', fontSize:16, color:'#93c5fd', fontWeight:900, letterSpacing:'.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{paiementInfo.baridimob}</span>
                        <button type="button" onClick={() => copyPaymentNumber(paiementInfo.baridimob, 'baridimob')} style={{ flexShrink:0, border:'1px solid rgba(147,197,253,.22)', background:'rgba(147,197,253,.08)', color:'#bfdbfe', borderRadius:8, padding:'7px 9px', fontSize:10, fontWeight:800, cursor:'pointer' }}>
                          {copiedPayment==='baridimob' ? '✓ Copié' : 'Copier'}
                        </button>
                      </div>
                    </div>
                    <ol style={{ fontSize:11, color:'var(--g3)', marginBottom:10, paddingLeft:16, lineHeight:1.8 }}>
                      <li>{lang==='ar' ? 'افتح تطبيق بريدي موب' : 'Ouvre l\'application BaridiMob'}</li>
                      <li>{lang==='ar' ? `أرسل ${fmt(totalFinal)} إلى الرقم أعلاه` : `Envoie ${fmt(totalFinal)} au numéro ci-dessus`}</li>
                      <li>{lang==='ar' ? 'أرسل لقطة شاشة الإيصال عبر واتساب' : 'Envoie la capture du reçu sur WhatsApp'}</li>
                    </ol>
                    <input
                      placeholder={lang==='ar' ? 'رقم العملية (اختياري)' : 'Numéro de transaction (optionnel)'}
                      value={preuvePaiement}
                      onChange={e => setPreuvePaiement(e.target.value)}
                      style={{ ...inp, fontSize:13 }}
                    />
                  </div>
                )}

                {/* Instructions CCP */}
                {modePaiement === 'ccp' && (
                  <div style={{ background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'var(--br)', marginBottom:6 }}>
                      🏦 {lang==='ar' ? 'معلومات التحويل' : 'Informations pour le virement'}
                    </div>
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontSize:11, color:'var(--g4)', fontWeight:800, marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em' }}>
                        {lang==='ar' ? 'رقم CCP' : 'Numéro CCP'}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(201,168,76,.06)', border:'1px solid rgba(201,168,76,.16)', borderRadius:10, padding:'8px 10px' }}>
                        <span style={{ flex:1, fontFamily:'monospace', fontSize:15, color:'var(--br)', fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{paiementInfo.ccp}</span>
                        <button type="button" onClick={() => copyPaymentNumber(paiementInfo.ccp, 'ccp')} style={{ flexShrink:0, border:'1px solid rgba(201,168,76,.22)', background:'rgba(201,168,76,.08)', color:'var(--br)', borderRadius:8, padding:'7px 9px', fontSize:10, fontWeight:800, cursor:'pointer' }}>
                          {copiedPayment==='ccp' ? '✓ Copié' : 'Copier'}
                        </button>
                      </div>
                    </div>
                    {paiementInfo.ccp_nom && (
                      <div style={{ fontSize:12, color:'var(--g3)', marginBottom:8 }}>
                        <strong>{lang==='ar' ? 'الاسم:' : 'Au nom de:'}</strong> {paiementInfo.ccp_nom}
                      </div>
                    )}
                    <input
                      placeholder={lang==='ar' ? 'رقم الإيصال (اختياري)' : 'Numéro du reçu (optionnel)'}
                      value={preuvePaiement}
                      onChange={e => setPreuvePaiement(e.target.value)}
                      style={{ ...inp, fontSize:13 }}
                    />
                  </div>
                )}
              </div>
              </div>
            </>
          )}

          {modeLiv==='domicile' && (
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>{lang==='ar' ? 'العنوان' : 'Adresse' }</label>
              <input placeholder="Rue, quartier, N°..." value={form.adresse} onChange={e => setF('adresse',e.target.value)} onFocus={handleFocusScroll} style={inp} />
            </div>
          )}

          {/* ── Récap prix ── */}
          {form.wilaya && (
            <div style={{ background:'rgba(201,168,76,.08)', borderRadius:12, padding:'12px 14px', marginBottom:16, border:'1px solid rgba(201,168,76,.25)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--g3)', marginBottom:6 }}>
                <span>🛍️ Prix produit</span><span>{fmt(checkoutSubtotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--g3)', marginBottom:8 }}>
                <span>🚚 Frais livraison</span>
                <span style={{ color:fraisLiv===0?'#22c55e':undefined }}>{fraisLiv===null?'—':fraisLiv===0?lang==='ar' ? 'مجاناً' : 'Gratuit':fmt(fraisLiv)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:'1px solid var(--g3)', fontSize:17, fontWeight:900, color:'var(--g3)' }}>
                <span>💰 Total à payer</span>
                <span style={{ color:'var(--br)' }}>{fmt(totalFinal)}</span>
              </div>
            </div>
          )}

          {/* Anti-bot — invisible pour les humains */}
          <input
            type="text" name="website" value={form.website}
            onChange={e => setF('website', e.target.value)}
            style={{ position:'absolute', left:'-9999px', width:1, height:1, opacity:0 }}
            tabIndex={-1} autoComplete="off"
          />

          {/* ── Bouton confirmer ── */}
          <button
            onClick={handleOrder}
            disabled={!canOrder || ordering}
            style={{
              width:'100%', padding:'16px',
              background: canOrder ? 'linear-gradient(135deg,#C9A84C,#E9C46A)' : '#222',
              border:'none', borderRadius:14,
              color: canOrder ? '#000' : '#444',
              fontSize:16, fontWeight:900, cursor: canOrder ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all .3s', position:'relative', overflow:'hidden',
            }}
          >
            {canOrder && !ordering && (
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,var(--g3),transparent)', animation:'shimmer 2s infinite', backgroundSize:'200% 100%' }} />
            )}
            <span style={{ position:'relative', zIndex:1 }}>
              {ordering ? '⏳ Envoi en cours…'
                : outOfStock ? '🚫 Épuisé'
                : hasBundles && selectedBundle===null ? '⬆️ Choisir une offre ci-dessus'
                : '🛒 Confirmer la commande'}
            </span>
          </button>
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:12, flexWrap:'wrap' }}>
            {[
              { icon:'✅', label: lang==='ar' ? 'دفع عند الاستلام' : 'Paiement livraison' },
              { icon:'🔄', label: lang==='ar' ? 'إرجاع مجاني' : 'Retour gratuit' },
              { icon:'🚚', label: lang==='ar' ? 'توصيل لكل الولايات' : '69 wilayas' },
            ].map(b => (
              <div key={b.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <span style={{ fontSize:18 }}>{b.icon}</span>
                <span style={{ fontSize:9, color:'var(--g3)', fontWeight:700, textAlign:'center' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </>
  )

  const canOrder = form.nom && form.tel && form.wilaya && form.commune && (checkoutOnly ? Array.isArray(checkoutItems) && checkoutItems.length > 0 : !outOfStock && (!hasBundles || selectedBundle !== null))

  if (checkoutOnly) {
    return (
      <div className="pp-root" style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:400, background: p.card_color || 'var(--bk, #0a0a0a)', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(8,8,8,.94)', backdropFilter:'blur(24px) saturate(150%)', WebkitBackdropFilter:'blur(24px) saturate(150%)', borderBottom:'1px solid rgba(201,168,76,.18)', display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
          <button onClick={onClose} style={{ background:'var(--card2)', border:'1px solid rgba(128,128,128,.25)', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--g3)', fontSize:18, flexShrink:0 }}>✕</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, color:'var(--g3)', fontWeight:800 }}>{lang==='ar' ? 'تأكيد الطلب' : 'Finaliser la commande'}</div>
            <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>{lang==='ar' ? 'نفس نموذج الطلب في كل Wazyo' : 'Un seul formulaire de commande Wazyo'}</div>
          </div>
          <span style={{ fontSize:10, color:'#86efac', fontWeight:800 }}>COD</span>
        </div>
        <div style={{ maxWidth:720, margin:'0 auto', padding:'14px 0 32px' }}>
          {renderOrderForm()}
        </div>
      </div>
    )
  }

  return (
    <div className="pp-root" style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:300, background: p.card_color || 'var(--bk, #0a0a0a)', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

      {/* ── Header sticky ── */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(8,8,8,.90)', backdropFilter:'blur(24px) saturate(150%)', WebkitBackdropFilter:'blur(24px) saturate(150%)', borderBottom:'1px solid rgba(201,168,76,.18)', boxShadow:'0 10px 30px rgba(0,0,0,.18)', display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
        <div aria-hidden="true" style={{ position:'absolute', left:0, right:0, bottom:-1, height:2, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
          <div style={{ width:`${scrollProgress}%`, height:'100%', background:'linear-gradient(90deg,#C9A84C,#E9C46A)', boxShadow:'0 0 10px rgba(201,168,76,.45)', transition:'width .12s linear' }} />
        </div>
        <button onClick={onClose} style={{ background:'var(--card2)', border:'1px solid rgba(128,128,128,.25)', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--g3)', fontSize:18, flexShrink:0 }}>✕</button>
        <span style={{ fontSize:13, color:'var(--g3)', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Détail produit</span>
        {p.badge && <span style={{ background:'#C9A84C', color:'#000', fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6, flexShrink:0 }}>{p.badge}</span>}
      </div>

      <div className="pp-page">

      {/* ── Carrousel images en haut — swipe gauche/droite ── */}
      {imgs.length > 0 ? (
        <div ref={topRef} data-img-swipe className="pp-media" style={{ position:'relative', background:'var(--card)', lineHeight:0 }}>
          {/* Image affichée */}
          <img
            key={imgIdx}
            src={imgs[imgIdx]?.url || mainImg}
            alt={p.nom}
            style={{ width:'100%', maxHeight:380, objectFit:'cover', display:'block', animation:'imgIn .2s ease' }}
            onClick={() => setLb(true)}
          />
          {/* Flèches */}
          {imgs.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i-1+imgs.length)%imgs.length) }}
              style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:36, height:36, color:'var(--g3)', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i+1)%imgs.length) }}
              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:36, height:36, color:'var(--g3)', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 }}>›</button>
            {/* Points */}
            <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5, zIndex:3 }}>
              {imgs.map((_,i) => (
                <div key={i} onClick={() => setImgIdx(i)} style={{ width:i===imgIdx?18:6, height:6, borderRadius:3, background:i===imgIdx?'#C9A84C':'var(--g3)', transition:'all .25s', cursor:'pointer' }} />
              ))}
            </div>
          </>}
          {outOfStock && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fca5a5' }}>ÉPUISÉ</div>}
          {lowStock && !outOfStock && <div style={{ position:'absolute', bottom:32, left:10, background:'rgba(239,68,68,.92)', color:'var(--g3)', fontSize:11, fontWeight:800, padding:'3px 8px', borderRadius:6 }}>🔥 Plus que {p.stock}</div>}
          {imgs.length > 1 && <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.55)', color:'var(--g3)', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, zIndex:3 }}>{imgIdx+1}/{imgs.length}</div>}
        </div>
      ) : (
        <div ref={topRef} className="pp-media pp-media-empty" style={{ height:280, background:'var(--card)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:80 }}>{p.emoji||'📦'}</span>
        </div>
      )}

      {/* Miniatures scrollables */}
      {imgs.length > 1 && (
        <div style={{ display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', scrollbarWidth:'none', background:'var(--card)' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{ width:60, height:60, borderRadius:8, overflow:'hidden', border:`2px solid ${imgIdx===i?'#C9A84C':'var(--g3)'}`, cursor:'pointer', flexShrink:0, transition:'all .2s', transform:imgIdx===i?'scale(1.06)':'scale(1)' }}>
              <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Vidéo produit si disponible ── */}
      {p.video_url && (() => {
        const embed = getEmbedUrl(p.video_url)
        if (!embed) return null

        if (embed.type === 'external') {
          const isTikTok = embed.src.includes('tiktok')
          const isInsta  = embed.src.includes('instagram')
          const icon = isTikTok ? '🎵' : isInsta ? '📸' : '▶️'
          const platform = isTikTok ? 'TikTok' : isInsta ? 'Instagram' : 'Voir la vidéo'
          const color = isTikTok ? 'rgba(0,0,0,.8)' : isInsta ? 'rgba(131,58,180,.3)' : 'rgba(255,0,0,.1)'
          const borderColor = isTikTok ? 'var(--g3)' : isInsta ? 'rgba(131,58,180,.4)' : 'rgba(255,0,0,.2)'
          return (
            <a href={embed.src} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'16px', background:color, border:`1px solid ${borderColor}`, margin:'0 12px', borderRadius:14, textDecoration:'none', flexShrink:0 }}>
              <div style={{ width:52, height:52, borderRadius:12, background:'rgba(128,128,128,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:900, color:'var(--g3)', marginBottom:3 }}>Voir la vidéo {platform}</div>
                <div style={{ fontSize:11, color:'var(--g3)', lineHeight:1.4 }}>Appuie pour regarder la vidéo du produit sur {platform}</div>
              </div>
              <div style={{ fontSize:20, color:'var(--g3)', flexShrink:0 }}>›</div>
            </a>
          )
        }

        return (
          <div style={{ flexShrink:0 }}>
            <div style={{ background:'var(--bk)', position:'relative', paddingBottom: embed.type==='tiktok' ? '177%' : '56.25%', overflow:'hidden' }}>
              <iframe
                src={embed.src}
                style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        )
      })()}

      {/* ── Infos produit ── */}
      <div className="pp-info" style={{ padding:'18px 16px 0' }}>
        <h1 className="pp-title" style={{ margin:'0 0 10px', fontSize:20, fontWeight:900, color:'var(--g3)', lineHeight:1.3 }}>{p.nom}</h1>

        {/* Étoiles + commandes */}
        {(p.note_etoiles || p.nb_commandes > 0) && (
          <div className="pp-meta" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            {p.note_etoiles && (
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ fontSize:16, color: i <= Math.round(p.note_etoiles) ? '#F9A825' : 'var(--g3)' }}>★</span>
                ))}
                <span style={{ fontSize:13, fontWeight:800, color:'#F9A825', marginLeft:3 }}>{Number(p.note_etoiles).toFixed(1)}</span>
              </div>
            )}
            {p.nb_commandes > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:20, padding:'3px 10px' }}>
                <span style={{ fontSize:13 }}>📦</span>
                <span style={{ fontSize:12, fontWeight:800, color:'var(--g3)' }}>{p.nb_commandes.toLocaleString()} commandes</span>
              </div>
            )}
          </div>
        )}

        {/* Prix + bouton Commander immédiat */}
        <div className="pp-price-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <span className="pp-price" style={{ fontSize:32, fontWeight:900, color:'var(--br)' }}>{fmt(p.prix)}</span>
            {p.prix_old && p.prix_old > p.prix && <>
              <span style={{ fontSize:15, color:'var(--g4)', textDecoration:'line-through' }}>{fmt(p.prix_old)}</span>
              <span className="pp-discount" style={{ background:'#ef4444', color:'var(--g3)', fontSize:11, fontWeight:900, padding:'4px 9px', borderRadius:999 }}>-{disc}%</span>
              <span className="pp-save" style={{ background:'rgba(34,197,94,.10)', border:'1px solid rgba(34,197,94,.22)', color:'#86efac', fontSize:10, fontWeight:900, padding:'4px 8px', borderRadius:999, whiteSpace:'nowrap' }}>Économisez {fmt(p.prix_old - p.prix)}</span>
            </>}
          </div>
          {!outOfStock && (
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })}
              style={{
                background:'linear-gradient(135deg,#C9A84C,#E9C46A)', border:'none', borderRadius:10,
                padding:'11px 20px', color:'#000', fontSize:13, fontWeight:900, cursor:'pointer',
                whiteSpace:'nowrap', flexShrink:0,
              }}
            >{lang==='ar' ? '🛒 اطلب الآن' : '🛒 Commander'}</button>
          )}
        </div>

        <div className="pp-trust-grid">
          <div className="pp-trust-item"><span>🚚</span><div><strong>69 wilayas</strong><small>Livraison nationale</small></div></div>
          <div className="pp-trust-item"><span>💳</span><div><strong>Paiement à la livraison</strong><small>Simple et pratique</small></div></div>
          <div className="pp-trust-item"><span>✅</span><div><strong>Commande sécurisée</strong><small>Validation par téléphone</small></div></div>
        </div>

        {/* 🔥 Barre de progression stock — urgence */}
        {p.stock_initial > 0 && p.stock !== null && p.stock !== undefined && (() => {
          const vendus = Math.max(0, p.stock_initial - p.stock)
          const pct = Math.min(100, Math.round((vendus / p.stock_initial) * 100))
          if (vendus <= 0) return null
          return (
            <div style={{ marginBottom:14, background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#fca5a5' }}>🔥 {vendus} vendus sur {p.stock_initial}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--g4)' }}>{pct}%</span>
              </div>
              <div style={{ height:7, background:'rgba(255,255,255,.08)', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${pct}%`,
                  background:'linear-gradient(90deg,#f97316,#ef4444)',
                  borderRadius:4, transition:'width .5s ease',
                  animation: pct >= 70 ? 'stockGlow 1.8s ease-in-out infinite' : 'none',
                }} />
              </div>
            </div>
          )
        })()}

        {/* Disponibilité réelle */}
        {!outOfStock && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:10, padding:'6px 10px', borderRadius:999, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 4px rgba(34,197,94,.08)', flexShrink:0 }} />
            <span style={{ fontSize:11, color:'#86efac', fontWeight:800 }}>
              {p.stock !== null && p.stock !== undefined ? `Disponible — ${p.stock} en stock` : 'Disponible maintenant'}
            </span>
          </div>
        )}
      </div>

      {/* ── Description ── */}
      {p.description && (
        <div className="pp-section pp-description" style={{ padding:'0 16px 16px' }}>
          <div style={{ fontSize:14, color:'var(--g3)', lineHeight:1.8 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.description || '') }} />
        </div>
      )}

      {/* ── Caractéristiques ── */}
      {specs.length > 0 && (
        <div className="pp-section pp-specs" style={{ padding:'0 16px 16px' }}>
          {specs.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
              <span style={{ color:'var(--br)', fontWeight:900, fontSize:14, flexShrink:0, marginTop:1 }}>✓</span>
              <span style={{ color:'var(--g3)', fontSize:14, lineHeight:1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── GALERIE VERTICALE — photos séparées du carrousel ── */}
      {imgsGallery.length > 0 && (
        <div className="pp-gallery" style={{ lineHeight:0, margin:0, padding:0 }}>
          {imgsGallery.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt=""
              loading="lazy"
              style={{
                width:'100%',
                display:'block',
                objectFit: img.type === 'gif' ? 'contain' : 'cover',
                margin:0, padding:0, lineHeight:0,
                background: img.type === 'gif' ? '#000' : 'transparent',
              }}
            />
          ))}
        </div>
      )}

      {/* ── FAQ ── */}
      {faq.length > 0 && (
        <div className="pp-section pp-faq" style={{ padding:'0 16px 16px' }}>
          <h3 style={{ fontSize:16, fontWeight:900, color:'var(--g3)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>❓ Questions fréquentes</h3>
          {faq.map((item,i) => {
            const isOpen = openFaq === i
            return (
              <div key={i} className={`pp-faq-item${isOpen ? ' is-open' : ''}`}>
                <button
                  className="pp-faq-q"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span className="pp-faq-chevron" aria-hidden="true">⌄</span>
                </button>
                {isOpen && (
                  <div className="pp-faq-a">
                    {item.r}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {renderOrderForm()}

      {/* ── Partager le produit ── */}
      <div className="pp-share-label" style={{ padding:'0 16px 16px', display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ flex:1, height:1, background:'rgba(128,128,128,.25)' }} />
        <span style={{ fontSize:11, color:'var(--g3)', fontWeight:700 }}>PARTAGER</span>
        <div style={{ flex:1, height:1, background:'rgba(128,128,128,.25)' }} />
      </div>
      <div className="pp-share-actions" style={{ display:'flex', gap:10, padding:'0 16px 20px' }}>
        <a
          href={`https://wa.me/?text=${encodeURIComponent((lang==='ar'?'اطلع على هذا المنتج: ':'Découvrez ce produit: ') + p.nom + ' - ' + window.location.href)}`}
          target="_blank" rel="noreferrer"
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'rgba(37,211,102,.12)', border:'1px solid rgba(37,211,102,.25)', borderRadius:12, padding:'11px', color:'#86efac', fontSize:12, fontWeight:800, textDecoration:'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
          {lang==='ar' ? 'مشاركة عبر واتساب' : 'Partager WhatsApp'}
        </a>
        <button
          onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'var(--card2)', border:'1px solid rgba(128,128,128,.25)', borderRadius:12, padding:'11px 16px', color:'var(--g3)', fontSize:12, fontWeight:800, cursor:'pointer' }}
        >🔗 {lang==='ar' ? 'نسخ الرابط' : 'Copier lien'}</button>
      </div>

      {/* ── Liens utiles ── */}
      <div style={{ display:'flex', gap:16, justifyContent:'center', padding:'0 16px 16px', flexWrap:'wrap' }}>
        {[
          { label: lang==='ar' ? 'سياسة الخصوصية' : '🔒 Politique de confidentialité', tab:'confidentialite' },
          { label: lang==='ar' ? 'سياسة الإرجاع' : '🔄 Politique de retour', tab:'retour' },
        ].map(item => (
          <button key={item.tab} onClick={() => onPolitique && onPolitique(item.tab)} style={{ background:'none', border:'none', color:'var(--g3)', fontSize:11, cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3, padding:0, transition:'color .2s' }}
            onMouseEnter={e => e.target.style.color='#C9A84C'}
            onMouseLeave={e => e.target.style.color='var(--g3)'}
          >{item.label}</button>
        ))}
      </div>

      {/* ── Produits similaires ── */}
      {(allProducts||[]).filter(x=>x.id!==p.id&&x.categorie===p.categorie&&x.is_active).slice(0,4).length > 0 && (
        <div className="pp-similar" style={{ padding:'0 16px 100px' }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:'var(--g3)', letterSpacing:'.06em', marginBottom:12 }}>VOUS AIMEREZ AUSSI</h3>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
            {(allProducts||[]).filter(x=>x.id!==p.id&&x.categorie===p.categorie&&x.is_active).slice(0,4).map(sim => (
              <div key={sim.id} onClick={onClose} className="pp-sim-card" style={{ background:'var(--card)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, overflow:'hidden', cursor:'pointer', width:142, flexShrink:0 }}>
                <div style={{ height:90, background:'var(--card2)', overflow:'hidden' }}>
                  {sim.img ? <img src={sim.img} alt={sim.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{sim.emoji||'📦'}</div>}
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <div style={{ fontSize:11, color:'var(--g3)', fontWeight:700, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sim.nom}</div>
                  <div style={{ fontSize:12, color:'var(--br)', fontWeight:800 }}>{fmt(sim.prix)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* ── Sticky CTA mobile premium ── */}
      <div className="pp-sticky" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:200,
        background:'linear-gradient(180deg,rgba(14,14,14,.96),rgba(8,8,8,.99))',
        backdropFilter:'blur(24px) saturate(150%)', WebkitBackdropFilter:'blur(24px) saturate(150%)',
        borderTop:'1px solid rgba(201,168,76,.22)',
        padding:'9px 12px calc(10px + env(safe-area-inset-bottom))',
        display:'flex', alignItems:'center', gap:10,
        transform: stickyVisible ? 'translateY(0)' : 'translateY(110%)',
        transition:'transform .28s cubic-bezier(.22,1,.36,1)',
        boxShadow:'0 -10px 34px rgba(0,0,0,.65)',
      }}>
        {(p.img||(imgs[0]?.url)) && (
          <img
            src={p.img||(imgs[0]?.url)}
            alt=""
            style={{ width:44, height:44, borderRadius:10, objectFit:'cover', flexShrink:0, border:'1px solid rgba(255,255,255,.08)' }}
          />
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
            <span style={{ fontSize:11, color:'var(--g4)', fontWeight:700, whiteSpace:'nowrap' }}>Votre commande</span>
            <span style={{ width:4, height:4, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
            <span style={{ fontSize:11, color:'#86efac', fontWeight:800, whiteSpace:'nowrap' }}>COD</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:7, minWidth:0, marginTop:1 }}>
            <span style={{ fontSize:15, color:'var(--g3)', fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {p.nom}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:1 }}>
            <span style={{ fontSize:14, color:'var(--br)', fontWeight:900 }}>
              {form.wilaya && fraisLiv !== null ? fmt(totalFinal) : fmt(activeBundle ? activeBundle.prix : p.prix)}
            </span>
            <span style={{ fontSize:9, color:'var(--g4)', fontWeight:700 }}>
              {form.wilaya && fraisLiv !== null ? 'total' : 'hors livraison'}
            </span>
          </div>
        </div>
        <button
          disabled={outOfStock}
          onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })}
          style={{
            minWidth:132, background:outOfStock?'#2a2a2a':'linear-gradient(135deg,#C9A84C,#E9C46A)',
            border:'none', borderRadius:13, padding:'12px 14px',
            color:outOfStock?'#666':'#000', fontSize:13, fontWeight:900,
            cursor:outOfStock?'not-allowed':'pointer', flexShrink:0,
            whiteSpace:'nowrap', boxShadow:outOfStock?'none':'0 6px 18px rgba(201,168,76,.18)'
          }}
        >
          {outOfStock ? '🚫 Épuisé' : '🛒 Commander maintenant'}
        </button>
      </div>

      {/* Lightbox */}
      {lb && imgs.length > 0 && (
        <div onClick={() => setLb(false)} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.97)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={imgs[imgIdx]?.url} alt="" style={{ maxWidth:'100%', maxHeight:'90vh', objectFit:'contain' }} />
          <button onClick={() => setLb(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(30,30,30,.85)', border:'1px solid rgba(255,255,255,.2)', borderRadius:'50%', width:44, height:44, color:'#fff', fontSize:20, cursor:'pointer' }}>✕</button>
          {imgs.length > 1 && <>
            <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+imgs.length)%imgs.length)}} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(30,30,30,.85)', border:'1px solid rgba(255,255,255,.2)', borderRadius:'50%', width:48, height:48, color:'#fff', fontSize:26, cursor:'pointer' }}>‹</button>
            <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%imgs.length)}} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(30,30,30,.85)', border:'1px solid rgba(255,255,255,.2)', borderRadius:'50%', width:48, height:48, color:'#fff', fontSize:26, cursor:'pointer' }}>›</button>
          </>}
        </div>
      )}

      <style>{`

        .pp-page{width:min(1180px,100%);margin:0 auto;background:linear-gradient(180deg,rgba(255,255,255,.018),transparent 24%);border-left:1px solid rgba(255,255,255,.025);border-right:1px solid rgba(255,255,255,.025)}
        .pp-media{overflow:hidden;box-shadow:inset 0 -40px 50px rgba(0,0,0,.2)}
        .pp-media img{transition:transform .45s ease,filter .35s ease}
        .pp-media:hover img{transform:scale(1.012);filter:saturate(1.03)}
        .pp-info{max-width:920px;margin:0 auto}
        .pp-title{letter-spacing:-.02em}
        .pp-price-row{background:linear-gradient(180deg,rgba(201,168,76,.07),rgba(201,168,76,.015));border:1px solid rgba(201,168,76,.16);border-radius:16px;padding:14px 16px}
        .pp-trust-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 16px}
        .pp-trust-item{display:flex;align-items:center;gap:8px;padding:10px 11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);border-radius:12px;min-width:0}
        .pp-trust-item>span{font-size:20px;flex-shrink:0}
        .pp-trust-item strong{display:block;font-size:10px;color:var(--g3);font-weight:900;line-height:1.2}
        .pp-trust-item small{display:block;font-size:9px;color:var(--g4);margin-top:2px;line-height:1.2}
        .pp-section{max-width:920px;margin:0 auto}
        .pp-description,.pp-specs,.pp-faq{background:linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,.008));border-top:1px solid rgba(255,255,255,.055)}

        .pp-faq-item{margin-bottom:8px;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.018);transition:border-color .22s ease,box-shadow .22s ease,transform .22s ease}
        .pp-faq-item:hover{border-color:rgba(201,168,76,.26);box-shadow:0 8px 24px rgba(0,0,0,.14)}
        .pp-faq-item.is-open{border-color:rgba(201,168,76,.34);box-shadow:0 10px 28px rgba(0,0,0,.18)}
        .pp-faq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--card);border:0;padding:14px 14px;color:var(--g3);font-size:13px;font-weight:800;cursor:pointer;text-align:left;transition:background .22s ease,color .22s ease}
        .pp-faq-q:hover{background:rgba(201,168,76,.06)}
        .pp-faq-item.is-open .pp-faq-q{background:linear-gradient(135deg,rgba(201,168,76,.13),rgba(201,168,76,.045));color:#fff}
        .pp-faq-chevron{color:var(--br);font-size:20px;line-height:1;flex-shrink:0;transform:rotate(0deg);transition:transform .22s ease}
        .pp-faq-item.is-open .pp-faq-chevron{transform:rotate(180deg)}
        .pp-faq-a{background:var(--card);padding:0 14px 14px;color:var(--g3);font-size:13px;line-height:1.7;border-top:1px solid rgba(201,168,76,.12);animation:faqIn .22s ease both}
        .pp-order-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:0 0 18px;padding:10px 4px 2px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.018);border-radius:14px}
        .pp-order-step{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0}
        .pp-order-step-line{position:absolute;top:13px;left:calc(-50% + 14px);width:calc(100% - 8px);height:1px;background:rgba(255,255,255,.1);z-index:0}
        .pp-order-step:first-child .pp-order-step-line{display:none}
        .pp-order-step-dot{position:relative;z-index:1;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--card2);border:1px solid rgba(255,255,255,.16);color:var(--g4);font-size:11px;font-weight:900;transition:all .2s ease}
        .pp-order-step-label{max-width:100%;padding:0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--g4);font-size:9px;font-weight:800;text-align:center}
        .pp-order-step.is-done .pp-order-step-dot{background:#22c55e;border-color:#22c55e;color:#04130a;box-shadow:0 0 0 3px rgba(34,197,94,.08)}
        .pp-order-step.is-done .pp-order-step-label{color:#86efac}
        .pp-order-step.is-done .pp-order-step-line{background:rgba(34,197,94,.38)}
        .pp-order-step.is-active .pp-order-step-dot{background:linear-gradient(135deg,#C9A84C,#E9C46A);border-color:#C9A84C;color:#000;box-shadow:0 0 0 4px rgba(201,168,76,.08),0 0 16px rgba(201,168,76,.16)}
        .pp-order-step.is-active .pp-order-step-label{color:#E9C46A}
        @media (max-width:640px){.pp-order-steps{margin-bottom:16px;padding:9px 3px 1px}.pp-order-step-label{font-size:8px}.pp-order-step-dot{width:24px;height:24px;font-size:10px}.pp-order-step-line{top:12px;left:calc(-50% + 12px);width:calc(100% - 6px)}}
        .pp-gallery{max-width:920px;margin:0 auto}
        .pp-order-card{max-width:920px;margin:0 auto 18px!important;box-shadow:0 18px 50px rgba(0,0,0,.22)}
        .pp-share-label{max-width:920px;margin:0 auto;padding-top:4px!important}
        .pp-share-actions{max-width:920px;margin:0 auto}
        .pp-similar{max-width:920px;margin:0 auto}
        .pp-sim-card{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
        .pp-sim-card:hover{transform:translateY(-3px);border-color:rgba(201,168,76,.35)!important;box-shadow:0 10px 26px rgba(0,0,0,.2)}
        .pp-sticky{backdrop-filter:blur(24px) saturate(150%)!important;-webkit-backdrop-filter:blur(24px) saturate(150%)!important}
        .pp-form-section-title{display:flex;align-items:center;gap:10px;margin:18px 0 10px;padding:10px 12px;border:1px solid rgba(201,168,76,.12);border-left:3px solid #C9A84C;border-radius:12px;background:linear-gradient(90deg,rgba(201,168,76,.065),rgba(255,255,255,.018));color:var(--g3);font-size:12px;font-weight:900;letter-spacing:.02em}
        .pp-form-section-title small{display:block;margin-top:2px;color:var(--g4);font-size:10px;font-weight:600;letter-spacing:0}
        .pp-form-section-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.16);font-size:15px;flex-shrink:0}
        .pp-payment-title{margin-top:20px}
        .pp-qty-row button:not(:disabled):hover{transform:translateY(-1px);filter:brightness(1.08)}
        .pp-qty-row button:not(:disabled):active{transform:translateY(0) scale(.97)}
        .pp-qty-row button:focus-visible{outline:2px solid rgba(201,168,76,.75);outline-offset:2px}
        @media (min-width: 900px){
          .pp-page{padding-bottom:24px}
          .pp-media{border-radius:0 0 22px 22px;margin:0 14px}
          .pp-media img{max-height:560px!important;object-fit:contain!important;background:radial-gradient(circle at center,rgba(255,255,255,.03),transparent 62%),var(--card)}
          .pp-gallery img{max-width:920px;margin:auto}
          .pp-info{padding-left:28px!important;padding-right:28px!important}
          .pp-sticky{left:50%!important;right:auto!important;width:min(720px,calc(100% - 40px));transform:translate(-50%,${stickyVisible ? '0' : '150%'})!important;border:1px solid rgba(201,168,76,.16);border-bottom:0;border-radius:18px 18px 0 0}
        }
        .pp-delivery-card:hover{transform:translateY(-1px);border-color:rgba(201,168,76,.36)!important}
        .pp-delivery-card:active{transform:scale(.99)}
        @media (max-width: 640px){
          .pp-delivery-options{grid-template-columns:1fr!important}
          .pp-contact-grid{grid-template-columns:1fr!important}
          .pp-title{font-size:21px!important}
          .pp-price{font-size:29px!important}
          .pp-save{font-size:9px!important;padding:4px 7px!important}
          .pp-trust-grid{grid-template-columns:1fr;gap:7px}
          .pp-trust-item{padding:9px 10px}
          .pp-media img{max-height:420px!important;object-fit:cover}
          .pp-order-card{border-radius:16px!important}
          .pp-sticky{padding-left:10px!important;padding-right:10px!important}
          .pp-sticky button{min-width:126px!important;font-size:12px!important;padding:12px 10px!important}
        }

        @keyframes faqIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes imgIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}
        @keyframes stockGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.3)}}
      `}</style>
    </div>
  )
}
