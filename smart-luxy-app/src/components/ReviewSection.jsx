// ═══════════════════════════════════════════════════
//  AVIS CLIENTS AVEC PHOTO — Smart Luxy v2
// ═══════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const STARS = [1, 2, 3, 4, 5]

function Star({ filled, onClick, size = 22 }) {
  return (
    <span onClick={onClick} style={{
      cursor: onClick ? 'pointer' : 'default',
      color: filled ? '#F9A825' : 'rgba(255,255,255,.15)',
      fontSize: size, lineHeight: 1,
      transition: 'color .15s, transform .15s',
      display: 'inline-block',
    }}>★</span>
  )
}

function Avatar({ nom, photo }) {
  if (photo) return (
    <img src={photo} alt={nom}
      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,.3)', flexShrink: 0 }}
      onError={e => e.target.style.display = 'none'}
    />
  )
  const initials = nom?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['#C9A84C', '#E9C46A', '#F4A261', '#2A9D8F', '#457B9D']
  const color = colors[nom?.charCodeAt(0) % colors.length] || colors[0]
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: color + '22',
      border: `2px solid ${color}55`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 15, fontWeight: 800, color, flexShrink: 0,
    }}>{initials}</div>
  )
}

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([])
  const [form, setForm] = useState({ nom: '', note: 5, commentaire: '', photo: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const fileRef = useRef()

  useEffect(() => { loadReviews() }, [productId])

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews').select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    setReviews(data || [])
  }

  async function uploadPhoto(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `reviews/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { setUploading(false); return '' }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setUploading(false)
    return publicUrl
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    const url = await uploadPhoto(file)
    setForm(f => ({ ...f, photo: url }))
  }

  async function submit() {
    if (!form.nom.trim() || !form.commentaire.trim()) return
    setSending(true)
    await supabase.from('reviews').insert({
      product_id: productId,
      nom: form.nom.trim(),
      note: form.note,
      commentaire: form.commentaire.trim(),
      photo: form.photo || null,
    })
    setSending(false); setSent(true); setOpen(false)
    setForm({ nom: '', note: 5, commentaire: '', photo: '' })
    setPhotoPreview('')
    loadReviews()
  }

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.note, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Avis clients</span>
          {avg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#F9A825' }}>{avg}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>({reviews.length})</span>
            </div>
          )}
        </div>
        <button onClick={() => { setOpen(true); setSent(false) }} style={{
          background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)',
          borderRadius: 10, padding: '7px 14px',
          color: '#C9A84C', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          ✍️ Laisser un avis
        </button>
      </div>

      {/* ── Formulaire avis ── */}
      {open && (
        <div style={{
          background: '#1a1a1a', border: '1px solid rgba(201,168,76,.15)',
          borderRadius: 14, padding: 16, marginBottom: 18,
          animation: 'slideDown .2s ease',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ color: '#4CAF50', fontWeight: 700 }}>Merci pour votre avis !</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>VOTRE NOTE</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {STARS.map(s => (
                    <Star key={s} filled={s <= form.note} size={28}
                      onClick={() => setForm(f => ({ ...f, note: s }))} />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>VOTRE NOM</label>
                <input
                  placeholder="Ex: Ahmed B."
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  style={{
                    width: '100%', background: '#111', border: '1px solid #333',
                    borderRadius: 8, padding: '9px 12px', color: 'white',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>VOTRE AVIS</label>
                <textarea
                  rows={3}
                  placeholder="Partagez votre expérience avec ce produit..."
                  value={form.commentaire}
                  onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                  style={{
                    width: '100%', background: '#111', border: '1px solid #333',
                    borderRadius: 8, padding: '9px 12px', color: 'white',
                    fontSize: '16px', outline: 'none', resize: 'none',
                    boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Upload photo optionnelle */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
                  📸 PHOTO (optionnel)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {photoPreview && (
                    <img src={photoPreview} alt=""
                      style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid #333' }}
                    />
                  )}
                  <button onClick={() => fileRef.current?.click()} style={{
                    background: '#222', border: '1px dashed #444', borderRadius: 8,
                    padding: '8px 14px', color: '#aaa', fontSize: 12, cursor: 'pointer',
                  }}>
                    {uploading ? '⏳ Upload...' : photoPreview ? '🔄 Changer' : '📁 Ajouter une photo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setOpen(false)} style={{
                  flex: 1, background: 'none', border: '1px solid #333',
                  borderRadius: 10, padding: '10px', color: '#666',
                  fontSize: 13, cursor: 'pointer',
                }}>Annuler</button>
                <button
                  onClick={submit}
                  disabled={sending || !form.nom || !form.commentaire}
                  style={{
                    flex: 2,
                    background: sending || !form.nom || !form.commentaire
                      ? '#222' : 'linear-gradient(135deg,#C9A84C,#E9C46A)',
                    border: 'none', borderRadius: 10, padding: '10px',
                    color: sending || !form.nom || !form.commentaire ? '#555' : '#000',
                    fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  {sending ? '⏳ Envoi...' : '✅ Publier mon avis'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Liste des avis ── */}
      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
          Aucun avis pour l'instant — soyez le premier ! 🌟
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => (
            <div key={r.id} style={{
              background: '#141414', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 12, padding: 14,
              animation: 'fadeIn .3s ease',
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Avatar nom={r.nom} photo={r.photo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{r.nom}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>
                      {new Date(r.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 7 }}>
                    {STARS.map(s => <Star key={s} filled={s <= r.note} size={13} />)}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                    {r.commentaire}
                  </p>
                  {/* Photo du client si présente */}
                  {r.photo && (
                    <img src={r.photo} alt="avis"
                      style={{ marginTop: 10, width: '100%', maxHeight: 180,
                        objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)' }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  )
}
