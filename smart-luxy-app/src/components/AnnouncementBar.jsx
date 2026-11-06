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
      <div className="wz-announcement__viewport">
        <div
          className="wz-announcement__track"
          style={{ animationDuration: `${animationDuration}s` }}
        >
          <div className="wz-announcement__group">
            {messages.map((msg, index) => (
              <span className="wz-announcement__item" key={`primary-${index}`}>
                <span className="wz-announcement__spark" aria-hidden="true">✦</span>
                <span>{msg}</span>
              </span>
            ))}
          </div>

          <div className="wz-announcement__group" aria-hidden="true">
            {messages.map((msg, index) => (
              <span className="wz-announcement__item" key={`duplicate-${index}`}>
                <span className="wz-announcement__spark">✦</span>
                <span>{msg}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .wz-announcement{
          position:relative;
          z-index:101;
          width:100%;
          height:36px;
          overflow:hidden;
          isolation:isolate;
          box-sizing:border-box;
          border-bottom:1px solid rgba(213,183,112,.18);
          background:
            radial-gradient(ellipse at 50% -80%,rgba(213,183,112,.13),transparent 62%),
            linear-gradient(90deg,#08090c 0%,#11131a 48%,#08090c 100%);
          box-shadow:inset 0 -1px 0 rgba(255,255,255,.025);
        }
        .wz-announcement::before{
          content:"";
          position:absolute;
          top:0;
          left:50%;
          width:min(520px,54vw);
          height:1px;
          transform:translateX(-50%);
          background:linear-gradient(90deg,transparent,rgba(213,183,112,.55),transparent);
          pointer-events:none;
        }
        .wz-announcement__viewport{
          position:relative;
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
          gap:11px;
          flex:0 0 auto;
          padding:0 clamp(18px,2.7vw,34px);
          color:rgba(247,244,237,.82);
          font-family:'Outfit',system-ui,sans-serif;
          font-size:10px;
          font-weight:650;
          line-height:1;
          letter-spacing:.055em;
          white-space:nowrap;
        }
        .wz-announcement__spark{
          color:#d5b770;
          font-size:10px;
          opacity:.82;
          text-shadow:0 0 12px rgba(213,183,112,.32);
        }
        .wz-announcement:hover .wz-announcement__track{
          animation-play-state:paused;
        }
        @keyframes wzAnnouncementScroll{
          from{transform:translate3d(0,0,0);}
          to{transform:translate3d(-50%,0,0);}
        }
        @media(max-width:640px){
          .wz-announcement{height:34px;}
          .wz-announcement__item{
            gap:8px;
            padding:0 16px;
            font-size:9px;
            letter-spacing:.025em;
          }
          .wz-announcement__spark{font-size:9px;}
        }
        @media(prefers-reduced-motion:reduce){
          .wz-announcement{height:auto;min-height:36px;}
          .wz-announcement__viewport{
            height:auto;
            min-height:36px;
            padding:6px 14px;
            box-sizing:border-box;
          }
          .wz-announcement__track{
            width:100%;
            justify-content:center;
            animation:none!important;
            transform:none!important;
          }
          .wz-announcement__group:first-child{
            width:100%;
            justify-content:center;
            flex-wrap:wrap;
          }
          .wz-announcement__group:last-child{display:none;}
          .wz-announcement__item{
            white-space:normal;
            text-align:center;
            padding:5px 9px;
          }
        }
      `}</style>
    </div>
  )
}
