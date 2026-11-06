
// BANDE DE CONFIANCE WAZYO — présentation statique premium
// Modifications visuelles uniquement : les avantages affichés sont conservés.
export default function TrustMarquee() {
  const items = [
    { icon: '🚚', text: 'Livraison 69 wilayas' },
    { icon: '💵', text: 'Paiement à la livraison' },
    { icon: '✓', text: 'Produits sélectionnés' },
    { icon: '💬', text: 'Support client' },
  ]

  return (
    <section className="wz-trust" aria-label="Avantages Wazyo">
      <div className="wz-trust__glow" aria-hidden="true" />

      <div className="wz-trust__inner">
        {items.map((item, index) => (
          <div className="wz-trust__item" key={index}>
            <span className="wz-trust__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="wz-trust__text">{item.text}</span>
            {index < items.length - 1 && (
              <span className="wz-trust__separator" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <style>{`
        .wz-trust{
          position:relative;
          z-index:1;
          width:100%;
          overflow:hidden;
          isolation:isolate;
          box-sizing:border-box;
          padding:16px clamp(14px,3vw,28px);
          background:linear-gradient(180deg,#10131a 0%,#0b0e14 100%);
          border-top:1px solid rgba(213,183,112,.12);
          border-bottom:1px solid rgba(213,183,112,.14);
        }

        .wz-trust__glow{
          position:absolute;
          inset:-48px 15% auto;
          height:100px;
          background:radial-gradient(ellipse,rgba(213,183,112,.10),transparent 68%);
          filter:blur(14px);
          pointer-events:none;
          z-index:-1;
        }

        .wz-trust__inner{
          position:relative;
          width:100%;
          max-width:1160px;
          margin:0 auto;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
        }

        .wz-trust__item{
          position:relative;
          min-width:0;
          min-height:54px;
          box-sizing:border-box;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:11px;
          padding:10px 12px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:13px;
          background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));
          transition:transform .25s ease,border-color .25s ease,background .25s ease;
        }

        .wz-trust__icon{
          width:30px;
          height:30px;
          flex:0 0 30px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(213,183,112,.27);
          border-radius:50%;
          background:rgba(213,183,112,.075);
          color:#d5b770;
          font-size:14px;
          line-height:1;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
        }

        .wz-trust__text{
          min-width:0;
          color:rgba(247,244,237,.82);
          font-size:10px;
          font-weight:800;
          line-height:1.35;
          letter-spacing:.075em;
          text-align:left;
          text-transform:uppercase;
        }

        .wz-trust__separator{display:none;}

        @media (hover:hover) and (pointer:fine){
          .wz-trust__item:hover{
            transform:translateY(-2px);
            border-color:rgba(213,183,112,.24);
            background:linear-gradient(145deg,rgba(213,183,112,.075),rgba(255,255,255,.018));
          }
          .wz-trust__item:hover .wz-trust__icon{
            box-shadow:0 0 18px rgba(213,183,112,.12),inset 0 1px 0 rgba(255,255,255,.05);
          }
        }

        @media(max-width:760px){
          .wz-trust{padding:12px 14px;}
          .wz-trust__inner{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
          .wz-trust__item{min-height:48px;justify-content:flex-start;padding:8px 10px;gap:9px;}
          .wz-trust__icon{width:27px;height:27px;flex-basis:27px;font-size:12px;}
          .wz-trust__text{font-size:9px;letter-spacing:.045em;}
        }

        @media(max-width:360px){
          .wz-trust__inner{gap:6px;}
          .wz-trust__item{padding:7px;gap:7px;}
          .wz-trust__text{font-size:8px;letter-spacing:.025em;}
        }

        @media(prefers-reduced-motion:reduce){
          .wz-trust__item,.wz-trust__icon{transition:none!important;}
          .wz-trust__item:hover{transform:none!important;}
        }
      `}</style>
    </section>
  )
}
