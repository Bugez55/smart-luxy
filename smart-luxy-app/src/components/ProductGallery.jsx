// ══════════════════════════════════════════════
//  GALERIE DÉFILANTE — Présentation produits
//  S'affiche en bas de la boutique
// ══════════════════════════════════════════════
import { useRef, useEffect, useState } from 'react'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function ProductGallery({ products, onProductClick }) {
  const trackRef = useRef()
  const [paused, setPaused] = useState(false)

  // Filtrer les produits avec images
  const withImgs = products.filter(p => {
    const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
    return imgs.length > 0 || p.img
  })

  if (withImgs.length < 3) return null

  // Tripler pour le scroll infini
  const all = [...withImgs, ...withImgs, ...withImgs]

  return (
    <div style={{
      padding: '40px 0 0',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Titre section */}
      <div style={{
        textAlign: 'center', marginBottom: 20, padding: '0 20px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(201,168,76,.6)', marginBottom: 6 }}>
          ✦ NOS PRODUITS ✦
        </div>
        <h2 style={{
          fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900,
          fontFamily: "'Fraunces', Georgia, serif",
          color: 'white', margin: 0,
        }}>
          Découvrez toute la collection
        </h2>
      </div>

      {/* Dégradés latéraux */}
      <div style={{
        position: 'absolute', left: 0, top: 72, bottom: 0, width: 80,
        background: 'linear-gradient(90deg, #0a0a0a, transparent)',
        zIndex: 3, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 72, bottom: 0, width: 80,
        background: 'linear-gradient(270deg, #0a0a0a, transparent)',
        zIndex: 3, pointerEvents: 'none',
      }} />

      {/* Bande défilante */}
      <div
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
        style={{
          display: 'flex',
          gap: 12,
          animation: `galleryScroll ${all.length * 3}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange: 'transform',
          width: 'max-content',
          padding: '0 12px 20px',
        }}
      >
        {all.map((p, i) => {
          const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []) } catch { return [] } })()
          const img = imgs[0]?.url || p.img
          const disc = p.prix_old && p.prix_old > p.prix ? Math.round(100 - (p.prix / p.prix_old) * 100) : 0
          const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0

          return (
            <div
              key={`${p.id}-${i}`}
              onClick={() => !outOfStock && onProductClick(p)}
              style={{
                width: 160,
                background: p.card_color || '#141414',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 16,
                overflow: 'hidden',
                cursor: outOfStock ? 'default' : 'pointer',
                flexShrink: 0,
                opacity: outOfStock ? 0.5 : 1,
                transition: 'transform .3s, box-shadow .3s, border-color .3s',
              }}
              onMouseEnter={e => {
                if (!outOfStock) {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,.5)'
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,.4)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'
              }}
            >
              {/* Image */}
              <div style={{
                height: 160, background: '#1a1a1a', overflow: 'hidden',
                position: 'relative',
              }}>
                {img
                  ? <img src={img} alt={p.nom}
                      style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.target.style.transform = ''}
                    />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:50 }}>
                      {p.emoji || '📦'}
                    </div>
                }

                {/* Badge réduction */}
                {disc > 0 && (
                  <div style={{
                    position:'absolute', top:8, left:8,
                    background:'#ef4444', color:'white',
                    fontSize:10, fontWeight:900, padding:'2px 7px', borderRadius:6,
                  }}>-{disc}%</div>
                )}

                {/* Épuisé */}
                {outOfStock && (
                  <div style={{
                    position:'absolute', inset:0,
                    background:'rgba(0,0,0,.6)', display:'flex',
                    alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:800, color:'#fca5a5', letterSpacing:'.06em',
                  }}>ÉPUISÉ</div>
                )}
              </div>

              {/* Infos */}
              <div style={{ padding:'10px 12px' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'white',
                  marginBottom: 4, overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.3, height: 32,
                }}>
                  {p.nom}
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 900, color: '#C9A84C',
                  marginBottom: p.ventes > 0 ? 4 : 0,
                }}>{fmt(p.prix)}</div>
                {p.ventes > 0 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontWeight: 700 }}>
                    ⚡ {p.ventes} vendus
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes galleryScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
      `}</style>
    </div>
  )
}
