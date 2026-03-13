import { useEffect, useState } from 'react'
import { openWA } from '../utils/notify'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i)
  const colors = ['#C9A84C','#FFD700','#fff','#f97316','#a78bfa','#34d399','#60a5fa']
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      {pieces.map(i => {
        const color = colors[i % colors.length]
        const left = `${(i * 4.2 + 2) % 100}%`
        const delay = `${(i * 0.11).toFixed(2)}s`
        const size = 5 + (i % 5) * 2
        const dur = `${1.6 + (i % 4) * 0.35}s`
        return (
          <div key={i} style={{
            position:'absolute', top:'-12px', left,
            width: size, height: size,
            background: color,
            borderRadius: i % 3 === 0 ? '50%' : 2,
            animation: `cfFall ${dur} ${delay} ease-in forwards`,
          }} />
        )
      })}
      <style>{`
        @keyframes cfFall {
          0%   { transform: translateY(0) rotate(0deg); opacity:1; }
          100% { transform: translateY(480px) rotate(720deg); opacity:0; }
        }
      `}</style>
    </div>
  )
}

export default function SuccessScreen({ order, onClose }) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  const items = (() => {
    try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) }
    catch { return [] }
  })()
  const modeLiv = order.mode_livraison || 'domicile'
  const fraisLiv = Number(order.frais_livraison || 0)
  const totalProd = items.reduce((s, i) => s + Number(i.prix) * i.qty, 0)
  const total = order.total || (totalProd + fraisLiv)

  useEffect(() => {
    // Scroll haut de page quand fermé
    return () => { window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }, [])

  useEffect(() => {
    setTimeout(() => setShow(true), 30)
    setTimeout(() => setStep(1), 300)
    setTimeout(() => setStep(2), 650)
    setTimeout(() => setStep(3), 1000)
  }, [])

  function handleClose() {
    setShow(false)
    setTimeout(() => {
      onClose()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 250)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position:'fixed', inset:0, zIndex:600,
        background:'rgba(0,0,0,.92)', backdropFilter:'blur(10px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        opacity: show ? 1 : 0, transition:'opacity .25s',
      }}
    >
      <div style={{
        position:'relative', width:'100%', maxWidth:520,
        background:'linear-gradient(160deg, #1a1a1a 0%, #111 100%)',
        borderRadius:'24px 24px 0 0',
        border:'1px solid rgba(201,168,76,.18)', borderBottom:'none',
        overflow:'hidden',
        transform: show ? 'translateY(0)' : 'translateY(70px)',
        transition:'transform .4s cubic-bezier(.22,1,.36,1)',
        maxHeight:'92vh', display:'flex', flexDirection:'column',
      }}>
        <Confetti />

        {/* ── Bouton X fermeture ── */}
        <button
          onClick={handleClose}
          style={{
            position:'absolute', top:12, right:12, zIndex:10,
            background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.15)',
            borderRadius:'50%', width:32, height:32,
            color:'rgba(255,255,255,.7)', fontSize:16, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,.4)'}
        >✕</button>

        {/* ── Bandeau doré ── */}
        <div style={{
          position:'relative', zIndex:1,
          background:'linear-gradient(135deg, #C9A84C 0%, #a8832e 100%)',
          padding:'28px 20px 22px', textAlign:'center',
        }}>
          <div style={{
            width:72, height:72, background:'white', borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:36, margin:'0 auto 14px',
            boxShadow:'0 8px 32px rgba(0,0,0,.3)',
            transform: step >= 1 ? 'scale(1)' : 'scale(0)',
            transition:'transform .5s cubic-bezier(.34,1.56,.64,1)',
          }}>✅</div>

          <h1 style={{
            margin:'0 0 6px', fontSize:22, fontWeight:900,
            color:'#0e0e0e', letterSpacing:'-.03em',
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? 'translateY(0)' : 'translateY(10px)',
            transition:'all .4s ease',
          }}>Commande confirmée !</h1>

          <p style={{
            margin:0, fontSize:13.5, color:'rgba(0,0,0,.6)',
            opacity: step >= 2 ? 1 : 0, transition:'opacity .4s .1s',
          }}>
            Merci <strong>{order.nom_client}</strong> pour votre confiance 🙏
          </p>
        </div>

        {/* ── Corps scrollable ── */}
        <div style={{
          flex:1, overflowY:'auto', padding:'16px',
          position:'relative', zIndex:1,
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? 'translateY(0)' : 'translateY(14px)',
          transition:'all .4s ease',
        }}>

          {/* Message contact */}
          <div style={{
            background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.18)',
            borderRadius:12, padding:'11px 14px', marginBottom:12,
            fontSize:13.5, color:'rgba(255,255,255,.7)', lineHeight:1.7,
          }}>
            📞 Nous vous appelons au <strong style={{color:'white'}}>{order.telephone}</strong> pour confirmer. Livraison dans <strong style={{color:'#C9A84C'}}>{modeLiv === 'bureau' ? '1–3 jours' : '2–5 jours'}</strong>.
          </div>

          {/* N° commande */}
          <div style={{
            background:'#1e1e1e', border:'1px solid #2a2a2a',
            borderRadius:10, padding:'9px 14px', marginBottom:12,
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{fontSize:11, color:'#555', fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em'}}>N° Commande</span>
            <span style={{fontSize:13, color:'#C9A84C', fontWeight:800, fontFamily:'monospace'}}>
              {order.id?.slice(0,8).toUpperCase()}
            </span>
          </div>

          {/* Livraison */}
          <div style={{
            background:'#1e1e1e', border:'1px solid #2a2a2a',
            borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13,
            display:'flex', flexDirection:'column', gap:5,
          }}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <span style={{color:'#555'}}>Mode</span>
              <span style={{color:'white', fontWeight:700}}>{modeLiv === 'bureau' ? '📦 Retrait bureau (Tizi Ouzou)' : '🏠 Livraison à domicile'}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <span style={{color:'#555'}}>Destination</span>
              <span style={{color:'white', fontWeight:600}}>{order.wilaya} — {order.commune}</span>
            </div>
            {order.adresse && (
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{color:'#555'}}>Adresse</span>
                <span style={{color:'white', textAlign:'right', maxWidth:'60%'}}>{order.adresse}</span>
              </div>
            )}
          </div>

          {/* Articles + total */}
          <div style={{
            background:'#1e1e1e', border:'1px solid #2a2a2a',
            borderRadius:10, padding:'10px 14px', marginBottom:12,
          }}>
            <div style={{fontSize:11, fontWeight:800, color:'#444', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8}}>
              Récapitulatif
            </div>
            {items.map((item, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:13.5, marginBottom:5}}>
                <span style={{color:'#aaa'}}>{item.nom} <span style={{color:'#555'}}>×{item.qty}</span></span>
                <span style={{color:'white', fontWeight:600}}>{fmt(Number(item.prix)*item.qty)}</span>
              </div>
            ))}
            <div style={{borderTop:'1px solid #2a2a2a', marginTop:8, paddingTop:8, display:'flex', flexDirection:'column', gap:4}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#555'}}>
                <span>Sous-total</span><span>{fmt(totalProd)}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#555'}}>
                <span>Livraison</span>
                <span style={{color: fraisLiv === 0 ? '#4CAF50' : '#aaa'}}>
                  {fraisLiv === 0 ? '✓ Gratuit' : fmt(fraisLiv)}
                </span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:900, paddingTop:4}}>
                <span style={{color:'white'}}>Total payé</span>
                <span style={{color:'#C9A84C'}}>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Ce qui attend */}
          <div style={{
            background:'rgba(52,211,153,.05)', border:'1px solid rgba(52,211,153,.12)',
            borderRadius:12, padding:'11px 14px', marginBottom:4,
          }}>
            <div style={{fontSize:11, fontWeight:800, color:'#34d399', marginBottom:8, textTransform:'uppercase', letterSpacing:'.05em'}}>
              ✨ Ce qui vous attend
            </div>
            {[
              { icon:'📦', text:'Produit emballé avec soin' },
              { icon:'🚚', text: modeLiv === 'bureau' ? 'Prêt en 1–3 jours, bureau Tizi Ouzou' : 'Livraison en 2–5 jours à votre porte' },
              { icon:'💬', text:'Notre équipe vous contacte pour confirmer' },
              { icon:'💰', text:'Paiement à la livraison, en toute confiance' },
            ].map((e, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:10, marginBottom: i<3 ? 6 : 0}}>
                <span style={{fontSize:17}}>{e.icon}</span>
                <span style={{fontSize:13, color:'rgba(255,255,255,.6)'}}>{e.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer boutons ── */}
        <div style={{
          padding:'12px 16px 16px',
          background:'rgba(14,14,14,.95)',
          borderTop:'1px solid #2a2a2a',
          flexShrink:0, zIndex:1, position:'relative',
          opacity: step >= 3 ? 1 : 0, transition:'opacity .5s .2s',
        }}>
          <button onClick={() => openWA(order)} style={{
            width:'100%', padding:'12px',
            background:'#25D366', border:'none', borderRadius:12,
            color:'white', fontSize:14, fontWeight:800,
            cursor:'pointer', marginBottom:8,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            Confirmer sur WhatsApp
          </button>

          {/* Bouton principal — retour boutique */}
          <button
            onClick={handleClose}
            style={{
              width:'100%', padding:'13px',
              background:'linear-gradient(135deg, #C9A84C, #a8832e)',
              border:'none', borderRadius:12,
              color:'#0e0e0e', fontSize:15, fontWeight:900,
              cursor:'pointer', letterSpacing:'.01em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 4px 20px rgba(201,168,76,.3)',
            }}
          >
            🛍️ Continuer mes achats
          </button>
        </div>
      </div>
    </div>
  )
}
