import { useState, useEffect, useRef } from 'react'
import ReviewSection from './ReviewSection'
import CountdownTimer from './CountdownTimer'
import { WILAYAS, getCommunesByWilaya } from '../data/wilayas'
import { supabase } from '../supabase'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

// ── Lightbox plein écran ──
function LightBox({ imgs, curImg, imgIdx, setImgIdx, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let tx = 0
    const onTS = e => { tx = e.touches[0].clientX }
    const onTM = e => { if (Math.abs(e.touches[0].clientX - tx) > 10) e.preventDefault() }
    const onTE = e => {
      const dx = e.changedTouches[0].clientX - tx
      if (Math.abs(dx) > 40) {
        if (dx < 0) setImgIdx(i => (i + 1) % imgs.length)
        else setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
      } else { onClose() }
      tx = 0
    }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: false })
    el.addEventListener('touchend', onTE, { passive: true })
    return () => { el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE) }
  }, [imgs.length, onClose, setImgIdx])

  const src = imgs.length > 0 ? imgs[imgIdx]?.url : curImg
  return (
    <div ref={ref} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.12)', border:'none', borderRadius:'50%', width:44, height:44, color:'white', fontSize:20, cursor:'pointer', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      {imgs.length > 1 && <div style={{ position:'absolute', top:20, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,.5)', borderRadius:20, padding:'4px 14px', fontSize:12, color:'rgba(255,255,255,.6)', fontWeight:700 }}>{imgIdx+1} / {imgs.length}</div>}
      <img key={`lb${imgIdx}`} src={src} alt="" style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain', animation:'lbIn .2s ease', borderRadius:4 }} onClick={onClose} />
      {imgs.length > 1 && <>
        <button onClick={() => setImgIdx(i => (i-1+imgs.length)%imgs.length)} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%', width:48, height:48, color:'white', fontSize:26, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <button onClick={() => setImgIdx(i => (i+1)%imgs.length)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%', width:48, height:48, color:'white', fontSize:26, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        <div style={{ position:'absolute', bottom:20, display:'flex', gap:8, padding:'0 16px', overflowX:'auto', maxWidth:'100%', scrollbarWidth:'none' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{ width:46, height:46, borderRadius:8, overflow:'hidden', flexShrink:0, border:`2px solid ${i===imgIdx?'#C9A84C':'rgba(255,255,255,.2)'}`, cursor:'pointer', opacity:i===imgIdx?1:.5, transition:'all .2s' }}>
              <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ))}
        </div>
      </>}
      <style>{`@keyframes lbIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

// ── Prix livraison ──
const LIVRAISON = {
  'Adrar':{bureau:1000,domicile:1600},'Chlef':{bureau:400,domicile:800},'Laghouat':{bureau:600,domicile:1100},
  'Oum El Bouaghi':{bureau:400,domicile:950},'Batna':{bureau:400,domicile:950},'Béjaïa':{bureau:400,domicile:850},
  'Biskra':{bureau:600,domicile:1100},'Béchar':{bureau:750,domicile:1400},'Blida':{bureau:400,domicile:800},
  'Bouira':{bureau:400,domicile:850},'Tamanrasset':{bureau:1000,domicile:1800},'Tébessa':{bureau:600,domicile:1100},
  'Tlemcen':{bureau:400,domicile:850},'Tiaret':{bureau:400,domicile:850},'Tizi Ouzou':{bureau:0,domicile:300},
  'Alger':{bureau:300,domicile:750},'Djelfa':{bureau:600,domicile:1100},'Jijel':{bureau:400,domicile:950},
  'Sétif':{bureau:400,domicile:900},'Saïda':{bureau:400,domicile:850},'Skikda':{bureau:400,domicile:950},
  'Sidi Bel Abbès':{bureau:400,domicile:850},'Annaba':{bureau:400,domicile:900},'Guelma':{bureau:400,domicile:950},
  'Constantine':{bureau:400,domicile:900},'Médéa':{bureau:400,domicile:850},'Mostaganem':{bureau:400,domicile:800},
  "M'Sila":{bureau:400,domicile:900},'Mascara':{bureau:400,domicile:850},'Ouargla':{bureau:750,domicile:1200},
  'Oran':{bureau:400,domicile:850},'El Bayadh':{bureau:400,domicile:900},'Illizi':{bureau:1500,domicile:1900},
  'Bordj Bou Arréridj':{bureau:400,domicile:900},'Boumerdès':{bureau:400,domicile:850},'El Tarf':{bureau:400,domicile:1000},
  'Tindouf':{bureau:1500,domicile:1900},'Tissemsilt':{bureau:400,domicile:850},'El Oued':{bureau:750,domicile:1200},
  'Khenchela':{bureau:600,domicile:1000},'Souk Ahras':{bureau:600,domicile:1000},'Tipaza':{bureau:400,domicile:850},
  'Mila':{bureau:400,domicile:950},'Aïn Defla':{bureau:400,domicile:850},'Naâma':{bureau:600,domicile:1200},
  'Aïn Témouchent':{bureau:400,domicile:850},'Ghardaïa':{bureau:750,domicile:1200},'Relizane':{bureau:400,domicile:800},
}

export default function ProductPage({ product: p, allProducts, onClose, onAddToCart, onBuyNow, onSubmitOrder }) {
  const [imgIdx, setImgIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const [tab, setTab] = useState('desc')
  const [stickyVisible, setStickyVisible] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState(null)
  const [qty, setQty] = useState(1)
  const [openFaq, setOpenFaq] = useState(null)

  // Formulaire de commande intégré
  const [form, setForm] = useState({ nom:'', tel:'', wilaya:'', commune:'', adresse:'', note:'' })
  const [modeLiv, setModeLiv] = useState('domicile')
  const [ordering, setOrdering] = useState(false)
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [communeOpen, setCommuneOpen] = useState(false)

  const buyBarRef = useRef()
  const orderFormRef = useRef()
  const imgRef = useRef()

  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
  const specs = (() => { try { return typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || []) } catch { return [] } })()
  const bundles = (() => { try { return typeof p.bundles === 'string' ? JSON.parse(p.bundles) : (p.bundles || []) } catch { return [] } })()
  const faq = (() => { try { return typeof p.faq === 'string' ? JSON.parse(p.faq) : (p.faq || []) } catch { return [] } })()

  const curImg = imgs.length > 0 ? imgs[imgIdx]?.url : p.img
  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5
  const isPromo = p.badge?.includes('Promo') || p.prix_old

  const hasBundles = bundles.length > 0
  const activeBundle = selectedBundle !== null ? bundles[selectedBundle] : null
  const currentPrix = activeBundle ? activeBundle.prix : p.prix
  const currentQty = activeBundle ? activeBundle.qty : qty

  const wilayaNom = form.wilaya ? form.wilaya.replace(/^\d+ — /, '') : ''
  const prixLiv = wilayaNom && LIVRAISON[wilayaNom] ? LIVRAISON[wilayaNom][modeLiv] : null
  const fraisLiv = prixLiv !== null ? prixLiv : null
  const totalFinal = currentPrix + (fraisLiv || 0)

  const communes = wilayaNom ? getCommunesByWilaya(wilayaNom) : []
  const wilayasOptions = WILAYAS.map(w => `${w.code} — ${w.nom}`)

  function setF(k, v) { setForm(f => ({ ...f, [k]: v, ...(k==='wilaya'?{commune:''}:{}) })) }

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

  // Swipe images natif
  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    let tx = 0, ty = 0
    const onTS = e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY }
    const onTM = e => { if (Math.abs(e.touches[0].clientX - tx) > Math.abs(e.touches[0].clientY - ty)) e.preventDefault() }
    const onTE = e => {
      const dx = e.changedTouches[0].clientX - tx
      const dy = Math.abs(e.changedTouches[0].clientY - ty)
      if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
        if (imgs.length > 1) {
          if (dx < 0) setImgIdx(i => (i+1)%imgs.length)
          else setImgIdx(i => (i-1+imgs.length)%imgs.length)
        }
      } else if (Math.abs(dx) < 10 && dy < 10) { setLb(true) }
    }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: false })
    el.addEventListener('touchend', onTE, { passive: true })
    return () => { el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE) }
  }, [imgs.length])

  // Sticky bar
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting), { threshold: 0 })
    if (buyBarRef.current) obs.observe(buyBarRef.current)
    return () => obs.disconnect()
  }, [])

  // Soumettre la commande
  async function handleOrder() {
    if (!form.nom || !form.tel || !form.wilaya || !form.commune) return
    setOrdering(true)
    await onSubmitOrder({
      ...form,
      items: [{ ...p, qty: currentQty, prix: activeBundle ? activeBundle.prix / activeBundle.qty : p.prix }],
      mode_livraison: modeLiv,
      frais_livraison: fraisLiv || 0,
      total: totalFinal,
    })
    setOrdering(false)
  }

  const similaires = (allProducts || []).filter(x => x.id !== p.id && x.categorie === p.categorie && x.is_active).slice(0, 4)

  const inputSt = {
    background:'#1e1e1e', border:'1px solid #2a2a2a', borderRadius:10,
    padding:'12px 14px', color:'white', fontSize:'16px', width:'100%',
    outline:'none', boxSizing:'border-box', fontFamily:'inherit',
  }
  const lbl = { fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:300, background:'#0a0a0a', display:'flex', flexDirection:'column', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(10,10,10,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'none', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', fontSize:18 }}>✕</button>
        <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>Détail produit</span>
        {p.badge && <span style={{ background:'#C9A84C', color:'#000', fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6, letterSpacing:'.04em', flexShrink:0 }}>{p.badge}</span>}
      </div>

      {/* Image principale swipeable */}
      <div ref={imgRef} style={{ background:'#111', position:'relative', height: imgs.length > 0 || p.img ? 320 : 200, overflow:'hidden', flexShrink:0, cursor:'zoom-in' }}>
        {curImg
          ? <img key={imgIdx} src={curImg} alt={p.nom} style={{ width:'100%', height:'100%', objectFit:'cover', animation:'imgIn .22s ease' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:80 }}>{p.emoji || '📦'}</span></div>
        }
        {imgs.length > 1 && <>
          <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i-1+imgs.length)%imgs.length) }} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:38, height:38, color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i+1)%imgs.length) }} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:38, height:38, color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 }}>›</button>
          <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,.6)', borderRadius:20, padding:'4px 12px', fontSize:11, color:'rgba(255,255,255,.8)', fontWeight:700, zIndex:3 }}>{imgIdx+1}/{imgs.length}</div>
        </>}
        <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.5)', borderRadius:8, padding:'4px 10px', fontSize:11, color:'rgba(255,255,255,.7)', zIndex:3 }}>🔍 Zoom</div>
        {lowStock && !outOfStock && <div style={{ position:'absolute', bottom:36, left:8, background:'rgba(239,68,68,.92)', color:'white', fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6, animation:'stockPulse 1.5s infinite', zIndex:3 }}>🔥 Plus que {p.stock}</div>}
      </div>

      {/* Miniatures */}
      {imgs.length > 1 && (
        <div style={{ display:'flex', gap:8, padding:'10px 16px', overflowX:'auto', flexShrink:0, scrollbarWidth:'none' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{ width:58, height:58, borderRadius:10, overflow:'hidden', border:`2px solid ${imgIdx===i?'#C9A84C':'rgba(255,255,255,.1)'}`, cursor:'pointer', flexShrink:0, transform:imgIdx===i?'scale(1.06)':'scale(1)', transition:'all .2s', background:'#1a1a1a' }}>
              <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* Infos produit */}
      <div style={{ padding:'16px 16px 0', flexShrink:0 }}>
        <h1 style={{ margin:'0 0 12px', fontSize:20, fontWeight:900, color:'white', lineHeight:1.3 }}>{p.nom}</h1>

        {/* Prix */}
        <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
          <span style={{ fontSize:28, fontWeight:900, color:'#C9A84C' }}>{fmt(activeBundle ? activeBundle.prix : p.prix)}</span>
          {p.prix_old && !activeBundle && <>
            <span style={{ fontSize:15, color:'#555', textDecoration:'line-through' }}>{fmt(p.prix_old)}</span>
            <span style={{ background:'#ef4444', color:'white', fontSize:11, fontWeight:800, padding:'2px 7px', borderRadius:6 }}>
              -{Math.round((1 - p.prix/p.prix_old)*100)}%
            </span>
          </>}
        </div>

        {/* Compte à rebours promo */}
        {isPromo && <CountdownTimer />}

        {/* Stock */}
        {outOfStock && <div style={{ background:'rgba(100,100,100,.1)', border:'1px solid rgba(100,100,100,.3)', borderRadius:8, padding:'7px 12px', marginBottom:12, fontSize:12, fontWeight:700, color:'#888' }}>🚫 Produit épuisé</div>}
        {lowStock && !outOfStock && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'7px 12px', marginBottom:12, fontSize:12, fontWeight:700, color:'#f87171', display:'flex', alignItems:'center', gap:6 }}>🔥 Plus que <strong>{p.stock}</strong> en stock !</div>}
      </div>

      {/* ══════════════════════════════════
          SÉLECTEUR DE PACKS / BUNDLES
      ══════════════════════════════════ */}
      {hasBundles && (
        <div style={{ padding:'0 16px 16px', flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', marginBottom:10 }}>CHOISIR UNE OFFRE</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {bundles.map((b, i) => (
              <div key={i} onClick={() => setSelectedBundle(selectedBundle === i ? null : i)} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background: selectedBundle === i ? 'rgba(201,168,76,.1)' : '#141414',
                border: `2px solid ${selectedBundle === i ? '#C9A84C' : 'rgba(255,255,255,.08)'}`,
                borderRadius:12, padding:'12px 16px', cursor:'pointer',
                transition:'all .2s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%',
                    border:`2px solid ${selectedBundle === i ? '#C9A84C' : 'rgba(255,255,255,.2)'}`,
                    background: selectedBundle === i ? '#C9A84C' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, color:'#000', fontWeight:900, flexShrink:0,
                  }}>{selectedBundle === i ? '✓' : ''}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{b.label}</div>
                    {b.qty > 1 && p.prix && (
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:1 }}>
                        {fmt(Math.round(b.prix/b.qty))} / unité
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:16, fontWeight:900, color: selectedBundle === i ? '#C9A84C' : 'white' }}>
                  {fmt(b.prix)}
                </div>
              </div>
            ))}
          </div>
          {!hasBundles && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>Quantité :</span>
              <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, width:36, height:36, color:'white', fontSize:18, cursor:'pointer' }}>−</button>
              <span style={{ color:'white', fontWeight:800, fontSize:16, minWidth:28, textAlign:'center' }}>{qty}</span>
              <button onClick={() => setQty(q => q+1)} style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, width:36, height:36, color:'#C9A84C', fontSize:18, cursor:'pointer', fontWeight:800 }}>+</button>
            </div>
          )}
        </div>
      )}

      {/* Boutons panier / commander classiques si pas de bundles */}
      {!hasBundles && (
        <div ref={buyBarRef} style={{ display:'flex', gap:10, padding:'0 16px 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', background:'#1a1a1a', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ background:'none', border:'none', color:'white', width:40, height:44, fontSize:18, cursor:'pointer' }}>−</button>
            <span style={{ color:'white', fontWeight:800, fontSize:15, minWidth:28, textAlign:'center' }}>{qty}</span>
            <button onClick={() => setQty(q => q+1)} style={{ background:'none', border:'none', color:'#C9A84C', width:40, height:44, fontSize:18, cursor:'pointer', fontWeight:800 }}>+</button>
          </div>
          <button className="btn-cart" style={{ flex:1, opacity:outOfStock?.4:1 }} disabled={outOfStock} onClick={() => onAddToCart(qty)}>🛒 Panier</button>
          <button className="btn-buy" style={{ flex:2, opacity:outOfStock?.4:1 }} disabled={outOfStock} onClick={() => onBuyNow(qty)}>⚡ Commander</button>
        </div>
      )}

      {/* Onglets description / specs */}
      <div style={{ flexShrink:0 }}>
        <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'0 16px', gap:4 }}>
          {['desc','specs'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#C9A84C':'transparent'}`, color:tab===t?'white':'rgba(255,255,255,.4)', padding:'10px 14px', fontSize:13, fontWeight:tab===t?800:600, cursor:'pointer', transition:'all .2s' }}>
              {t==='desc'?'Description':'Caractéristiques'}
            </button>
          ))}
        </div>
        <div style={{ padding:'14px 16px' }}>
          {tab==='desc'
            ? <div style={{ fontSize:14, color:'rgba(255,255,255,.65)', lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: p.description || 'Aucune description.' }} />
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {specs.length===0
                  ? <p style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>Aucune caractéristique.</p>
                  : specs.map((s,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.03)', borderRadius:8, padding:'9px 12px' }}>
                      <span style={{ color:'#C9A84C', fontWeight:800, fontSize:13 }}>✓</span>
                      <span style={{ color:'rgba(255,255,255,.75)', fontSize:13 }}>{s}</span>
                    </div>
                  ))
                }
              </div>
          }
        </div>
      </div>

      {/* FAQ */}
      {faq.length > 0 && (
        <div style={{ padding:'0 16px 16px' }}>
          <h3 style={{ fontSize:15, fontWeight:900, color:'white', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            ❓ Questions fréquentes
          </h3>
          {faq.map((item, i) => (
            <div key={i} style={{ marginBottom:8, borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.08)' }}>
              <button
                onClick={() => setOpenFaq(openFaq===i ? null : i)}
                style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background: openFaq===i ? 'rgba(201,168,76,.1)' : '#141414', border:'none', padding:'12px 14px', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'left' }}
              >
                <span>{item.q}</span>
                <span style={{ color:'#C9A84C', fontSize:16, flexShrink:0, marginLeft:8 }}>{openFaq===i?'−':'+'}</span>
              </button>
              {openFaq===i && (
                <div style={{ background:'#111', padding:'10px 14px', fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.6, borderTop:'1px solid rgba(255,255,255,.05)' }}>
                  {item.r}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════
          FORMULAIRE DE COMMANDE INTÉGRÉ
      ══════════════════════════════════ */}
      <div ref={buyBarRef} style={{ margin:'0 16px 16px', background:'#141414', border:'1px solid rgba(201,168,76,.2)', borderRadius:18, overflow:'hidden', flexShrink:0 }}>
        <div style={{ background:'rgba(201,168,76,.08)', borderBottom:'1px solid rgba(201,168,76,.15)', padding:'14px 16px', textAlign:'center' }}>
          <div style={{ fontSize:16, fontWeight:900, color:'white', marginBottom:2 }}>📋 Passer commande</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Remplissez vos informations pour commander</div>
        </div>

        <div style={{ padding:16 }}>
          {/* Mode livraison */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Mode de livraison</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {['domicile','bureau'].map(mode => (
                <button key={mode} onClick={() => setModeLiv(mode)} style={{
                  padding:'10px 8px', background: modeLiv===mode ? 'rgba(201,168,76,.12)' : '#1e1e1e',
                  border:`2px solid ${modeLiv===mode?'#C9A84C':'#2a2a2a'}`,
                  borderRadius:10, color:modeLiv===mode?'#C9A84C':'#777',
                  fontSize:12, fontWeight:800, cursor:'pointer', textAlign:'center', lineHeight:1.4,
                }}>
                  {mode==='domicile'?'🏠 À domicile':'📦 Retrait bureau'}
                  <div style={{ fontSize:9, marginTop:3, color:modeLiv===mode?'rgba(201,168,76,.7)':'#444' }}>
                    {mode==='domicile'?'2–5 jours':'1–3 jours'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wilaya */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Wilaya *</label>
            <div style={{ position:'relative' }}>
              <div onClick={() => setWilayaOpen(o => !o)} style={{ ...inputSt, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', color:form.wilaya?'white':'#444' }}>
                <span>{form.wilaya || 'Choisir une wilaya'}</span>
                <span style={{ color:'#C9A84C', fontSize:10 }}>{wilayaOpen?'▲':'▼'}</span>
              </div>
              {wilayaOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9999, background:'#1a1a1a', border:'1px solid #C9A84C', borderRadius:10, marginTop:4, maxHeight:200, overflowY:'auto', WebkitOverflowScrolling:'touch', boxShadow:'0 12px 40px rgba(0,0,0,.8)' }}>
                  {wilayasOptions.map(opt => (
                    <div key={opt} onClick={() => { setF('wilaya',opt); setWilayaOpen(false) }} style={{ padding:'11px 14px', fontSize:14, cursor:'pointer', color:opt===form.wilaya?'#C9A84C':'rgba(255,255,255,.85)', background:opt===form.wilaya?'rgba(201,168,76,.1)':'transparent', borderBottom:'1px solid rgba(255,255,255,.04)', touchAction:'manipulation' }}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Commune */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Commune *</label>
            <div style={{ position:'relative' }}>
              <div onClick={() => form.wilaya && setCommuneOpen(o => !o)} style={{ ...inputSt, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:form.wilaya?'pointer':'not-allowed', opacity:form.wilaya?1:.5, color:form.commune?'white':'#444' }}>
                <span>{form.commune || (form.wilaya ? 'Choisir une commune' : "Choisir d'abord une wilaya")}</span>
                <span style={{ color:'#C9A84C', fontSize:10 }}>{communeOpen?'▲':'▼'}</span>
              </div>
              {communeOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9999, background:'#1a1a1a', border:'1px solid #C9A84C', borderRadius:10, marginTop:4, maxHeight:200, overflowY:'auto', WebkitOverflowScrolling:'touch', boxShadow:'0 12px 40px rgba(0,0,0,.8)' }}>
                  {communes.map(opt => (
                    <div key={opt} onClick={() => { setF('commune',opt); setCommuneOpen(false) }} style={{ padding:'11px 14px', fontSize:14, cursor:'pointer', color:opt===form.commune?'#C9A84C':'rgba(255,255,255,.85)', background:opt===form.commune?'rgba(201,168,76,.1)':'transparent', borderBottom:'1px solid rgba(255,255,255,.04)', touchAction:'manipulation' }}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nom + Tel */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Nom complet *</label>
              <input placeholder="Votre nom" value={form.nom} onChange={e => setF('nom',e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={lbl}>Téléphone *</label>
              <input placeholder="0555 00 00 00" value={form.tel} onChange={e => setF('tel',e.target.value)} style={inputSt} type="tel" />
            </div>
          </div>

          {modeLiv==='domicile' && (
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Adresse</label>
              <input placeholder="Rue, quartier…" value={form.adresse} onChange={e => setF('adresse',e.target.value)} style={inputSt} />
            </div>
          )}

          {/* Récap prix */}
          {form.wilaya && (
            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:5 }}>
                <span>Prix produit</span><span>{fmt(currentPrix)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:8 }}>
                <span>Frais livraison</span>
                <span style={{ color:fraisLiv===0?'#22c55e':'rgba(255,255,255,.5)' }}>{fraisLiv===null?'—':fraisLiv===0?'Gratuit':fmt(fraisLiv)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid rgba(255,255,255,.08)', fontSize:16, fontWeight:900, color:'white' }}>
                <span>Total à payer</span>
                <span style={{ color:'#C9A84C' }}>{fmt(totalFinal)}</span>
              </div>
            </div>
          )}

          {/* Bouton commander */}
          <button
            onClick={handleOrder}
            disabled={!form.nom||!form.tel||!form.wilaya||!form.commune||ordering||outOfStock||(hasBundles&&selectedBundle===null)}
            style={{
              width:'100%', padding:'15px',
              background: (!form.nom||!form.tel||!form.wilaya||!form.commune||outOfStock||(hasBundles&&selectedBundle===null)) ? '#222' : 'linear-gradient(135deg,#C9A84C,#E9C46A)',
              border:'none', borderRadius:12,
              color: (!form.nom||!form.tel||!form.wilaya||!form.commune||outOfStock||(hasBundles&&selectedBundle===null)) ? '#444' : '#000',
              fontSize:15, fontWeight:900, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all .3s',
            }}
          >
            {ordering ? '⏳ Envoi en cours…' : outOfStock ? '🚫 Épuisé' : hasBundles && selectedBundle===null ? 'Choisir une offre d\'abord' : '🛒 Confirmer la commande'}
          </button>
        </div>
      </div>

      {/* Avis clients */}
      <ReviewSection productId={p.id} />

      {/* Produits similaires */}
      {similaires.length > 0 && (
        <div style={{ padding:'0 16px 24px' }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:'rgba(255,255,255,.6)', letterSpacing:'.06em', marginBottom:12 }}>VOUS AIMEREZ AUSSI</h3>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
            {similaires.map(sim => (
              <div key={sim.id} onClick={() => onClose()} style={{ background:'#141414', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, overflow:'hidden', cursor:'pointer', width:140, flexShrink:0 }}>
                <div style={{ height:100, background:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                  {sim.img ? <img src={sim.img} alt={sim.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:36 }}>{sim.emoji||'📦'}</span>}
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <div style={{ fontSize:11, color:'white', fontWeight:700, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sim.nom}</div>
                  <div style={{ fontSize:12, color:'#C9A84C', fontWeight:800 }}>{fmt(sim.prix)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky bar commander */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:200, background:'rgba(10,10,10,.97)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(201,168,76,.2)', padding:'10px 16px 14px', display:'flex', alignItems:'center', gap:10, transform:stickyVisible?'translateY(0)':'translateY(100%)', transition:'transform .25s cubic-bezier(.22,1,.36,1)', boxShadow:'0 -8px 32px rgba(0,0,0,.6)' }}>
        {(p.img||curImg) && <img src={p.img||curImg} alt="" style={{ width:40, height:40, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:'white', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nom}</div>
          <div style={{ fontSize:13, color:'#C9A84C', fontWeight:900 }}>{fmt(activeBundle?activeBundle.prix:p.prix)}</div>
        </div>
        <button disabled={outOfStock} onClick={() => orderFormRef.current?.scrollIntoView({behavior:'smooth'})} style={{ background:outOfStock?'#333':'linear-gradient(135deg,#C9A84C,#E9C46A)', border:'none', borderRadius:12, padding:'11px 20px', color:outOfStock?'#666':'#000', fontSize:13, fontWeight:900, cursor:outOfStock?'not-allowed':'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
          {outOfStock?'🚫 Épuisé':'🛒 Commander'}
        </button>
      </div>

      {/* Lightbox */}
      {lb && <LightBox imgs={imgs} curImg={curImg} imgIdx={imgIdx} setImgIdx={setImgIdx} onClose={() => setLb(false)} />}

      <style>{`
        @keyframes imgIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
        @keyframes stockPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
      `}</style>
    </div>
  )
}