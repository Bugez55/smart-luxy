import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const STARS = [1,2,3,4,5]

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([])
  const [form, setForm] = useState({ nom:'', note:5, commentaire:'' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => { loadReviews() }, [productId])

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    setReviews(data || [])
  }

  async function submit() {
    if (!form.nom.trim() || !form.commentaire.trim()) return
    setSending(true)
    await supabase.from('reviews').insert({
      product_id: productId,
      nom: form.nom.trim(),
      note: form.note,
      commentaire: form.commentaire.trim(),
    })
    setSending(false); setSent(true); setOpen(false)
    setForm({ nom:'', note:5, commentaire:'' })
    loadReviews()
  }

  const avg = reviews.length ? (reviews.reduce((s,r) => s + r.note, 0) / reviews.length).toFixed(1) : null

  return (
    <div style={{ marginTop:24 }}>
      {/* Header avis */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:14, fontWeight:900, color:'white' }}>⭐ Avis clients</span>
          {avg && (
            <span style={{
              background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.25)',
              color:'#C9A84C', fontSize:12, fontWeight:800,
              padding:'2px 10px', borderRadius:20,
            }}>
              {avg}/5 — {reviews.length} avis
            </span>
          )}
        </div>
        <button
          onClick={() => { setOpen(o => !o); setSent(false) }}
          style={{
            background:'rgba(201,168,76,.12)', border:'1px solid rgba(201,168,76,.25)',
            borderRadius:20, padding:'5px 14px', color:'#C9A84C',
            fontSize:12, fontWeight:800, cursor:'pointer',
          }}
        >
          {open ? '✕ Annuler' : '✍️ Laisser un avis'}
        </button>
      </div>

      {/* Formulaire */}
      {open && (
        <div style={{
          background:'#1e1e1e', border:'1px solid #2a2a2a',
          borderRadius:12, padding:14, marginBottom:14,
          animation:'revSlide .25s ease',
        }}>
          <input
            placeholder="Votre prénom *"
            value={form.nom}
            onChange={e => setForm(f => ({...f, nom:e.target.value}))}
            style={{
              width:'100%', background:'#252525', border:'1px solid #333',
              borderRadius:8, padding:'9px 12px', color:'white',
              fontSize:13, marginBottom:10, boxSizing:'border-box', outline:'none',
            }}
          />
          {/* Étoiles */}
          <div style={{ display:'flex', gap:6, marginBottom:10, alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#555', marginRight:4 }}>Note :</span>
            {STARS.map(s => (
              <button
                key={s}
                onClick={() => setForm(f => ({...f, note:s}))}
                style={{
                  background:'none', border:'none', cursor:'pointer',
                  fontSize:22, padding:0, lineHeight:1,
                  filter: s <= form.note ? 'none' : 'grayscale(1) opacity(.3)',
                  transition:'filter .15s, transform .1s',
                  transform: s <= form.note ? 'scale(1.1)' : 'scale(1)',
                }}
              >⭐</button>
            ))}
            <span style={{ fontSize:12, color:'#C9A84C', fontWeight:800, marginLeft:4 }}>
              {['','Mauvais','Moyen','Bien','Très bien','Excellent'][form.note]}
            </span>
          </div>
          <textarea
            placeholder="Votre commentaire *"
            rows={3}
            value={form.commentaire}
            onChange={e => setForm(f => ({...f, commentaire:e.target.value}))}
            style={{
              width:'100%', background:'#252525', border:'1px solid #333',
              borderRadius:8, padding:'9px 12px', color:'white',
              fontSize:13, resize:'vertical', marginBottom:10,
              boxSizing:'border-box', outline:'none', fontFamily:'inherit',
            }}
          />
          <button
            onClick={submit}
            disabled={sending || !form.nom.trim() || !form.commentaire.trim()}
            style={{
              width:'100%', padding:11,
              background: (!form.nom.trim() || !form.commentaire.trim() || sending)
                ? '#2a2a2a' : 'linear-gradient(135deg,#C9A84C,#a8832e)',
              border:'none', borderRadius:10,
              color: (!form.nom.trim() || !form.commentaire.trim() || sending) ? '#555' : '#0a0a0a',
              fontWeight:900, fontSize:14, cursor:'pointer',
            }}
          >
            {sending ? '…' : '✅ Publier mon avis'}
          </button>
        </div>
      )}

      {sent && (
        <div style={{
          background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.2)',
          borderRadius:10, padding:'10px 14px', marginBottom:12,
          color:'#86efac', fontSize:13, fontWeight:700,
        }}>
          ✅ Merci pour votre avis ! Il est maintenant visible.
        </div>
      )}

      {/* Liste avis */}
      {reviews.length === 0 ? (
        <div style={{ color:'#444', fontSize:13, textAlign:'center', padding:'16px 0' }}>
          Aucun avis pour l'instant — soyez le premier ! 🌟
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {reviews.map(r => (
            <div key={r.id} style={{
              background:'#1c1c1c', border:'1px solid #2a2a2a',
              borderRadius:10, padding:'11px 13px',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:900, color:'#C9A84C',
                  }}>
                    {r.nom[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'white' }}>{r.nom}</span>
                  <span style={{ fontSize:12 }}>
                    {'⭐'.repeat(r.note)}{'☆'.repeat(5-r.note)}
                  </span>
                </div>
                <span style={{ fontSize:11, color:'#444' }}>
                  {new Date(r.created_at).toLocaleDateString('fr-DZ', { day:'2-digit', month:'short' })}
                </span>
              </div>
              <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.5 }}>
                {r.commentaire}
              </p>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes revSlide {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
