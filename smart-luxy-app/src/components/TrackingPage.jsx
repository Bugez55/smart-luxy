import { useState } from 'react'
import { supabase } from '../supabase'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

const STEPS = [
  { key: 'new',       icon: '📋', label: 'Commande reçue',    desc: 'Votre commande a été enregistrée' },
  { key: 'confirmed', icon: '✅', label: 'Confirmée',         desc: 'Nous avons confirmé votre commande' },
  { key: 'delivered', icon: '📦', label: 'En livraison',      desc: 'Votre colis est en route' },
  { key: 'done',      icon: '🎉', label: 'Livrée',            desc: 'Commande reçue avec succès' },
]

const STATUS_IDX = { new: 0, confirmed: 1, delivered: 2, done: 3 }

export default function TrackingPage({ onClose }) {
  const [input, setInput] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(true)

  async function search() {
    const q = input.trim().toUpperCase()
    if (!q) return
    setLoading(true); setError(''); setOrder(null)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${q},id.ilike.%${q}%`)
      .limit(1)
      .single()
    setLoading(false)
    if (!data) { setError('Aucune commande trouvée avec ce numéro.'); return }
    setOrder(data)
  }

  function handleClose() {
    setShow(false)
    setTimeout(onClose, 250)
  }

  const curStep = order ? (STATUS_IDX[order.statut] ?? 0) : -1
  const items = order ? (() => { try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) } catch { return [] } })() : []

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position:'fixed', inset:0, zIndex:500,
        background:'rgba(0,0,0,.88)', backdropFilter:'blur(8px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        opacity: show ? 1 : 0, transition:'opacity .25s',
      }}
    >
      <div style={{
        width:'100%', maxWidth:520,
        background:'linear-gradient(160deg,#1a1a1a,#111)',
        borderRadius:'22px 22px 0 0',
        border:'1px solid rgba(201,168,76,.15)', borderBottom:'none',
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        transform: show ? 'translateY(0)' : 'translateY(50px)',
        transition:'transform .35s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid rgba(201,168,76,.1)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
        }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:'white' }}>
            📦 Suivi de commande
          </h2>
          <button onClick={handleClose} style={{
            background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
            borderRadius:'50%', width:32, height:32, color:'white',
            fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Corps */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {/* Champ de recherche */}
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:12 }}>
            Entrez votre numéro de commande (ex: SL-ABC123)
          </p>
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="SL-XXXXXX"
              style={{
                flex:1, background:'rgba(255,255,255,.05)',
                border:'1px solid rgba(255,255,255,.12)',
                borderRadius:10, padding:'11px 14px',
                color:'white', fontSize:15, outline:'none',
                fontFamily:'monospace', letterSpacing:'.05em',
              }}
            />
            <button
              onClick={search}
              disabled={loading}
              style={{
                background:'linear-gradient(135deg,#C9A84C,#a8832e)',
                border:'none', borderRadius:10, padding:'11px 20px',
                color:'#0a0a0a', fontSize:14, fontWeight:900, cursor:'pointer',
                minWidth:80,
              }}
            >
              {loading ? '…' : '🔍 Chercher'}
            </button>
          </div>

          {error && (
            <div style={{
              background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)',
              borderRadius:10, padding:'12px 14px', color:'#fca5a5', fontSize:13, marginBottom:16,
            }}>
              ❌ {error}
            </div>
          )}

          {order && (
            <div style={{ animation:'fadeSlide .4s ease' }}>
              {/* Infos commande */}
              <div style={{
                background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.18)',
                borderRadius:12, padding:'12px 16px', marginBottom:16,
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <div>
                  <div style={{ fontSize:11, color:'#555', fontWeight:800, textTransform:'uppercase', marginBottom:3 }}>Commande</div>
                  <div style={{ fontSize:16, fontWeight:900, color:'#C9A84C', fontFamily:'monospace' }}>{order.id}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:2 }}>
                    {new Date(order.created_at).toLocaleDateString('fr-DZ', { day:'2-digit', month:'long', year:'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'#555', fontWeight:800, textTransform:'uppercase', marginBottom:3 }}>Total</div>
                  <div style={{ fontSize:18, fontWeight:900, color:'#C9A84C' }}>{fmt(order.total)}</div>
                </div>
              </div>

              {/* Timeline statut */}
              <div style={{
                background:'#1e1e1e', border:'1px solid #2a2a2a',
                borderRadius:12, padding:'16px', marginBottom:16,
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#555', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>
                  Statut de la commande
                </div>
                {STEPS.map((step, i) => {
                  const done = i <= curStep
                  const current = i === curStep
                  return (
                    <div key={step.key} style={{ display:'flex', gap:12, marginBottom: i < STEPS.length-1 ? 14 : 0, position:'relative' }}>
                      {/* Ligne verticale */}
                      {i < STEPS.length-1 && (
                        <div style={{
                          position:'absolute', left:19, top:36, width:2, height:14,
                          background: done ? '#C9A84C' : '#2a2a2a',
                          transition:'background .3s',
                        }} />
                      )}
                      {/* Icône */}
                      <div style={{
                        width:38, height:38, borderRadius:'50%', flexShrink:0,
                        background: done ? (current ? 'rgba(201,168,76,.2)' : 'rgba(201,168,76,.1)') : '#1a1a1a',
                        border: `2px solid ${done ? '#C9A84C' : '#2a2a2a'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16, transition:'all .3s',
                        boxShadow: current ? '0 0 16px rgba(201,168,76,.3)' : 'none',
                      }}>
                        {step.icon}
                      </div>
                      {/* Texte */}
                      <div style={{ paddingTop:2 }}>
                        <div style={{
                          fontSize:14, fontWeight: current ? 900 : 700,
                          color: done ? 'white' : '#444',
                          display:'flex', alignItems:'center', gap:6,
                        }}>
                          {step.label}
                          {current && (
                            <span style={{
                              background:'rgba(201,168,76,.15)', color:'#C9A84C',
                              fontSize:10, fontWeight:800, padding:'2px 8px',
                              borderRadius:10, border:'1px solid rgba(201,168,76,.25)',
                            }}>EN COURS</span>
                          )}
                        </div>
                        <div style={{ fontSize:12, color: done ? 'rgba(255,255,255,.4)' : '#333', marginTop:2 }}>
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Détails livraison */}
              <div style={{
                background:'#1e1e1e', border:'1px solid #2a2a2a',
                borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13,
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#555', textTransform:'uppercase', marginBottom:10 }}>Livraison</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ color:'#555' }}>Mode</span>
                  <span style={{ color:'white', fontWeight:700 }}>
                    {order.mode_livraison === 'bureau' ? '📦 Retrait bureau (Tizi Ouzou)' : '🏠 À domicile'}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#555' }}>Destination</span>
                  <span style={{ color:'white' }}>{order.wilaya} — {order.commune}</span>
                </div>
              </div>

              {/* Articles */}
              <div style={{
                background:'#1e1e1e', border:'1px solid #2a2a2a',
                borderRadius:12, padding:'12px 16px', fontSize:13,
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#555', textTransform:'uppercase', marginBottom:10 }}>Articles</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom: i < items.length-1 ? 6 : 0 }}>
                    <span style={{ color:'rgba(255,255,255,.6)' }}>{item.nom} ×{item.qty}</span>
                    <span style={{ color:'#C9A84C', fontWeight:700 }}>{fmt(Number(item.prix)*item.qty)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
