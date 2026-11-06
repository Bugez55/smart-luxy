export default function TrustMarquee() {
  const items = [
    { icon: '↗', title: 'Livraison', text: 'Partout en Algérie' },
    { icon: '✓', title: 'Paiement', text: 'À la livraison' },
    { icon: '✦', title: 'Découvertes', text: 'Plusieurs univers' },
    { icon: '✉', title: 'Contact', text: 'À votre écoute' },
  ]

  return (
    <section className="wz-trust-marquee" aria-label="Les informations WAZYO">
      <div className="wz-trust-inner">
        {items.map((item, index) => (
          <div className="wz-trust-item" key={item.title}>
            <span className="wz-trust-icon" aria-hidden="true">{item.icon}</span>
            <span className="wz-trust-copy">
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
            {index < items.length - 1 && <span className="wz-trust-divider" aria-hidden="true" />}
          </div>
        ))}
      </div>

      <style>{`
        .wz-trust-marquee{
          position:relative;
          z-index:3;
          width:min(1320px,calc(100% - 52px));
          margin:-1px auto 0;
          overflow:hidden;
          border:1px solid rgba(213,183,112,.27);
          border-radius:0 0 16px 16px;
          background:linear-gradient(100deg,rgba(8,10,14,.98),rgba(20,22,28,.98) 48%,rgba(8,10,14,.98));
          box-shadow:0 16px 42px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.045);
        }
        .wz-trust-marquee::before{
          content:"";
          position:absolute;
          top:0;
          left:50%;
          width:min(500px,52vw);
          height:1px;
          transform:translateX(-50%);
          background:linear-gradient(90deg,transparent,rgba(238,211,151,.72),transparent);
        }
        .wz-trust-inner{
          min-height:86px;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          align-items:center;
          padding:12px 10px;
          box-sizing:border-box;
        }
        .wz-trust-item{
          position:relative;
          min-width:0;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          padding:9px 12px;
        }
        .wz-trust-icon{
          width:39px;
          height:39px;
          flex:0 0 39px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(213,183,112,.44);
          border-radius:50%;
          background:radial-gradient(circle at 35% 25%,rgba(213,183,112,.18),rgba(213,183,112,.035) 72%);
          color:#e7cb8d;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:18px;
          font-weight:600;
          line-height:1;
          box-shadow:0 0 22px rgba(213,183,112,.055),inset 0 1px 0 rgba(255,255,255,.06);
        }
        .wz-trust-copy{min-width:0;display:flex;flex-direction:column;gap:4px;}
        .wz-trust-copy strong{
          color:#f7f4ed;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:11px;
          font-weight:850;
          letter-spacing:.045em;
        }
        .wz-trust-copy small{
          color:rgba(247,244,237,.53);
          font-size:10px;
          line-height:1.25;
          font-weight:550;
        }
        .wz-trust-divider{
          position:absolute;
          top:50%;
          right:0;
          width:1px;
          height:34px;
          transform:translateY(-50%);
          background:linear-gradient(180deg,transparent,rgba(213,183,112,.42),transparent);
        }
        @media(max-width:900px){
          .wz-trust-marquee{width:calc(100% - 32px);}
          .wz-trust-item{gap:8px;padding:8px;}
          .wz-trust-icon{width:32px;height:32px;flex-basis:32px;font-size:15px;}
          .wz-trust-copy strong{font-size:10px;}
          .wz-trust-copy small{font-size:9px;}
        }
        @media(max-width:620px){
          .wz-trust-marquee{width:calc(100% - 24px);border-radius:0 0 13px 13px;}
          .wz-trust-inner{grid-template-columns:repeat(2,minmax(0,1fr));min-height:0;padding:8px 5px;}
          .wz-trust-item{justify-content:flex-start;gap:9px;padding:10px 8px;}
          .wz-trust-item:nth-child(2) .wz-trust-divider{display:none;}
          .wz-trust-icon{width:30px;height:30px;flex-basis:30px;font-size:14px;}
          .wz-trust-copy strong{font-size:9px;}
          .wz-trust-copy small{font-size:8px;}
          .wz-trust-divider{height:26px;}
        }
        @media(max-width:360px){
          .wz-trust-item{padding:8px 5px;gap:7px;}
          .wz-trust-icon{width:26px;height:26px;flex-basis:26px;font-size:12px;}
          .wz-trust-copy strong{font-size:8px;}
          .wz-trust-copy small{font-size:7px;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-trust-marquee *{animation:none!important;transition:none!important;}
        }
      `}</style>
    </section>
  )
}
