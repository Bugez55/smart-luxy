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
  const [copied, setCopied] = useState(false)
  const items = (() => { try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) } catch { return [] } })()

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(t)
  }, [])

  const steps = [
    { icon: '✓', label: 'Commande reçue', done: true },
    { icon: '☎', label: 'Confirmation', done: false },
    { icon: '📦', label: 'Préparation', done: false },
    { icon: '🚚', label: 'Livraison', done: false },
  ]

  async function copyOrderId() {
    try {
      await navigator.clipboard?.writeText(order.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '14px', overflow: 'auto',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        background: 'linear-gradient(180deg, var(--card) 0%, #101010 100%)',
        border: '1px solid rgba(201,168,76,.28)',
        borderRadius: 26, width: '100%', maxWidth: 520,
        maxHeight: '94vh', overflowY: 'auto',
        position: 'relative', boxShadow: '0 30px 100px rgba(0,0,0,.55)',
        transform: show ? 'translateY(0) scale(1)' : 'translateY(18px) scale(.97)',
        opacity: show ? 1 : 0,
        transition: 'all .45s cubic-bezier(.22,1,.36,1)',
      }}>
        <Confetti />

        <div style={{ height: 5, background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

        <div style={{ padding: '30px 22px 18px', textAlign: 'center', position: 'relative' }}>
          <div style={{
            width: 82, height: 82, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, rgba(233,196,106,.34), rgba(201,168,76,.08))',
            border: '1px solid rgba(233,196,106,.5)',
            boxShadow: '0 0 0 8px rgba(201,168,76,.05), 0 18px 45px rgba(201,168,76,.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38, margin: '0 auto 16px',
            animation: 'successPop .55s .1s cubic-bezier(.34,1.56,.64,1) both',
          }}>✓</div>

          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'6px 10px', borderRadius:999,
            background:'rgba(134,239,172,.08)', border:'1px solid rgba(134,239,172,.18)',
            color:'#a7f3d0', fontSize:10, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase',
            animation: 'successFade .4s .22s both',
          }}>
            Commande enregistrée
          </div>

          <h2 style={{
            margin: '14px 0 8px', fontSize: 25, fontWeight: 950, color:'var(--g3)',
            letterSpacing:'-.03em', animation: 'successFade .4s .28s both',
          }}>Merci pour votre commande</h2>

          <p style={{ margin:'0 auto 5px', maxWidth:410, fontSize:14, lineHeight:1.65, color:'var(--g4)', animation:'successFade .4s .34s both' }}>
            Bonjour <strong style={{ color:'var(--g3)' }}>{order.nom_client}</strong> 👋
          </p>
          <p style={{ margin:0, maxWidth:410, marginInline:'auto', fontSize:13, lineHeight:1.6, color:'var(--g4)', animation:'successFade .4s .4s both' }}>
            Nous vous appellerons au <strong style={{ color:'#E9C46A' }}>{order.telephone}</strong> pour confirmer votre commande.
          </p>
        </div>

        <div style={{ margin:'0 18px 14px', padding:'13px 14px', borderRadius:16,
          background:'linear-gradient(135deg, rgba(201,168,76,.12), rgba(201,168,76,.03))',
          border:'1px solid rgba(201,168,76,.22)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
          animation:'successFade .4s .46s both' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, color:'var(--g4)', fontWeight:800, letterSpacing:'.08em', marginBottom:4 }}>N° DE COMMANDE</div>
            <div style={{ fontSize:16, fontWeight:950, color:'#E9C46A', letterSpacing:'.05em', overflow:'hidden', textOverflow:'ellipsis' }}>{order.id}</div>
          </div>
          <button onClick={copyOrderId} style={{
            flexShrink:0, background:'rgba(201,168,76,.1)', border:'1px solid rgba(201,168,76,.25)',
            borderRadius:10, padding:'8px 11px', color:'#E9C46A', fontSize:11, fontWeight:800, cursor:'pointer'
          }}>{copied ? '✓ Copié' : 'Copier'}</button>
        </div>

        <div style={{ margin:'0 18px 14px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8,
          animation:'successFade .4s .5s both' }}>
          {[
            ['🚚','Livraison','69 wilayas'],
            ['☎','Confirmation','par téléphone'],
            ['💳','Paiement','à la réception'],
          ].map(([icon, title, sub]) => (
            <div key={title} style={{
              padding:'11px 8px', borderRadius:14, textAlign:'center',
              background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.07)'
            }}>
              <div style={{ fontSize:17, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:11, fontWeight:850, color:'var(--g3)' }}>{title}</div>
              <div style={{ fontSize:9, color:'var(--g4)', marginTop:2, lineHeight:1.35 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{
          margin:'0 18px 16px', background:'rgba(255,255,255,.018)',
          border:'1px solid rgba(255,255,255,.07)', borderRadius:16, overflow:'hidden',
          animation:'successFade .4s .54s both'
        }}>
          <div style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:10, fontWeight:850, color:'var(--g4)', letterSpacing:'.08em' }}>
            RÉCAPITULATIF
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
              padding:'10px 14px', borderBottom:i < items.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
              <span style={{ fontSize:12.5, color:'var(--g3)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {item.nom} <span style={{ color:'var(--g4)' }}>×{item.qty}</span>
              </span>
              <span style={{ fontSize:12.5, fontWeight:850, color:'#E9C46A', flexShrink:0 }}>{fmt(Number(item.prix) * item.qty)}</span>
            </div>
          ))}
          <div style={{ padding:'12px 14px', background:'rgba(201,168,76,.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:900, color:'var(--g3)' }}>Total à payer</span>
            <span style={{ fontSize:19, fontWeight:950, color:'#E9C46A' }}>{fmt(order.total)}</span>
          </div>
        </div>

        <div style={{ margin:'0 18px 18px', animation:'successFade .4s .58s both' }}>
          <div style={{ fontSize:10, fontWeight:850, color:'var(--g4)', letterSpacing:'.08em', marginBottom:10 }}>SUIVI DE VOTRE COMMANDE</div>
          <div style={{ display:'flex', gap:0 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ flex:1, textAlign:'center', position:'relative', minWidth:0 }}>
                {i < steps.length - 1 && <div style={{ position:'absolute', top:15, left:'50%', right:'-50%', height:1.5, background:i === 0 ? '#C9A84C' : 'rgba(255,255,255,.09)' }} />}
                <div style={{ width:30, height:30, borderRadius:'50%', margin:'0 auto 6px', position:'relative', zIndex:1,
                  background:s.done ? 'rgba(201,168,76,.18)' : '#171717', border:`1px solid ${s.done ? '#C9A84C' : 'rgba(255,255,255,.10)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:s.done ? '#E9C46A' : 'var(--g4)', fontWeight:900 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:9.5, lineHeight:1.3, color:s.done ? '#E9C46A' : 'var(--g4)', fontWeight:750 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:'0 18px 22px', display:'flex', flexDirection:'column', gap:9, animation:'successFade .4s .64s both' }}>
          <button onClick={() => openWA(order)} style={{
            width:'100%', padding:'13px', background:'#25D366', border:'none', borderRadius:13,
            color:'#07130b', fontSize:14, fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 10px 25px rgba(37,211,102,.12)'
          }}>
            Confirmer sur WhatsApp
          </button>
          <button onClick={onClose} style={{
            width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,.11)',
            borderRadius:13, color:'var(--g3)', fontSize:13, fontWeight:750, cursor:'pointer'
          }}>
            ← Continuer mes achats
          </button>
        </div>

        <style>{`
          @keyframes successPop { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
          @keyframes successFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          @media (max-width:420px){
            .success-mini-grid{grid-template-columns:1fr 1fr !important}
          }
        `}</style>
      </div>
    </div>
  )
}
