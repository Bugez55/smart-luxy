// ══════════════════════════════════════════════
// HERO — Wazyo Premium
// Visuel haut de gamme, responsive, sans dépendance externe
// ══════════════════════════════════════════════
import { useState, useEffect } from 'react'

export default function Hero({ onScrollToCollection, onDiscoverProduct, heroImage }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <section className="wz-hero">
      <div className="wz-hero-media" aria-hidden="true">
        <img
          src={heroImage || 'https://images.pexels.com/photos/5237706/pexels-photo-5237706.jpeg?auto=compress&cs=tinysrgb&w=1600'}
          alt=""
          className={`wz-hero-image ${loaded ? 'is-loaded' : ''}`}
        />
        <div className="wz-hero-overlay" />
        <div className="wz-hero-glow" />
      </div>

      <div className="wz-hero-inner">
        <div className={`wz-hero-content ${loaded ? 'is-loaded' : ''}`}>
          <div className="wz-hero-kicker">
            <span className="wz-hero-kicker-line" />
            <span>Wazyo · Boutique en ligne</span>
          </div>

          <h1 className="wz-hero-title">
            Des produits utiles.
            <br />
            <span>Des choix simples.</span>
          </h1>

          <p className="wz-hero-subtitle">
            Une sélection pensée pour le quotidien, avec livraison partout en Algérie et paiement à la livraison.
          </p>

          <div className="wz-hero-actions">
            <button
              type="button"
              onClick={onScrollToCollection}
              className="wz-hero-primary"
            >
              Découvrir la collection
              <span aria-hidden="true">→</span>
            </button>

            {onDiscoverProduct && (
              <button
                type="button"
                onClick={onDiscoverProduct}
                className="wz-hero-secondary"
              >
                Voir le produit phare
              </button>
            )}
          </div>

          <div className="wz-hero-trust">
            <span><strong>69</strong> wilayas</span>
            <i aria-hidden="true" />
            <span>Paiement à la livraison</span>
            <i aria-hidden="true" />
            <span>Support WhatsApp</span>
          </div>
        </div>
      </div>

      <div className="wz-hero-scroll" aria-hidden="true">
        <span className="wz-hero-scroll-line" />
        <span>Défiler</span>
      </div>

      <style>{`
        .wz-hero {
          position: relative;
          min-height: min(860px, 100svh);
          height: min(860px, 100svh);
          overflow: hidden;
          background: #070707;
          isolation: isolate;
        }

        .wz-hero-media,
        .wz-hero-overlay,
        .wz-hero-glow {
          position: absolute;
          inset: 0;
        }

        .wz-hero-media {
          z-index: -3;
          overflow: hidden;
        }

        .wz-hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: .72;
          transform: scale(1.06);
          transition: opacity 1.1s ease, transform 1.8s cubic-bezier(.2,.65,.2,1);
          filter: saturate(.84) contrast(1.05);
        }

        .wz-hero-image.is-loaded {
          opacity: .88;
          transform: scale(1);
        }

        .wz-hero-overlay {
          z-index: -2;
          background:
            linear-gradient(90deg, rgba(5,5,5,.97) 0%, rgba(5,5,5,.88) 28%, rgba(5,5,5,.48) 58%, rgba(5,5,5,.14) 100%),
            linear-gradient(0deg, rgba(5,5,5,.76) 0%, rgba(5,5,5,.08) 48%, rgba(5,5,5,.22) 100%);
        }

        .wz-hero-glow {
          z-index: -1;
          background:
            radial-gradient(circle at 18% 48%, rgba(201,168,76,.12), transparent 34%),
            radial-gradient(circle at 82% 18%, rgba(255,255,255,.055), transparent 25%);
          pointer-events: none;
        }

        .wz-hero-inner {
          width: min(1240px, calc(100% - 48px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .wz-hero-content {
          width: min(720px, 100%);
          padding: 72px 0 54px;
          opacity: 0;
          transform: translateY(22px);
          transition: opacity .75s ease, transform .75s cubic-bezier(.22,1,.36,1);
        }

        .wz-hero-content.is-loaded {
          opacity: 1;
          transform: translateY(0);
        }

        .wz-hero-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: rgba(255,255,255,.62);
          font-size: 11px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .wz-hero-kicker-line {
          width: 34px;
          height: 1px;
          background: #c9a84c;
          box-shadow: 0 0 16px rgba(201,168,76,.28);
        }

        .wz-hero-title {
          margin: 0;
          max-width: 760px;
          color: #fff;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(46px, 7vw, 92px);
          line-height: .94;
          font-weight: 600;
          letter-spacing: -.045em;
        }

        .wz-hero-title span {
          color: #c9a84c;
          font-style: italic;
          font-weight: 500;
        }

        .wz-hero-subtitle {
          max-width: 510px;
          margin: 26px 0 0;
          color: rgba(255,255,255,.7);
          font-size: 16px;
          line-height: 1.72;
        }

        .wz-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .wz-hero-primary,
        .wz-hero-secondary {
          min-height: 52px;
          padding: 0 22px;
          border-radius: 2px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
          transition: transform .2s ease, background .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease;
        }

        .wz-hero-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid #c9a84c;
          background: #c9a84c;
          color: #090909;
          box-shadow: 0 12px 30px rgba(0,0,0,.18);
        }

        .wz-hero-primary:hover {
          background: #e0c574;
          border-color: #e0c574;
          transform: translateY(-2px);
        }

        .wz-hero-secondary {
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.025);
          color: #fff;
          backdrop-filter: blur(8px);
        }

        .wz-hero-secondary:hover {
          border-color: rgba(201,168,76,.7);
          background: rgba(201,168,76,.08);
          transform: translateY(-2px);
        }

        .wz-hero-trust {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 27px;
          color: rgba(255,255,255,.42);
          font-size: 10px;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .wz-hero-trust strong {
          color: rgba(255,255,255,.72);
          font-weight: 800;
        }

        .wz-hero-trust i {
          display: block;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(201,168,76,.7);
        }

        .wz-hero-scroll {
          position: absolute;
          right: 28px;
          bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.4);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          writing-mode: vertical-rl;
        }

        .wz-hero-scroll-line {
          width: 1px;
          height: 46px;
          background: linear-gradient(to bottom, rgba(201,168,76,.75), rgba(255,255,255,.08));
        }

        @media (max-width: 820px) {
          .wz-hero {
            min-height: 760px;
            height: min(820px, 100svh);
          }

          .wz-hero-inner {
            width: min(100% - 34px, 620px);
            align-items: flex-end;
          }

          .wz-hero-content {
            padding: 0 0 58px;
          }

          .wz-hero-image {
            object-position: 62% center;
          }

          .wz-hero-overlay {
            background:
              linear-gradient(180deg, rgba(5,5,5,.18) 0%, rgba(5,5,5,.52) 42%, rgba(5,5,5,.97) 88%),
              linear-gradient(90deg, rgba(5,5,5,.56), rgba(5,5,5,.08));
          }

          .wz-hero-title {
            font-size: clamp(42px, 13vw, 68px);
          }

          .wz-hero-subtitle {
            font-size: 14px;
            max-width: 420px;
          }

          .wz-hero-scroll {
            display: none;
          }
        }

        @media (max-width: 520px) {
          .wz-hero {
            min-height: 700px;
            height: 92svh;
          }

          .wz-hero-inner {
            width: calc(100% - 28px);
          }

          .wz-hero-content {
            padding-bottom: 42px;
          }

          .wz-hero-kicker {
            margin-bottom: 15px;
            font-size: 9px;
            letter-spacing: .14em;
          }

          .wz-hero-title {
            font-size: clamp(38px, 14vw, 58px);
            line-height: .97;
          }

          .wz-hero-subtitle {
            margin-top: 19px;
            font-size: 13px;
            line-height: 1.62;
          }

          .wz-hero-actions {
            margin-top: 24px;
            gap: 9px;
          }

          .wz-hero-primary,
          .wz-hero-secondary {
            width: 100%;
            min-height: 50px;
          }

          .wz-hero-trust {
            gap: 7px;
            margin-top: 18px;
            font-size: 8px;
            line-height: 1.4;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wz-hero-image,
          .wz-hero-content,
          .wz-hero-primary,
          .wz-hero-secondary {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  )
}
