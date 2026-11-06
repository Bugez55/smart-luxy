
export default function TrustMarquee() {
  const items = [
    { icon: '✓', text: 'Produits sélectionnés' },
    { icon: '💬', text: 'Support client' },
  ]

  return (
    <section
      aria-label="Avantages Wazyo"
      className="wz-trust-marquee"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #11100e 0%, #0d0d0d 100%)',
        borderTop: '1px solid rgba(255,255,255,.07)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
      }}
    >
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
            className="wz-trust-group"
            aria-hidden={group === 1 ? 'true' : undefined}
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
              style={{ color: '#C9A84C', opacity: .65, fontSize: 12 }}
            >
              •
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes wzTrustMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .wz-trust-track {
            animation: none !important;
            transform: none !important;
          }
          .wz-trust-group:last-child { display: none !important; }
          .wz-trust-group:first-child {
            justify-content: center;
            width: 100%;
            box-sizing: border-box;
            flex-wrap: wrap;
          }
          .wz-trust-marquee { width: 100%; }
        }

        @media (max-width: 640px) {
          .wz-trust-track { animation-duration: 26s !important; }
          .wz-trust-group {
            gap: 22px !important;
            padding: 11px 14px !important;
          }

          .footer {
            padding: 26px 14px 22px !important;
            gap: 8px !important;
          }

          .footer > div:nth-of-type(2),
          .footer > div:nth-of-type(3) {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
            gap: 10px 14px !important;
            margin-top: 9px !important;
          }

          .footer > div:nth-of-type(2) > span,
          .footer > div:nth-of-type(3) > span {
            display: none !important;
          }

          .footer > div:nth-of-type(2) > a,
          .footer > div:nth-of-type(3) > button {
            font-size: 12px !important;
            line-height: 1.45 !important;
          }

          .footer > p:last-child {
            margin-top: 8px !important;
          }
        }
      `}</style>
    </section>
  )
}
