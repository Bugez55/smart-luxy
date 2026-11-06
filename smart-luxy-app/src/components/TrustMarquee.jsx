export default function TrustMarquee() {
  const items = [
    { icon: '✓', text: 'Produits sélectionnés' },
    { icon: '💬', text: 'Support client' },
  ]

  return (
    <section className="wz-trust-marquee" aria-label="Les engagements WAZYO">
      <div className="wz-trust-inner">
        {items.map((item, index) => (
          <div className="wz-trust-item" key={item.text}>
            <span className="wz-trust-icon" aria-hidden="true">{item.icon}</span>
            <span className="wz-trust-text">{item.text}</span>
            {index < items.length - 1 && <span className="wz-trust-divider" aria-hidden="true" />}
          </div>
        ))}
      </div>

      <style>{`
        .wz-trust-marquee{
          position:relative;
          width:100%;
          overflow:hidden;
          background:linear-gradient(90deg,#090a0d 0%,#11131a 50%,#090a0d 100%);
          border-top:1px solid rgba(213,183,112,.13);
          border-bottom:1px solid rgba(213,183,112,.16);
        }
        .wz-trust-marquee::before{
          content:"";
          position:absolute;
          top:0;
          left:50%;
          width:min(460px,48vw);
          height:1px;
          transform:translateX(-50%);
          background:linear-gradient(90deg,transparent,rgba(213,183,112,.54),transparent);
        }
        .wz-trust-inner{
          width:min(760px,100%);
          min-height:66px;
          margin:0 auto;
          padding:10px 20px;
          box-sizing:border-box;
          display:grid;
          grid-template-columns:1fr 1fr;
          align-items:center;
        }
        .wz-trust-item{
          position:relative;
          min-width:0;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          padding:8px 18px;
        }
        .wz-trust-icon{
          width:30px;
          height:30px;
          flex:0 0 30px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(213,183,112,.36);
          border-radius:50%;
          background:rgba(213,183,112,.07);
          color:#e2c781;
          font-size:14px;
          font-weight:800;
          line-height:1;
        }
        .wz-trust-text{
          color:rgba(247,244,237,.84);
          font-family:'Outfit',system-ui,sans-serif;
          font-size:11px;
          font-weight:750;
          letter-spacing:.075em;
          text-transform:uppercase;
        }
        .wz-trust-divider{
          position:absolute;
          top:50%;
          right:0;
          width:1px;
          height:26px;
          transform:translateY(-50%);
          background:linear-gradient(180deg,transparent,rgba(213,183,112,.38),transparent);
        }
        @media(max-width:520px){
          .wz-trust-inner{min-height:58px;padding:8px 8px;}
          .wz-trust-item{gap:8px;padding:7px 8px;}
          .wz-trust-icon{width:26px;height:26px;flex-basis:26px;font-size:12px;}
          .wz-trust-text{font-size:9px;letter-spacing:.035em;}
          .wz-trust-divider{height:22px;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-trust-marquee *{animation:none!important;transition:none!important;}
        }
      `}</style>
    </section>
  )
}
