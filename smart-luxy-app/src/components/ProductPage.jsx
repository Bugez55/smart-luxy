import { useState, useEffect } from 'react'
import ReviewSection from './ReviewSection'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function ProductPage({ product: p, allProducts, onClose, onAddToCart, onBuyNow }) {
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('desc')
  const [imgIdx, setImgIdx] = useState(0)
  const [lb, setLb] = useState(false)

  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
  const specs = (() => { try { return typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || []) } catch { return [] } })()
  const hasImgs = imgs.length > 0
  const curImg = hasImgs ? imgs[imgIdx]?.url : p.img

  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
  const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5

  // Produits similaires (même catégorie, sauf ce produit)
  const similaires = (allProducts || [])
    .filter(x => x.id !== p.id && x.categorie === p.categorie && x.is_active)
    .slice(0, 4)

  useEffect(() => {
    setQty(1); setImgIdx(0); setTab('desc')
    const onKey = e => {
      if (e.key === 'Escape') { if (lb) setLb(false); else onClose() }
      if (lb) {
        if (e.key === 'ArrowRight') setImgIdx(i => (i + 1) % imgs.length)
        if (e.key === 'ArrowLeft')  setImgIdx(i => (i - 1 + imgs.length) % imgs.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p.id, lb])

  const disc = p.prix_old && p.prix_old > p.prix ? Math.round(100 - (p.prix / p.prix_old) * 100) : 0

  return (
    <>
      <div className="pp on">
        {/* Close bar */}
        <div className="pp-close">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn-close" onClick={onClose}>✕</button>
            <span style={{ fontSize:13, color:'var(--g4)' }}>Détail produit</span>
          </div>
          {p.badge && <div className="pcard-badge">{p.badge}</div>}
        </div>

        {/* Main image */}
        <div className="pp-main-img" onClick={() => curImg && setLb(true)} style={{ position:'relative' }}>
          {curImg
            ? <img src={curImg} alt={p.nom} />
            : <span className="pp-emoji-bg">{p.emoji || '📦'}</span>
          }
          {/* Stock badge sur l'image */}
          {lowStock && !outOfStock && (
            <div style={{
              position:'absolute', top:12, left:12, zIndex:5,
              background:'rgba(239,68,68,.92)', color:'white',
              fontSize:11, fontWeight:900, padding:'5px 12px',
              borderRadius:20, letterSpacing:'.03em',
              animation:'stockPulse 1.5s ease-in-out infinite',
              boxShadow:'0 4px 12px rgba(239,68,68,.4)',
            }}>
              🔥 Plus que {p.stock} disponibles !
            </div>
          )}
          {outOfStock && (
            <div style={{
              position:'absolute', inset:0, background:'rgba(0,0,0,.6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, fontWeight:900, color:'#fca5a5', letterSpacing:'.05em',
            }}>ÉPUISÉ</div>
          )}
        </div>

        {/* Thumbnails */}
        {hasImgs && imgs.length > 1 && (
          <div className="pp-thumbs">
            {imgs.map((img, i) => (
              <div key={i} className={`pp-thumb ${i === imgIdx ? 'active' : ''}`} onClick={() => setImgIdx(i)}>
                <img src={img.url} alt={img.label || ''} />
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="pp-info">
          <div className="pp-name">{p.nom}</div>
          <div className="pp-prices">
            <span className="pp-prix">{fmt(p.prix)}</span>
            {p.prix_old > p.prix && <span className="pp-old">{fmt(p.prix_old)}</span>}
            {disc > 0 && <span style={{ background:'#ef4444', color:'white', borderRadius:6, fontSize:11, fontWeight:800, padding:'2px 7px' }}>-{disc}%</span>}
          </div>

          {/* Tabs */}
          <div className="pp-tabs">
            {[['desc','Description'],['specs','Caractéristiques'],['media','Photos']].map(([k, label]) => (
              (k !== 'media' || hasImgs) &&
              <button key={k} className={`pp-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>

          {tab === 'desc' && (
            <div className="pp-desc" dangerouslySetInnerHTML={{ __html: (p.description || 'Aucune description disponible.').replace(/\n/g, '<br>') }} />
          )}
          {tab === 'specs' && (
            <div>
              {specs.length > 0
                ? specs.map((s, i) => <div key={i} className="pp-spec">{s}</div>)
                : <p style={{ color:'var(--g4)', fontSize:14 }}>Aucune spécification disponible.</p>
              }
            </div>
          )}
          {tab === 'media' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {imgs.map((img, i) => (
                <div key={i} style={{ borderRadius:8, overflow:'hidden', aspectRatio:'1', cursor:'zoom-in', background:'var(--card)' }}
                  onClick={() => { setImgIdx(i); setLb(true) }}>
                  <img src={img.url} alt={img.label || ''} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* ── Avis clients ── */}
          <div style={{ borderTop:'1px solid #2a2a2a', marginTop:24, paddingTop:20 }}>
            <ReviewSection productId={p.id} />
          </div>

          {/* ── Produits similaires ── */}
          {similaires.length > 0 && (
            <div style={{ borderTop:'1px solid #2a2a2a', marginTop:24, paddingTop:20 }}>
              <div style={{ fontSize:14, fontWeight:900, color:'white', marginBottom:14 }}>
                🔗 Vous aimerez aussi
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                {similaires.map(sim => {
                  const simImgs = (() => { try { return typeof sim.images === 'string' ? JSON.parse(sim.images) : (sim.images || []) } catch { return [] } })()
                  const simImg = simImgs[0]?.url || sim.img
                  return (
                    <div
                      key={sim.id}
                      onClick={() => onClose() || setTimeout(() => onBuyNow && window.dispatchEvent(new CustomEvent('openProduct', { detail: sim })), 100)}
                      style={{
                        background:'#1c1c1c', border:'1px solid #2a2a2a',
                        borderRadius:12, overflow:'hidden', cursor:'pointer',
                        transition:'border-color .2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(201,168,76,.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='#2a2a2a'}
                    >
                      <div style={{ height:100, background:'#252525', overflow:'hidden' }}>
                        {simImg
                          ? <img src={simImg} alt={sim.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>{sim.emoji || '📦'}</div>
                        }
                      </div>
                      <div style={{ padding:'8px 10px' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'white', marginBottom:3, lineHeight:1.3,
                          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                          {sim.nom}
                        </div>
                        <div style={{ fontSize:13, fontWeight:900, color:'#C9A84C' }}>{fmt(sim.prix)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ height:100 }} />
        </div>

        {/* Sticky buy bar */}
        <div className="pp-buy-bar">
          <div className="pp-qty">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <button className="btn-cart" style={{ flex:1, opacity:outOfStock?.4:1 }} disabled={outOfStock} onClick={() => onAddToCart(qty)}>
            🛒 Ajouter au panier
          </button>
          <button className="btn-buy" style={{ flex:1, opacity:outOfStock?.4:1 }} disabled={outOfStock} onClick={() => onBuyNow(qty)}>
            ⚡ Commander
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lb && (
        <div className="lb" onClick={() => setLb(false)}>
          <img src={curImg} alt="" onClick={e => e.stopPropagation()} />
          <button className="lb-close" onClick={() => setLb(false)}>✕</button>
          {imgs.length > 1 && <>
            <button className="lb-nav prev" onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + imgs.length) % imgs.length) }}>‹</button>
            <button className="lb-nav next" onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % imgs.length) }}>›</button>
          </>}
        </div>
      )}

      <style>{`
        @keyframes stockPulse {
          0%,100% { transform:scale(1); }
          50%      { transform:scale(1.03); }
        }
      `}</style>
    </>
  )
}
