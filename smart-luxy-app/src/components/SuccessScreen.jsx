import { useEffect, useState } from 'react'
import { openWA } from '../utils/notify'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

// ── Confetti simple ──
function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    dur: 2 + Math.random() * 1.5,
    color: ['#C9A84C','#E9C46A','#fff','#F4A261','#86efac'][Math.floor(Math.random() * 5)],
    size: 6 + Math.random() * 6,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: '-10px',
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: Math.random() > .5 ? '50%' : 2,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
          opacity: 0,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity:1; transform: translateY(0) rotate(0deg); }
          100% { opacity:0; transform: translateY(400px) rotate(720deg); }
        }
      `}</style>
    </div>
  )
}

export default function SuccessScreen({ order, onClose }) {
  const [show, setShow] = useState(false)
  const items = (() => { try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) } catch { return [] } })()

  useEffect(() => {
    setTimeout(() => setShow(true), 50)
  }, [])

  const steps = [
    { icon: '✅', label: 'Commande reçue', done: true },
    { icon: '📞', label: 'Confirmation appel', done: false },
    { icon: '📦', label: 'Préparation colis', done: false },
    { icon: '🚚', label: 'Livraison en cours', done: false },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(201,168,76,.2)',
        borderRadius: 24, width: '100%', maxWidth: 480,
        maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
        transform: show ? 'scale(1)' : 'scale(.9)',
        opacity: show ? 1 : 0,
        transition: 'all .4s cubic-bezier(.22,1,.36,1)',
      }}>
        <Confetti />

        {/* ── Haut ── */}
        <div style={{ padding: '32px 24px 20px', textAlign: 'center', position: 'relative' }}>
          {/* Icône animée */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201,168,76,.2), rgba(201,168,76,.05))',
            border: '2px solid rgba(201,168,76,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px',
            animation: 'successPop .5s .2s cubic-bezier(.34,1.56,.64,1) both',
          }}>🎉</div>

          <h2 style={{
            margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: 'white',
            animation: 'successFade .4s .3s both',
          }}>Commande confirmée !</h2>

          <p style={{
            margin: '0 0 6px', fontSize: 14, color: 'rgba(255,255,255,.55)',
            animation: 'successFade .4s .4s both',
          }}>
            Merci <strong style={{ color: 'white' }}>{order.nom_client}</strong> 🙏
          </p>
          <p style={{
            margin: 0, fontSize: 13, color: 'rgba(255,255,255,.35)',
            animation: 'successFade .4s .45s both',
          }}>
            Nous vous appellerons au <strong style={{ color: '#C9A84C' }}>{order.telephone}</strong> pour confirmer
          </p>
        </div>

        {/* ── N° commande ── */}
        <div style={{
          margin: '0 20px 16px',
          background: 'rgba(201,168,76,.07)',
          border: '1px solid rgba(201,168,76,.2)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          animation: 'successFade .4s .5s both',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontWeight: 800, letterSpacing: '.08em', marginBottom: 3 }}>
              NUMÉRO DE SUIVI
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#C9A84C', letterSpacing: '.05em' }}>
              {order.id}
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(order.id).then(() => {})}
            style={{
              background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)',
              borderRadius: 8, padding: '6px 12px', color: '#C9A84C',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >📋 Copier</button>
        </div>

        {/* ── Récap commande ── */}
        <div style={{
          margin: '0 20px 16px',
          background: '#141414', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 12, overflow: 'hidden',
          animation: 'successFade .4s .55s both',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: '.06em' }}>
            ARTICLES COMMANDÉS
          </div>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 14px',
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
            }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
                {item.nom} <span style={{ color: 'rgba(255,255,255,.3)' }}>×{item.qty}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>
                {fmt(Number(item.prix) * item.qty)}
              </span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(255,255,255,.02)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>Total payé</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#C9A84C' }}>{fmt(order.total)}</span>
          </div>
        </div>

        {/* ── Timeline étapes ── */}
        <div style={{
          margin: '0 20px 20px',
          animation: 'successFade .4s .6s both',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: '.06em', marginBottom: 10 }}>
            PROCHAINES ÉTAPES
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 16, left: '50%', right: '-50%', height: 2,
                    background: s.done ? '#C9A84C' : 'rgba(255,255,255,.08)',
                    transition: 'background .3s',
                  }} />
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: s.done ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.05)',
                  border: `2px solid ${s.done ? '#C9A84C' : 'rgba(255,255,255,.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, margin: '0 auto 6px',
                  position: 'relative', zIndex: 1,
                }}>{s.icon}</div>
                <div style={{ fontSize: 10, color: s.done ? '#C9A84C' : 'rgba(255,255,255,.3)', fontWeight: 700, lineHeight: 1.3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Boutons ── */}
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => openWA(order)} style={{
            width: '100%', padding: '13px',
            background: '#25D366', border: 'none', borderRadius: 12,
            color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            Confirmer sur WhatsApp
          </button>

          <button onClick={onClose} style={{
            width: '100%', padding: '12px',
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 12, color: 'rgba(255,255,255,.6)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            ← Retour à la boutique
          </button>
        </div>

        <style>{`
          @keyframes successPop { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
          @keyframes successFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    </div>
  )
}
