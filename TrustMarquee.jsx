// ══════════════════════════════════════════════
//  BANDE DE CONFIANCE — VERSION PREMIUM
//  Design uniquement : aucun changement de logique métier.
// ══════════════════════════════════════════════
export default function TrustMarquee() {
  const items = [
    { icon: '🚚', text: 'Livraison 69 wilayas' },
    { icon: '💵', text: 'Paiement à la livraison' },
    { icon: '✓', text: 'Produits sélectionnés' },
    { icon: '💬', text: 'Support client' },
  ]

  return (
    <section
      aria-label="Avantages Wazyo"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #11100e 0%, #0d0d0d 100%)',
        borderTop: '1px solid rgba(255,255,255,.07)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
      }}
    >
      {/* Lueur centrale très discrète */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 20%',
          background: 'radial-gradient(circle at center, rgba(201,168,76,.07), transparent 58%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="wz-trust-track"
        style={{
          position: 'relative',
          display: 'flex',
          width: 'max-content',
          whiteSpace: 'nowrap',
          animation: 'wzTrustMarquee 26s linear infinite',
          willChange: 'transform',
        }}
      >
        {[0, 1].map(group => (
          <div
            key={group}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 34,
              padding: '14px 17px',
            }}
          >
            {items.map((item, index) => (
              <div
                key={`${group}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  color: 'rgba(255,255,255,.7)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(201,168,76,.34)',
                    borderRadius: '50%',
                    color: '#C9A84C',
                    background: 'rgba(201,168,76,.06)',
                    fontSize: item.icon === '✓' ? 13 : 12,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.text}</span>
              </div>
            ))}

            <span
              aria-hidden="true"
              style={{
                color: '#C9A84C',
                opacity: .65,
                fontSize: 12,
              }}
            >
              •
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes wzTrustMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .wz-trust-track { animation: none !important; }
        }

        @media (max-width: 640px) {
          .wz-trust-track { animation-duration: 20s !important; }
        }
      `}</style>
    </section>
  )
}
