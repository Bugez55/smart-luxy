import { useState, useEffect, useRef } from 'react'
import ReviewSection from './ReviewSection'
import CountdownTimer from './CountdownTimer'
import { WILAYAS, getCommunesByWilaya } from '../data/wilayas'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

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
  'Timimoun':{bureau:1000,domicile:1600},'Touggourt':{bureau:750,domicile:1200},'Djanet':{bureau:1500,domicile:1900},
  'In Salah':{bureau:1000,domicile:1800},'In Guezzam':{bureau:1500,domicile:1900},
  'Bordj Badji Mokhtar':{bureau:1500,domicile:1900},'Ouled Djellal':{bureau:600,domicile:1100},
}

export default function ProductPage({ product: p, allProducts, onClose, onAddToCart, onBuyNow, onSubmitOrder }) {
  const [openFaq, setOpenFaq] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const imgRef2 = useRef()
  const [selectedBundle, setSelectedBundle] = useState(null)
  const [qty, setQty] = useState(1)
  const [form, setForm] = useState({ nom:'', tel:'', wilaya:'', commune:'', adresse:'', note:'' })
  const [modeLiv, setModeLiv] = useState('domicile')
  const [ordering, setOrdering] = useState(false)
  const [wilayaOpen, setWilayaOpen] = useState(false)
  const [communeOpen, setCommuneOpen] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const formRef = useRef()
  const topRef = useRef()

  const imgs = (() => { try { return typeof p.images==='string' ? JSON.parse(p.images) : (p.images||[]) } catch { return [] } })()
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
  const prixLiv = wilayaNom && LIVRAISON[wilayaNom] ? LIVRAISON[wilayaNom][modeLiv] : null
  const fraisLiv = prixLiv !== null ? prixLiv : null
  const totalFinal = currentPrix + (fraisLiv || 0)
  const communes = wilayaNom ? getCommunesByWilaya(wilayaNom) : []
  const wilayasOptions = WILAYAS.map(w => `${w.code} — ${w.nom}`)

  function setF(k, v) { setForm(f => ({ ...f, [k]:v, ...(k==='wilaya'?{commune:''}:{}) })) }

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

  async function handleOrder() {
    if (!form.nom || !form.tel || !form.wilaya || !form.commune) return
    if (hasBundles && selectedBundle === null) return
    setOrdering(true)
    const prixUnit = activeBundle ? Math.round(activeBundle.prix / activeBundle.qty) : p.prix
    await onSubmitOrder({
      ...form,
      items: [{ ...p, qty: currentQty, prix: prixUnit }],
      mode_livraison: modeLiv,
      frais_livraison: fraisLiv || 0,
      total: totalFinal,
    })
    setOrdering(false)
  }

  const inp = {
    background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:10,
    padding:'12px 14px', color:'white', fontSize:'16px', width:'100%',
    outline:'none', boxSizing:'border-box', fontFamily:'inherit',
    WebkitTextSizeAdjust:'100%', touchAction:'manipulation',
  }
  const lbl = { fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }

  const canOrder = form.nom && form.tel && form.wilaya && form.commune && !outOfStock && (!hasBundles || selectedBundle !== null)

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:300, background: p.card_color || '#0a0a0a', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

      {/* ── Header sticky ── */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(10,10,10,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'none', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', fontSize:18, flexShrink:0 }}>✕</button>
        <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Détail produit</span>
        {p.badge && <span style={{ background:'#C9A84C', color:'#000', fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:6, flexShrink:0 }}>{p.badge}</span>}
      </div>

      {/* ── Carrousel images en haut — swipe gauche/droite ── */}
      {imgs.length > 0 ? (
        <div ref={topRef} data-img-swipe style={{ position:'relative', background:'#111', lineHeight:0 }}>
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
              style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:36, height:36, color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i+1)%imgs.length) }}
              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:36, height:36, color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 }}>›</button>
            {/* Points */}
            <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5, zIndex:3 }}>
              {imgs.map((_,i) => (
                <div key={i} onClick={() => setImgIdx(i)} style={{ width:i===imgIdx?18:6, height:6, borderRadius:3, background:i===imgIdx?'#C9A84C':'rgba(255,255,255,.4)', transition:'all .25s', cursor:'pointer' }} />
              ))}
            </div>
          </>}
          {outOfStock && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fca5a5' }}>ÉPUISÉ</div>}
          {lowStock && !outOfStock && <div style={{ position:'absolute', bottom:32, left:10, background:'rgba(239,68,68,.92)', color:'white', fontSize:11, fontWeight:800, padding:'3px 8px', borderRadius:6 }}>🔥 Plus que {p.stock}</div>}
          {imgs.length > 1 && <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.55)', color:'rgba(255,255,255,.7)', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, zIndex:3 }}>{imgIdx+1}/{imgs.length}</div>}
        </div>
      ) : (
        <div ref={topRef} style={{ height:280, background:'#111', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:80 }}>{p.emoji||'📦'}</span>
        </div>
      )}

      {/* Miniatures scrollables */}
      {imgs.length > 1 && (
        <div style={{ display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', scrollbarWidth:'none', background:'#0f0f0f' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{ width:60, height:60, borderRadius:8, overflow:'hidden', border:`2px solid ${imgIdx===i?'#C9A84C':'rgba(255,255,255,.1)'}`, cursor:'pointer', flexShrink:0, transition:'all .2s', transform:imgIdx===i?'scale(1.06)':'scale(1)' }}>
              <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Infos produit ── */}
      <div style={{ padding:'16px 16px 0' }}>
        <h1 style={{ margin:'0 0 10px', fontSize:20, fontWeight:900, color:'white', lineHeight:1.3 }}>{p.nom}</h1>

        {/* Étoiles + commandes */}
        {(p.note_etoiles || p.nb_commandes > 0) && (
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
            {p.note_etoiles && (
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ fontSize:16, color: i <= Math.round(p.note_etoiles) ? '#F9A825' : 'rgba(255,255,255,.15)' }}>★</span>
                ))}
                <span style={{ fontSize:13, fontWeight:800, color:'#F9A825', marginLeft:3 }}>{Number(p.note_etoiles).toFixed(1)}</span>
              </div>
            )}
            {p.nb_commandes > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:20, padding:'3px 10px' }}>
                <span style={{ fontSize:13 }}>📦</span>
                <span style={{ fontSize:12, fontWeight:800, color:'rgba(255,255,255,.7)' }}>{p.nb_commandes.toLocaleString()} commandes</span>
              </div>
            )}
          </div>
        )}

        {/* Prix */}
        <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
          <span style={{ fontSize:30, fontWeight:900, color:'#C9A84C' }}>{fmt(p.prix)}</span>
          {p.prix_old && <>
            <span style={{ fontSize:15, color:'#555', textDecoration:'line-through' }}>{fmt(p.prix_old)}</span>
            <span style={{ background:'#ef4444', color:'white', fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:6 }}>-{disc}%</span>
          </>}
        </div>

        {isPromo && <CountdownTimer />}
      </div>

      {/* ── Description ── */}
      {p.description && (
        <div style={{ padding:'0 16px 16px' }}>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.7)', lineHeight:1.8 }}
            dangerouslySetInnerHTML={{ __html: p.description }} />
        </div>
      )}

      {/* ── Caractéristiques ── */}
      {specs.length > 0 && (
        <div style={{ padding:'0 16px 16px' }}>
          {specs.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
              <span style={{ color:'#C9A84C', fontWeight:900, fontSize:14, flexShrink:0, marginTop:1 }}>✓</span>
              <span style={{ color:'rgba(255,255,255,.75)', fontSize:14, lineHeight:1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── TOUTES LES PHOTOS défilantes verticalement ── */}
      {imgs.length > 1 && (
        <div style={{ margin:0, padding:0, lineHeight:0 }}>
          {imgs.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt=""
              style={{ width:'100%', display:'block', objectFit:'cover', lineHeight:0, margin:0, padding:0 }}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      )}

      {/* ── FAQ ── */}
      {faq.length > 0 && (
        <div style={{ padding:'0 16px 16px' }}>
          <h3 style={{ fontSize:16, fontWeight:900, color:'white', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>❓ Questions fréquentes</h3>
          {faq.map((item,i) => (
            <div key={i} style={{ marginBottom:6, borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.08)' }}>
              <button onClick={() => setOpenFaq(openFaq===i?null:i)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:openFaq===i?'rgba(201,168,76,.1)':'#141414', border:'none', padding:'13px 14px', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'left', gap:8 }}>
                <span style={{ flex:1 }}>{item.q}</span>
                <span style={{ color:'#C9A84C', fontSize:18, flexShrink:0, fontWeight:900 }}>{openFaq===i?'−':'+'}</span>
              </button>
              {openFaq===i && (
                <div style={{ background:'#111', padding:'12px 14px', fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.7, borderTop:'1px solid rgba(255,255,255,.05)' }}>
                  {item.r}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════
          FORMULAIRE DE COMMANDE — style MarketDZ
      ══════════════════════════════════════════ */}
      <div ref={formRef} style={{ margin:'0 12px 16px', background:'#141414', border:'1px solid rgba(201,168,76,.25)', borderRadius:18, overflow:'hidden' }}>

        {/* En-tête formulaire */}
        <div style={{ background:'linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.05))', borderBottom:'1px solid rgba(201,168,76,.2)', padding:'16px', textAlign:'center' }}>
          <div style={{ fontSize:17, fontWeight:900, color:'white', marginBottom:3 }}>🛒 Passer commande</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Paiement à la livraison ✅ Partout en Algérie 🇩🇿</div>
        </div>

        <div style={{ padding:16 }}>

          {/* ── PACKS / BUNDLES ── */}
          {hasBundles && (
            <div style={{ marginBottom:18 }}>
              <div style={lbl}>Choisir une offre</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bundles.map((b, i) => {
                  const isSelected = selectedBundle === i
                  const prixParUnit = b.qty > 1 ? Math.round(b.prix / b.qty) : null
                  return (
                    <div key={i} onClick={() => setSelectedBundle(isSelected ? null : i)} style={{
                      display:'flex', alignItems:'center', gap:12,
                      background: isSelected ? 'rgba(201,168,76,.12)' : '#1a1a1a',
                      border:`2px solid ${isSelected ? '#C9A84C' : 'rgba(255,255,255,.08)'}`,
                      borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all .2s',
                    }}>
                      {/* Radio */}
                      <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${isSelected?'#C9A84C':'rgba(255,255,255,.2)'}`, background:isSelected?'#C9A84C':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
                        {isSelected && <span style={{ fontSize:12, color:'#000', fontWeight:900 }}>✓</span>}
                      </div>
                      {/* Image si disponible */}
                      {mainImg && <img src={mainImg} alt="" style={{ width:44, height:44, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
                      {/* Label */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{b.label}</div>
                        {prixParUnit && <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:1 }}>{fmt(prixParUnit)} / unité</div>}
                      </div>
                      {/* Prix */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:900, color:isSelected?'#C9A84C':'white' }}>{fmt(b.prix)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantité si pas de bundles */}
          {!hasBundles && (
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Quantité</label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:10, width:44, height:44, color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ color:'white', fontWeight:900, fontSize:20, minWidth:32, textAlign:'center' }}>{qty}</span>
                <button onClick={() => setQty(q => q+1)} style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:10, width:44, height:44, color:'#C9A84C', fontSize:20, cursor:'pointer', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
            </div>
          )}

          {/* ── Mode livraison ── */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Mode de livraison</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {['domicile','bureau'].map(mode => (
                <button key={mode} onClick={() => setModeLiv(mode)} style={{ padding:'11px 8px', background:modeLiv===mode?'rgba(201,168,76,.12)':'#1a1a1a', border:`2px solid ${modeLiv===mode?'#C9A84C':'#2a2a2a'}`, borderRadius:10, color:modeLiv===mode?'#C9A84C':'#666', fontSize:12, fontWeight:800, cursor:'pointer', textAlign:'center', lineHeight:1.4, transition:'all .2s' }}>
                  {mode==='domicile'?'🏠 À domicile':'📦 Retrait bureau'}
                  <div style={{ fontSize:9, marginTop:3, color:modeLiv===mode?'rgba(201,168,76,.6)':'#444' }}>{mode==='domicile'?'2–5 jours':'1–3 jours'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Wilaya ── */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Wilaya *</label>
            <div style={{ position:'relative' }}>
              <div onClick={() => { setWilayaOpen(o=>!o); setCommuneOpen(false) }} style={{ ...inp, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', color:form.wilaya?'white':'#444' }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{form.wilaya||'Choisir une wilaya'}</span>
                <span style={{ color:'#C9A84C', fontSize:10, flexShrink:0, marginLeft:8 }}>{wilayaOpen?'▲':'▼'}</span>
              </div>
              {wilayaOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9999, background:'#1a1a1a', border:'1px solid #C9A84C', borderRadius:10, marginTop:4, maxHeight:220, overflowY:'auto', WebkitOverflowScrolling:'touch', boxShadow:'0 12px 40px rgba(0,0,0,.9)' }}>
                  {wilayasOptions.map(opt => (
                    <div key={opt} onClick={() => { setF('wilaya',opt); setWilayaOpen(false) }} style={{ padding:'12px 14px', fontSize:15, cursor:'pointer', color:opt===form.wilaya?'#C9A84C':'rgba(255,255,255,.85)', background:opt===form.wilaya?'rgba(201,168,76,.1)':'transparent', borderBottom:'1px solid rgba(255,255,255,.04)', touchAction:'manipulation' }}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Commune ── */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Commune {communes.length>0&&`(${communes.length})`} *</label>
            <div style={{ position:'relative' }}>
              <div onClick={() => { if(form.wilaya){setCommuneOpen(o=>!o); setWilayaOpen(false)} }} style={{ ...inp, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:form.wilaya?'pointer':'not-allowed', opacity:form.wilaya?1:.5, color:form.commune?'white':'#444' }}>
                <span>{form.commune||(form.wilaya?'Choisir une commune':"Choisir d'abord une wilaya")}</span>
                <span style={{ color:'#C9A84C', fontSize:10, flexShrink:0, marginLeft:8 }}>{communeOpen?'▲':'▼'}</span>
              </div>
              {communeOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9999, background:'#1a1a1a', border:'1px solid #C9A84C', borderRadius:10, marginTop:4, maxHeight:220, overflowY:'auto', WebkitOverflowScrolling:'touch', boxShadow:'0 12px 40px rgba(0,0,0,.9)' }}>
                  {communes.map(opt => (
                    <div key={opt} onClick={() => { setF('commune',opt); setCommuneOpen(false) }} style={{ padding:'12px 14px', fontSize:15, cursor:'pointer', color:opt===form.commune?'#C9A84C':'rgba(255,255,255,.85)', background:opt===form.commune?'rgba(201,168,76,.1)':'transparent', borderBottom:'1px solid rgba(255,255,255,.04)', touchAction:'manipulation' }}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Nom + Tel ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Nom complet *</label>
              <input placeholder="Votre nom" value={form.nom} onChange={e => setF('nom',e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Téléphone *</label>
              <input placeholder="0555 00 00 00" value={form.tel} onChange={e => setF('tel',e.target.value)} style={inp} type="tel" />
            </div>
          </div>

          {/* Adresse */}
          {modeLiv==='domicile' && (
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Adresse</label>
              <input placeholder="Rue, quartier, N°..." value={form.adresse} onChange={e => setF('adresse',e.target.value)} style={inp} />
            </div>
          )}

          {/* ── Récap prix ── */}
          {form.wilaya && (
            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'12px 14px', marginBottom:16, border:'1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:6 }}>
                <span>🛍️ Prix produit</span><span>{fmt(currentPrix)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:8 }}>
                <span>🚚 Frais livraison</span>
                <span style={{ color:fraisLiv===0?'#22c55e':undefined }}>{fraisLiv===null?'—':fraisLiv===0?'Gratuit':fmt(fraisLiv)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:'1px solid rgba(255,255,255,.08)', fontSize:17, fontWeight:900, color:'white' }}>
                <span>💰 Total à payer</span>
                <span style={{ color:'#C9A84C' }}>{fmt(totalFinal)}</span>
              </div>
            </div>
          )}

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
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)', animation:'shimmer 2s infinite', backgroundSize:'200% 100%' }} />
            )}
            <span style={{ position:'relative', zIndex:1 }}>
              {ordering ? '⏳ Envoi en cours…'
                : outOfStock ? '🚫 Épuisé'
                : hasBundles && selectedBundle===null ? '⬆️ Choisir une offre ci-dessus'
                : '🛒 Confirmer la commande'}
            </span>
          </button>
          <div style={{ textAlign:'center', marginTop:8, fontSize:11, color:'rgba(255,255,255,.2)' }}>
            ✅ Paiement à la livraison · 100% sécurisé
          </div>
        </div>
      </div>

      {/* ── Avis clients ── */}
      <ReviewSection productId={p.id} />

      {/* ── Produits similaires ── */}
      {(allProducts||[]).filter(x=>x.id!==p.id&&x.categorie===p.categorie&&x.is_active).slice(0,4).length > 0 && (
        <div style={{ padding:'0 16px 100px' }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:'rgba(255,255,255,.5)', letterSpacing:'.06em', marginBottom:12 }}>VOUS AIMEREZ AUSSI</h3>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
            {(allProducts||[]).filter(x=>x.id!==p.id&&x.categorie===p.categorie&&x.is_active).slice(0,4).map(sim => (
              <div key={sim.id} onClick={onClose} style={{ background:'#141414', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, overflow:'hidden', cursor:'pointer', width:130, flexShrink:0 }}>
                <div style={{ height:90, background:'#1a1a1a', overflow:'hidden' }}>
                  {sim.img ? <img src={sim.img} alt={sim.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{sim.emoji||'📦'}</div>}
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

      {/* ── Sticky bouton commander ── */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:200,
        background:'rgba(10,10,10,.97)', backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(201,168,76,.2)',
        padding:'10px 16px 14px',
        display:'flex', alignItems:'center', gap:10,
        transform: stickyVisible ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .25s cubic-bezier(.22,1,.36,1)',
        boxShadow:'0 -8px 32px rgba(0,0,0,.6)',
      }}>
        {(p.img||(imgs[0]?.url)) && <img src={p.img||(imgs[0]?.url)} alt="" style={{ width:42, height:42, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:'white', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nom}</div>
          <div style={{ fontSize:14, color:'#C9A84C', fontWeight:900 }}>{fmt(activeBundle?activeBundle.prix:p.prix)}</div>
        </div>
        <button
          disabled={outOfStock}
          onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })}
          style={{ background:outOfStock?'#333':'linear-gradient(135deg,#C9A84C,#E9C46A)', border:'none', borderRadius:12, padding:'12px 20px', color:outOfStock?'#666':'#000', fontSize:14, fontWeight:900, cursor:outOfStock?'not-allowed':'pointer', flexShrink:0, whiteSpace:'nowrap' }}
        >
          {outOfStock ? '🚫 Épuisé' : '🛒 Commander'}
        </button>
      </div>

      {/* Lightbox */}
      {lb && imgs.length > 0 && (
        <div onClick={() => setLb(false)} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.97)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={imgs[imgIdx]?.url} alt="" style={{ maxWidth:'100%', maxHeight:'90vh', objectFit:'contain' }} />
          <button onClick={() => setLb(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.12)', border:'none', borderRadius:'50%', width:44, height:44, color:'white', fontSize:20, cursor:'pointer' }}>✕</button>
          {imgs.length > 1 && <>
            <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+imgs.length)%imgs.length)}} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%', width:48, height:48, color:'white', fontSize:26, cursor:'pointer' }}>‹</button>
            <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%imgs.length)}} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%', width:48, height:48, color:'white', fontSize:26, cursor:'pointer' }}>›</button>
          </>}
        </div>
      )}

      <style>{`
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes imgIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  )
}
