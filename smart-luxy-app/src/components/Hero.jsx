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
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            className={`wz-hero-image ${loaded ? 'is-loaded' : ''}`}
          />
        ) : (
          <div className="wz-hero-fallback" />
        )}
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
            L’essentiel,
            <br />
            <span>mieux choisi.</span>
          </h1>

          <p className="wz-hero-subtitle">
            Une sélection de produits utiles, présentés avec simplicité. Livraison dans les 69 wilayas et paiement à la livraison.
          </p>

          <div className="wz-hero-actions">
            <button
              type="button"
              onClick={onScrollToCollection}
              className="wz-hero-primary"
            >
              Explorer la collection
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

          <div className="wz-hero-note">
            <span className="wz-hero-note-dot" />
            <span>Une expérience pensée pour aller droit à l’essentiel.</span>
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
          min-height: min(820px, 92svh);
          height: min(820px, 92svh);
          overflow: hidden;
          background: #070707;
          isolation: isolate;
          border-bottom: 1px solid rgba(255,255,255,.05);
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
          background:
            radial-gradient(circle at 72% 35%, rgba(212,181,106,.11), transparent 20%),
            linear-gradient(135deg, #10100f 0%, #080808 58%, #060606 100%);
        }

        .wz-hero-fallback {
          width: 100%;
          height: 100%;
          background:
            radial-gradient(circle at 76% 42%, rgba(212,181,106,.14), transparent 20%),
            radial-gradient(circle at 62% 68%, rgba(255,255,255,.035), transparent 24%),
            linear-gradient(135deg, #11110f 0%, #090909 56%, #060606 100%);
        }

        .wz-hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: .64;
          transform: scale(1.035);
          transition: opacity 1s ease, transform 1.7s cubic-bezier(.2,.65,.2,1);
          filter: saturate(.78) contrast(1.06) brightness(.92);
        }

        .wz-hero-image.is-loaded {
          opacity: .76;
          transform: scale(1);
        }

        .wz-hero-overlay {
          z-index: -2;
          background:
            linear-gradient(90deg, rgba(5,5,5,.985) 0%, rgba(5,5,5,.92) 28%, rgba(5,5,5,.57) 61%, rgba(5,5,5,.16) 100%),
            linear-gradient(0deg, rgba(5,5,5,.82) 0%, rgba(5,5,5,.10) 48%, rgba(5,5,5,.22) 100%);
        }

        .wz-hero-glow {
          z-index: -1;
          background:
            radial-gradient(circle at 16% 50%, rgba(212,181,106,.08), transparent 30%),
            radial-gradient(circle at 80% 22%, rgba(255,255,255,.045), transparent 23%),
            linear-gradient(120deg, transparent 42%, rgba(212,181,106,.03) 68%, transparent 100%);
          pointer-events: none;
        }

        .wz-hero-inner {
          width: min(1280px, calc(100% - 56px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .wz-hero-content {
          width: min(760px, 100%);
          padding: 74px 0 58px;
          position: relative;
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
          font-size: clamp(50px, 7.4vw, 96px);
          line-height: .93;
          font-weight: 600;
          letter-spacing: -.052em;
          text-wrap: balance;
        }

        .wz-hero-title span {
          color: #d6b86f;
          font-style: italic;
          font-weight: 500;
          position: relative;
        }

        .wz-hero-subtitle {
          max-width: 510px;
          margin: 26px 0 0;
          color: rgba(255,255,255,.66);
          font-size: 15px;
          line-height: 1.78;
          max-width: 540px;
        }

        .wz-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .wz-hero-primary,
        .wz-hero-secondary {
          min-height: 50px;
          padding: 0 21px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .11em;
          text-transform: uppercase;
          transition: transform .2s ease, background .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease;
        }

        .wz-hero-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid #d6b86f;
          background: linear-gradient(135deg, #d9bd79, #c3a057);
          color: #11100c;
          box-shadow: 0 14px 32px rgba(0,0,0,.24), 0 0 0 1px rgba(255,255,255,.08) inset;
        }

        .wz-hero-primary:hover {
          background: linear-gradient(135deg, #e7cc8e, #cfb06a);
          border-color: #e7cc8e;
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(0,0,0,.28);
        }

        .wz-hero-secondary {
          border: 1px solid rgba(255,255,255,.15);
          background: rgba(255,255,255,.03);
          color: #fff;
          backdrop-filter: blur(8px);
        }

        .wz-hero-secondary:hover {
          border-color: rgba(212,181,106,.45);
          background: rgba(212,181,106,.07);
          transform: translateY(-2px);
        }

        .wz-hero-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 17px;
          color: rgba(255,255,255,.34);
          font-size: 10px;
          line-height: 1.5;
          letter-spacing: .03em;
        }

        .wz-hero-note-dot {
          width: 6px;
          height: 6px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #d6b86f;
          box-shadow: 0 0 12px rgba(212,181,106,.45);
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
            max-width: 430px;
          }

          .wz-hero-scroll {
            display: none;
          }
        }

        @media (max-width: 520px) {
          .wz-hero {
            min-height: 680px;
            height: 90svh;
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
            margin-top: 18px;
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

          .wz-hero-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 17px;
          color: rgba(255,255,255,.34);
          font-size: 10px;
          line-height: 1.5;
          letter-spacing: .03em;
        }

        .wz-hero-note-dot {
          width: 6px;
          height: 6px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #d6b86f;
          box-shadow: 0 0 12px rgba(212,181,106,.45);
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
