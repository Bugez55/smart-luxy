import { useState, useEffect } from 'react'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function ProductPage({ product: p, onClose, onAddToCart, onBuyNow }) {
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('desc')
  const [imgIdx, setImgIdx] = useState(0)
  const [lb, setLb] = useState(false)

  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
  const specs = (() => { try { return typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || []) } catch { return [] } })()
  const hasImgs = imgs.length > 0
  const curImg = hasImgs ? imgs[imgIdx]?.url : p.img

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

  const disc = p.prix_old && p.prix_old > p.prix
    ? Math.round(100 - (p.prix / p.prix_old) * 100) : 0

  return (
    <>
      <div className="pp on">
        {/* Close bar */}
        <div className="pp-close">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-close" onClick={onClose}>✕</button>
            <span style={{ fontSize: 13, color: 'var(--g4)' }}>Détail produit</span>
          </div>
          {p.badge && <div className="pcard-badge">{p.badge}</div>}
        </div>

        {/* Main image */}
        <div className="pp-main-img" onClick={() => curImg && setLb(true)}>
          {curImg
            ? <img src={curImg} alt={p.nom} />
            : <span className="pp-emoji-bg">{p.emoji || '📦'}</span>
          }
        </div>

        {/* Thumbnails */}
        {hasImgs && imgs.length > 1 && (
          <div className="pp-thumbs">
            {imgs.map((img, i) => (
              <div
                key={i}
                className={`pp-thumb ${i === imgIdx ? 'active' : ''}`}
                onClick={() => setImgIdx(i)}
              >
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
            {disc > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 800, padding: '2px 7px' }}>-{disc}%</span>}
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
                : <p style={{ color: 'var(--g4)', fontSize: 14 }}>Aucune spécification disponible.</p>
              }
            </div>
          )}

          {tab === 'media' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {imgs.map((img, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '1', cursor: 'zoom-in', background: 'var(--card)' }} onClick={() => { setImgIdx(i); setLb(true) }}>
                  <img src={img.url} alt={img.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 100 }} />
        </div>

        {/* Sticky buy bar */}
        <div className="pp-buy-bar">
          <div className="pp-qty">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <button className="btn-cart" style={{ flex: 1 }} onClick={() => onAddToCart(qty)}>
            🛒 Ajouter au panier
          </button>
          <button className="btn-buy" style={{ flex: 1 }} onClick={() => onBuyNow(qty)}>
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
    </>
  )
}
