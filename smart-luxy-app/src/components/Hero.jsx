// ══════════════════════════════════════════════
//  HERO — Page d'accueil premium
//  Style plein écran, image + titre + CTA
//  Aucune dépendance externe — 100% compatible avec le code existant
// ══════════════════════════════════════════════
import { useState, useEffect } from 'react'

export default function Hero({ onScrollToCollection, onDiscoverProduct, heroImage }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <section style={{
      position: 'relative',
      height: '100svh',
      minHeight: 640,
      display: 'flex',
      alignItems: 'flex-end',
      overflow: 'hidden',
      background: '#000',
    }}>
      {/* Image de fond */}
      <img
        src={heroImage || 'https://images.pexels.com/photos/5237706/pexels-photo-5237706.jpeg?auto=compress&cs=tinysrgb&w=1600'}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          transform: loaded ? 'scale(1)' : 'scale(1.08)',
          opacity: loaded ? 1 : 0.6,
          transition: 'transform 1.5s ease-out, opacity 1.5s ease-out',
        }}
      />

      {/* Dégradé sombre */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(90deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.66) 35%, rgba(0,0,0,.12) 66%, rgba(0,0,0,.26) 100%),
                     linear-gradient(0deg, rgba(0,0,0,.63) 0%, transparent 45%)`,
      }} />

      {/* Contenu */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 1400, margin: '0 auto',
        padding: '0 20px 80px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          maxWidth: 720,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity .65s ease-out .1s, transform .65s ease-out .1s',
        }}>
          {/* Eyebrow */}
          <p style={{
            margin: '0 0 18px',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '.32em', textTransform: 'uppercase',
            color: '#C9A84C',
          }}>Collection signature 2026</p>

          {/* Titre géant */}
          <h1 style={{
            margin: 0,
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(52px, 10vw, 130px)',
            lineHeight: 0.85,
            letterSpacing: '-0.03em',
            color: 'white',
            fontWeight: 700,
          }}>
            Smart<br/>
            <span style={{ fontStyle: 'italic', color: '#C9A84C' }}>Luxy.</span>
          </h1>

          {/* Sous-titre */}
          <p style={{
            margin: '32px 0 0',
            maxWidth: 420,
            fontSize: 17, lineHeight: 1.7,
            color: 'rgba(255,255,255,.7)',
          }}>
            La boutique qui a du caractère. Une sélection de produits de qualité, livrée partout en Algérie.
          </p>

          {/* Boutons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 36 }}>
            <button
              onClick={onScrollToCollection}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                minHeight: 52, padding: '0 26px',
                background: '#C9A84C', border: 'none',
                fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                color: '#090909', cursor: 'pointer',
                transition: 'background .25s, transform .25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dfc474'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#C9A84C'; e.currentTarget.style.transform = '' }}
            >
              Découvrir la collection →
            </button>

            {onDiscoverProduct && (
              <button
                onClick={onDiscoverProduct}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 52, padding: '0 26px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,.3)',
                  fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                  color: 'white', cursor: 'pointer',
                  transition: 'border-color .25s, background .25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)'; e.currentTarget.style.background = 'transparent' }}
              >
                Voir le produit phare
              </button>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 28, right: 32,
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.4)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity .6s ease 1.2s',
        }}
        className="hero-scroll-hint"
        >
          <span style={{ width: 48, height: 1, background: 'rgba(255,255,255,.3)' }} />
          Faites défiler
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-scroll-hint { display: none; }
        }
      `}</style>
    </section>
  )
}
