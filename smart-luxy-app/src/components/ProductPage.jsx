import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import ReviewSection from './ReviewSection'
import CountdownTimer from './CountdownTimer'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

// ── Lightbox plein écran avec swipe natif ──
function LightBox({ imgs, curImg, imgIdx, setImgIdx, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let tx = 0
    function onTS(e) { tx = e.touches[0].clientX }
    function onTM(e) {
      if (Math.abs(e.touches[0].clientX - tx) > 10) e.preventDefault()
    }
    function onTE(e) {
      const dx = e.changedTouches[0].clientX - tx
      if (Math.abs(dx) > 40) {
        if (dx < 0) setImgIdx(i => (i + 1) % imgs.length)
        else        setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
      } else {
        onClose()
      }
    }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove',  onTM, { passive: false })
    el.addEventListener('touchend',   onTE, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTS)
      el.removeEventListener('touchmove',  onTM)
      el.removeEventListener('touchend',   onTE)
    }
  }, [imgs.length, onClose, setImgIdx])

  const src = imgs.length > 0 ? imgs[imgIdx]?.url : curImg

  return (
    <div ref={ref} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,.97)',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
    }}>
      {/* Fermer */}
      <button onClick={onClose} style={{
        position:'absolute', top:16, right:16,
        background:'rgba(255,255,255,.12)', border:'none', borderRadius:'50%',
        width:44, height:44, color:'white', fontSize:20, cursor:'pointer', zIndex:2,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>✕</button>

      {/* Compteur */}
      {imgs.length > 1 && (
        <div style={{
          position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,0,0,.5)', borderRadius:20, padding:'4px 14px',
          fontSize:12, color:'rgba(255,255,255,.6)', fontWeight:700,
        }}>{imgIdx + 1} / {imgs.length}</div>
      )}

      {/* Image */}
      <img key={`lb${imgIdx}`} src={src} alt="" style={{
        maxWidth:'100%', maxHeight:'80vh', objectFit:'contain',
        animation:'lbIn .2s ease', borderRadius:4,
      }} />

      {/* Flèches */}
      {imgs.length > 1 && <>
        <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
          style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
            background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%',
            width:48, height:48, color:'white', fontSize:26, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
          style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            background:'rgba(255,255,255,.1)', border:'none', borderRadius:'50%',
            width:48, height:48, color:'white', fontSize:26, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      </>}

      {/* Miniatures */}
      {imgs.length > 1 && (
        <div style={{ position:'absolute', bottom:20,
          display:'flex', gap:8, padding:'0 16px',
          overflowX:'auto', maxWidth:'100%', scrollbarWidth:'none' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{
              width:46, height:46, borderRadius:8, overflow:'hidden', flexShrink:0,
              border:`2px solid ${i === imgIdx ? '#C9A84C' : 'rgba(255,255,255,.2)'}`,
              cursor:'pointer', opacity: i === imgIdx ? 1 : .5, transition:'all .2s',
            }}>
              <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ position:'absolute', bottom: imgs.length > 1 ? 78 : 20,
        fontSize:11, color:'rgba(255,255,255,.2)', textAlign:'center' }}>
        {imgs.length > 1 ? 'Glisser · Tap pour fermer' : 'Tap pour fermer'}
      </div>

      <style>{`@keyframes lbIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

export default function ProductPage({ product: p, allProducts, onClose, onAddToCart, onBuyNow }) {
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('desc')
  const [imgIdx, setImgIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const buyBarRef = useRef()
  const imgRef = useRef()

  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
  const specs = (() => { try { return typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || []) } catch { return [] } })()
  const hasImgs = imgs.length > 0
  const curImg = hasImgs ? imgs[imgIdx]?.url : p.img

  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5
  const isPromo = p.badge?.includes('Promo') || p.prix_old

  const similaires = (allProducts || [])
    .filter(x => x.id !== p.id && x.categorie === p.categorie && x.is_active)
    .slice(0, 4)

  // ── Lock body scroll ──
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

  // ── Keyboard nav + sticky bar observer ──
  useEffect(() => {
    setQty(1); setImgIdx(0); setTab('desc')

    const onKey = e => {
      if (e.key === 'Escape') { if (lb) setLb(false); else onClose() }
      if (lb) {
        if (e.key === 'ArrowRight') setImgIdx(i => (i + 1) % imgs.length)
        if (e.key === 'ArrowLeft') setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
      }
    }
    window.addEventListener('keydown', onKey)

    // Observer pour sticky bar — apparaît quand les boutons d'achat disparaissent
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    if (buyBarRef.current) obs.observe(buyBarRef.current)

    // ── Swipe natif sur l'image (passive:false pour bloquer scroll) ──
    let tx = 0, ty = 0
    const el = imgRef.current
    function onTS(e) {
      tx = e.touches[0].clientX
      ty = e.touches[0].clientY
    }
    function onTM(e) {
      const dx = Math.abs(e.touches[0].clientX - tx)
      const dy = Math.abs(e.touches[0].clientY - ty)
      // Bloquer le scroll vertical si swipe horizontal
      if (dx > dy && dx > 8) e.preventDefault()
    }
    function onTE(e) {
      const dx = e.changedTouches[0].clientX - tx
      const dy = Math.abs(e.changedTouches[0].clientY - ty)
      if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
        if (imgs.length > 1) {
          if (dx < 0) setImgIdx(i => (i + 1) % imgs.length)
          else        setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
        }
      } else if (Math.abs(dx) < 10 && dy < 10) {
        setLb(true)
      }
    }
    if (el) {
      el.addEventListener('touchstart', onTS, { passive: true })
      el.addEventListener('touchmove',  onTM, { passive: false })
      el.addEventListener('touchend',   onTE, { passive: true })
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      obs.disconnect()
      if (el) {
        el.removeEventListener('touchstart', onTS)
        el.removeEventListener('touchmove',  onTM)
        el.removeEventListener('touchend',   onTE)
      }
    }
  }, [p.id, imgs.length, lb])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 300,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,10,.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,.07)', border: 'none', borderRadius: 10,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white', fontSize: 18, flexShrink: 0,
        }}>✕</button>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Détail produit
        </span>
        {p.badge && (
          <span style={{
            marginLeft: 'auto', background: '#C9A84C', color: '#000',
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
            letterSpacing: '.04em', flexShrink: 0,
          }}>{p.badge}</span>
        )}
      </div>

      {/* ── Image principale — Swipe + Plein écran ── */}
      <div
        ref={imgRef}
        style={{
          background: '#111', position: 'relative',
          height: hasImgs || p.img ? 310 : 200,
          overflow: 'hidden', flexShrink: 0,
          cursor: 'zoom-in', userSelect: 'none',
        }}
      >
        {curImg
          ? <img key={imgIdx} src={curImg} alt={p.nom}
              style={{ width: '100%', height: '100%', objectFit: 'cover',
                animation: 'imgIn .22s ease' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize: 80 }}>{p.emoji || '📦'}</span>
            </div>
        }

        {/* Flèches gauche/droite */}
        {imgs.length > 1 && <>
          <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + imgs.length) % imgs.length) }}
            style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
              background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%',
              width:38, height:38, color:'white', fontSize:20, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(4px)', zIndex:3 }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % imgs.length) }}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
              background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%',
              width:38, height:38, color:'white', fontSize:20, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(4px)', zIndex:3 }}>›</button>
        </>}

        {/* Points indicateurs */}
        {imgs.length > 1 && (
          <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
            display:'flex', gap:5, zIndex:3 }}>
            {imgs.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setImgIdx(i) }} style={{
                width: i === imgIdx ? 18 : 6, height: 6, borderRadius: 3,
                background: i === imgIdx ? '#C9A84C' : 'rgba(255,255,255,.35)',
                transition: 'all .25s', cursor: 'pointer',
              }} />
            ))}
          </div>
        )}

        {/* Hint plein écran */}
        <div style={{ position:'absolute', top:10, right:10,
          background:'rgba(0,0,0,.5)', borderRadius:8, padding:'4px 10px',
          fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600,
          backdropFilter:'blur(4px)', zIndex:3 }}>🔍 Plein écran</div>

        {imgs.length > 1 && (
          <div style={{ position:'absolute', bottom:24, right:12,
            fontSize:10, color:'rgba(255,255,255,.3)', zIndex:3 }}>← glisser →</div>
        )}
      </div>

      {/* ── Miniatures scrollables ── */}
      {imgs.length > 1 && (
        <div style={{ display:'flex', gap:8, padding:'10px 16px',
          overflowX:'auto', flexShrink:0, scrollbarWidth:'none' }}>
          {imgs.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{
              width:58, height:58, borderRadius:10, overflow:'hidden',
              border:`2px solid ${imgIdx === i ? '#C9A84C' : 'rgba(255,255,255,.1)'}`,
              cursor:'pointer', flexShrink:0, background:'#1a1a1a',
              transform: imgIdx === i ? 'scale(1.06)' : 'scale(1)',
              transition:'all .2s',
            }}>
              <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes imgIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* ── Infos produit ── */}
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.25 }}>
          {p.nom}
        </h1>

        {/* Prix */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C' }}>{fmt(p.prix)}</span>
          {p.prix_old && (
            <>
              <span style={{ fontSize: 15, color: '#555', textDecoration: 'line-through' }}>{fmt(p.prix_old)}</span>
              <span style={{
                background: '#ef4444', color: 'white',
                fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
              }}>
                -{Math.round((1 - p.prix / p.prix_old) * 100)}%
              </span>
            </>
          )}
        </div>

        {/* Compte à rebours si promo */}
        {isPromo && <CountdownTimer />}

        {/* Badge stock bas */}
        {lowStock && (
          <div style={{
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 8, padding: '7px 12px', marginBottom: 12,
            fontSize: 12, fontWeight: 700, color: '#f87171',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            🔥 Plus que <strong>{p.stock}</strong> en stock — commandez vite !
          </div>
        )}
        {outOfStock && (
          <div style={{
            background: 'rgba(100,100,100,.1)', border: '1px solid rgba(100,100,100,.3)',
            borderRadius: 8, padding: '7px 12px', marginBottom: 12,
            fontSize: 12, fontWeight: 700, color: '#888',
          }}>🚫 Produit épuisé — revenez bientôt</div>
        )}
      </div>

      {/* ── Onglets ── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)',
          padding: '0 16px', gap: 4, marginTop: 4,
        }}>
          {['desc', 'specs'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? '#C9A84C' : 'transparent'}`,
              color: tab === t ? 'white' : 'rgba(255,255,255,.4)',
              padding: '10px 14px', fontSize: 13, fontWeight: tab === t ? 800 : 600,
              cursor: 'pointer', transition: 'all .2s',
            }}>
              {t === 'desc' ? 'Description' : 'Caractéristiques'}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 16px' }}>
          {tab === 'desc' ? (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.description || 'Aucune description.') }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {specs.length === 0
                ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Aucune caractéristique.</p>
                : specs.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '9px 12px',
                  }}>
                    <span style={{ color: '#C9A84C', fontWeight: 800, fontSize: 13 }}>✓</span>
                    <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 13 }}>{s}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Boutons d'achat principaux (référence pour sticky) ── */}
      <div ref={buyBarRef} style={{
        display: 'flex', gap: 10, padding: '8px 16px 16px', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{
            background: 'none', border: 'none', color: 'white', width: 40, height: 44,
            fontSize: 18, cursor: 'pointer',
          }}>−</button>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 15, minWidth: 28, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(q => q + 1)} style={{
            background: 'none', border: 'none', color: '#C9A84C', width: 40, height: 44,
            fontSize: 18, cursor: 'pointer', fontWeight: 800,
          }}>+</button>
        </div>

        <button
          className="btn-cart"
          style={{ flex: 1, opacity: outOfStock ? .4 : 1 }}
          disabled={outOfStock}
          onClick={() => onAddToCart(qty)}
        >🛒 Panier</button>

        <button
          className="btn-buy"
          style={{ flex: 2, opacity: outOfStock ? .4 : 1 }}
          disabled={outOfStock}
          onClick={() => onBuyNow(qty)}
        >⚡ Commander</button>
      </div>

      {/* ── Avis clients ── */}
      <ReviewSection productId={p.id} />

      {/* ── Produits similaires ── */}
      {similaires.length > 0 && (
        <div style={{ padding: '0 16px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.06em', marginBottom: 12 }}>
            VOUS AIMEREZ AUSSI
          </h3>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {similaires.map(sim => (
              <div key={sim.id} onClick={() => onClose() || setTimeout(() => onBuyNow && window.dispatchEvent(new CustomEvent('openProduct', { detail: sim })), 100)}
                style={{
                  background: '#141414', border: '1px solid rgba(255,255,255,.07)',
                  borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                  width: 140, flexShrink: 0,
                }}>
                <div style={{ height: 100, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {sim.img
                    ? <img src={sim.img} alt={sim.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 36 }}>{sim.emoji || '📦'}</span>}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: 'white', fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sim.nom}</div>
                  <div style={{ fontSize: 12, color: '#C9A84C', fontWeight: 800 }}>{fmt(sim.prix)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          STICKY BAR — apparaît en scrollant
      ════════════════════════════════════════ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 200,
        background: 'rgba(10,10,10,.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(201,168,76,.2)',
        padding: '10px 16px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        transform: stickyVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .25s cubic-bezier(.22,1,.36,1)',
        boxShadow: '0 -8px 32px rgba(0,0,0,.6)',
      }}>
        {/* Miniature + nom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {(p.img || curImg) && (
            <img src={p.img || curImg} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'white', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
            <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 900 }}>{fmt(p.prix)}</div>
          </div>
        </div>

        {/* Bouton commander sticky */}
        <button
          disabled={outOfStock}
          onClick={() => onBuyNow(qty)}
          style={{
            background: outOfStock ? '#333' : 'linear-gradient(135deg, #C9A84C, #E9C46A)',
            border: 'none', borderRadius: 12,
            padding: '11px 20px',
            color: outOfStock ? '#666' : '#000',
            fontSize: 13, fontWeight: 900,
            cursor: outOfStock ? 'not-allowed' : 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          {outOfStock ? '🚫 Épuisé' : '⚡ Commander'}
        </button>
      </div>

      {/* ── Lightbox photos ── */}
      {/* ── Lightbox plein écran ── */}
      {lb && (
        <LightBox
          imgs={imgs}
          curImg={curImg}
          imgIdx={imgIdx}
          setImgIdx={setImgIdx}
          onClose={() => setLb(false)}
        />
      )}
    </div>
  )
}