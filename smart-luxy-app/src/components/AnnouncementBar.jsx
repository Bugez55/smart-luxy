
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DEFAULT_MSGS = [
  '🚚 Livraison rapide partout en Algérie',
  '✅ Paiement à la livraison disponible',
  '🔥 Offres du moment — selon disponibilité',
  '⭐ Produits populaires sélectionnés pour toi',
  '🎁 Découvrez nos nouveautés et offres',
]

export default function AnnouncementBar() {
  const [messages, setMessages] = useState(DEFAULT_MSGS)

  useEffect(() => {
    supabase
      .from('banner_messages')
      .select('message')
      .eq('actif', true)
      .order('position', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map(d => d.message))
        }
      })
  }, [])

  if (messages.length === 0) return null

  const animationDuration = Math.max(30, messages.length * 7)

  return (
    <div
      className="wz-announcement"
      role="region"
      aria-label="Annonces et informations de la boutique"
    >
      <div className="wz-announcement__glow" aria-hidden="true" />
      <div className="wz-announcement__edge wz-announcement__edge--left" aria-hidden="true" />
      <div className="wz-announcement__edge wz-announcement__edge--right" aria-hidden="true" />

      <div className="wz-announcement__viewport">
        <div
          className="wz-announcement__track"
          style={{ animationDuration: `${animationDuration}s` }}
        >
          <div className="wz-announcement__group">
            {messages.map((msg, index) => (
              <span className="wz-announcement__item" key={`primary-${index}`}>
                <span>{msg}</span>
                <span className="wz-announcement__separator" aria-hidden="true">✦</span>
              </span>
            ))}
          </div>

          <div className="wz-announcement__group" aria-hidden="true">
            {messages.map((msg, index) => (
              <span className="wz-announcement__item" key={`duplicate-${index}`}>
                <span>{msg}</span>
                <span className="wz-announcement__separator">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .wz-announcement{
          --announcement-bg:#090b10;
          position:relative;
          z-index:101;
          width:100%;
          height:42px;
          overflow:hidden;
          isolation:isolate;
          box-sizing:border-box;
          border-top:1px solid rgba(213,183,112,.08);
          border-bottom:1px solid rgba(213,183,112,.20);
          background:linear-gradient(100deg,#090b10 0%,#151923 50%,#090b10 100%);
          box-shadow:inset 0 -1px 0 rgba(255,255,255,.025);
        }

        .wz-announcement__glow{
          position:absolute;
          inset:-35px 18% auto;
          height:70px;
          background:radial-gradient(ellipse,rgba(213,183,112,.12),transparent 68%);
          filter:blur(12px);
          pointer-events:none;
          z-index:0;
        }

        .wz-announcement__viewport{
          position:relative;
          z-index:1;
          width:100%;
          height:100%;
          display:flex;
          align-items:center;
          overflow:hidden;
        }

        .wz-announcement__track{
          display:flex;
          align-items:center;
          width:max-content;
          flex:0 0 auto;
          transform:translate3d(0,0,0);
          animation:wzAnnouncementScroll linear infinite;
          will-change:transform;
        }

        .wz-announcement__group{
          display:flex;
          align-items:center;
          flex:0 0 auto;
          width:max-content;
        }

        .wz-announcement__item{
          display:inline-flex;
          align-items:center;
          gap:18px;
          flex:0 0 auto;
          padding:0 clamp(18px,3vw,38px);
          color:rgba(247,244,237,.88);
          font-size:clamp(10px,.9vw,11.5px);
          font-weight:650;
          line-height:1;
          letter-spacing:.045em;
          white-space:nowrap;
        }

        .wz-announcement__separator{
          color:#d5b770;
          font-size:11px;
          opacity:.72;
          text-shadow:0 0 12px rgba(213,183,112,.45);
        }

        .wz-announcement__edge{
          position:absolute;
          top:0;
          bottom:0;
          z-index:2;
          width:clamp(28px,6vw,76px);
          pointer-events:none;
        }

        .wz-announcement__edge--left{
          left:0;
          background:linear-gradient(90deg,#090b10 0%,rgba(9,11,16,.78) 30%,transparent 100%);
        }

        .wz-announcement__edge--right{
          right:0;
          background:linear-gradient(270deg,#090b10 0%,rgba(9,11,16,.78) 30%,transparent 100%);
        }

        .wz-announcement:hover .wz-announcement__track{
          animation-play-state:paused;
        }

        @keyframes wzAnnouncementScroll{
          from{transform:translate3d(0,0,0);}
          to{transform:translate3d(-50%,0,0);}
        }

        @media(max-width:640px){
          .wz-announcement{height:38px;}
          .wz-announcement__item{
            gap:12px;
            padding:0 17px;
            font-size:10px;
            letter-spacing:.025em;
          }
          .wz-announcement__separator{font-size:9px;}
        }

        @media(prefers-reduced-motion:reduce){
          .wz-announcement{height:auto;min-height:40px;}
          .wz-announcement__viewport{height:auto;min-height:40px;padding:8px 18px;box-sizing:border-box;}
          .wz-announcement__track{width:100%;justify-content:center;animation:none!important;transform:none!important;}
          .wz-announcement__group:first-child{width:100%;justify-content:center;flex-wrap:wrap;}
          .wz-announcement__group:last-child{display:none;}
          .wz-announcement__item{white-space:normal;text-align:center;padding:5px 10px;}
          .wz-announcement__edge{display:none;}
        }
      `}</style>
    </div>
  )
}
