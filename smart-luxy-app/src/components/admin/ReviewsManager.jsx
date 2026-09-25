import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../supabase'

const MAX_SOURCE_SIZE = 2 * 1024 * 1024
const MAX_STORED_SIZE = 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function getReviewStoragePath(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return null
  const marker = '/storage/v1/object/public/product-images/'
  const index = photoUrl.indexOf(marker)
  if (index === -1) return null
  const path = photoUrl.slice(index + marker.length).split('?')[0]
  return path.startsWith('reviews/') ? path : null
}

async function fileToCompressedJpeg(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez JPG, PNG, WebP ou GIF.')
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('La photo originale dépasse 2 Mo.')
  }

  const bitmapUrl = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Impossible de lire cette image.'))
      img.src = bitmapUrl
    })

    const MAX_SIDE = 1000
    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height
    if (!width || !height) throw new Error('Dimensions d’image invalides.')

    if (Math.max(width, height) > MAX_SIDE) {
      const scale = MAX_SIDE / Math.max(width, height)
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Compression image indisponible.')
    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.82
    let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    while (blob && blob.size > MAX_STORED_SIZE && quality > 0.5) {
      quality -= 0.08
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    }

    if (!blob) throw new Error('Impossible de compresser la photo.')
    if (blob.size > MAX_STORED_SIZE) {
      throw new Error('La photo reste trop volumineuse après compression (1 Mo max).')
    }

    return new File([blob], 'review.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(bitmapUrl)
  }
}

function Stars({ note, interactive = false, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={interactive ? () => onChange(star) : undefined}
          style={{
            background: 'none', border: 0, padding: 0,
            cursor: interactive ? 'pointer' : 'default',
            color: star <= note ? '#F9A825' : 'rgba(255,255,255,.18)',
            fontSize: interactive ? 28 : 17,
            lineHeight: 1,
          }}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
        >★</button>
      ))}
    </div>
  )
}

export default function ReviewsManager({ products = [], onToast }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    product_id: products[0]?.id ? String(products[0].id) : '',
    nom: '',
    note: 5,
    commentaire: '',
    photo: '',
  })
  const [newPhotoFile, setNewPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const productMap = useMemo(
    () => new Map(products.map(product => [String(product.id), product])),
    [products]
  )

  useEffect(() => {
    if (!form.product_id && products[0]?.id) {
      setForm(current => ({ ...current, product_id: String(products[0].id) }))
    }
  }, [products, form.product_id])

  async function loadReviews() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('reviews')
      .select('id, product_id, nom, note, commentaire, photo, created_at')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error('Erreur chargement avis admin:', loadError)
      onToast?.('❌ Impossible de charger les avis', 'error')
    }
    setReviews(data || [])
    setLoading(false)
  }

  useEffect(() => { loadReviews() }, [])

  function resetForm() {
    setEditingId(null)
    setForm({
      product_id: products[0]?.id ? String(products[0].id) : '',
      nom: '', note: 5, commentaire: '', photo: '',
    })
    setNewPhotoFile(null)
    setError('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function editReview(review) {
    setEditingId(review.id)
    setForm({
      product_id: String(review.product_id),
      nom: review.nom || '',
      note: Number(review.note) || 5,
      commentaire: review.commentaire || '',
      photo: review.photo || '',
    })
    setNewPhotoFile(null)
    setError('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Photo refusée : JPG, PNG, WebP ou GIF uniquement.')
      return
    }
    if (file.size > MAX_SOURCE_SIZE) {
      setError('Photo trop volumineuse : 2 Mo maximum avant compression.')
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setNewPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  async function uploadReviewPhoto(file) {
    const compressed = await fileToCompressedJpeg(file)
    setUploading(true)
    try {
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const path = `reviews/admin-${id}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      return data.publicUrl
    } finally {
      setUploading(false)
    }
  }

  async function saveReview() {
    if (!form.product_id) return setError('Sélectionne un produit.')
    if (form.nom.trim().length < 1) return setError('Le nom du client est obligatoire.')
    if (form.commentaire.trim().length < 1) return setError('Le commentaire est obligatoire.')

    setSaving(true)
    setError('')
    let uploadedPhotoUrl = null
    try {
      if (newPhotoFile) {
        uploadedPhotoUrl = await uploadReviewPhoto(newPhotoFile)
      }

      const payload = {
        product_id: Number(form.product_id),
        nom: form.nom.trim().slice(0, 80),
        note: Math.min(5, Math.max(1, Number(form.note) || 5)),
        commentaire: form.commentaire.trim().slice(0, 1200),
        photo: uploadedPhotoUrl || form.photo || null,
      }

      if (editingId) {
        const previous = reviews.find(review => review.id === editingId)
        const { error: updateError } = await supabase
          .from('reviews')
          .update(payload)
          .eq('id', editingId)
        if (updateError) throw updateError

        if (uploadedPhotoUrl && previous?.photo) {
          const oldPath = getReviewStoragePath(previous.photo)
          if (oldPath) await supabase.storage.from('product-images').remove([oldPath])
        }
        onToast?.('✅ Avis modifié')
      } else {
        const { error: insertError } = await supabase.from('reviews').insert(payload)
        if (insertError) throw insertError
        onToast?.('✅ Avis ajouté')
      }

      resetForm()
      await loadReviews()
    } catch (saveError) {
      console.error('Erreur sauvegarde avis:', saveError)
      if (uploadedPhotoUrl) {
        const path = getReviewStoragePath(uploadedPhotoUrl)
        if (path) await supabase.storage.from('product-images').remove([path])
      }
      setError(saveError?.message || 'Impossible de sauvegarder cet avis.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteReview(review) {
    if (!confirm(`Supprimer l'avis de ${review.nom || 'ce client'} ?`)) return
    const { error: deleteError } = await supabase.from('reviews').delete().eq('id', review.id)
    if (deleteError) {
      console.error('Erreur suppression avis:', deleteError)
      onToast?.('❌ Impossible de supprimer l’avis', 'error')
      return
    }
    if (review.photo) {
      const path = getReviewStoragePath(review.photo)
      if (path) await supabase.storage.from('product-images').remove([path])
    }
    if (editingId === review.id) resetForm()
    setReviews(current => current.filter(item => item.id !== review.id))
    onToast?.('🗑️ Avis supprimé')
  }

  const filteredReviews = reviews.filter(review => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const productName = productMap.get(String(review.product_id))?.nom || ''
    return [review.nom, review.commentaire, productName]
      .some(value => String(value || '').toLowerCase().includes(q))
  })

  return (
    <div>
      <div style={{
        background: 'rgba(201,168,76,.06)',
        border: '1px solid rgba(201,168,76,.18)',
        borderRadius: 14, padding: 16, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ color: 'white', margin: 0, fontSize: 16 }}>⭐ Ajouter un avis client</h3>
            <p style={{ color: 'rgba(255,255,255,.42)', fontSize: 12, margin: '5px 0 0' }}>
              Les avis sont ajoutés uniquement par toi, après échange avec le client.
            </p>
          </div>
          {editingId && (
            <button className="act-btn" onClick={resetForm}>Annuler la modification</button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) minmax(160px,.6fr)', gap: 10, marginBottom: 10 }}>
          <label style={{ display: 'grid', gap: 6, color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 700 }}>
            PRODUIT
            <select
              value={form.product_id}
              onChange={e => setForm(current => ({ ...current, product_id: e.target.value }))}
              style={{ background: '#151515', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 14 }}
            >
              <option value="">Sélectionner un produit</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.nom}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 700 }}>
            NOM DU CLIENT
            <input
              value={form.nom}
              onChange={e => setForm(current => ({ ...current, nom: e.target.value }))}
              placeholder="Ex. Ahmed B."
              maxLength={80}
              style={{ background: '#151515', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 14 }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,.45fr) minmax(260px,1fr)', gap: 10, marginBottom: 10 }}>
          <div style={{ background: '#151515', border: '1px solid #333', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 700, marginBottom: 7 }}>NOTE</div>
            <Stars note={form.note} interactive onChange={note => setForm(current => ({ ...current, note }))} />
          </div>
          <label style={{ display: 'grid', gap: 6, color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 700 }}>
            COMMENTAIRE
            <textarea
              rows={4}
              value={form.commentaire}
              onChange={e => setForm(current => ({ ...current, commentaire: e.target.value }))}
              maxLength={1200}
              placeholder="Le commentaire reçu sur WhatsApp…"
              style={{ background: '#151515', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} />
          <span style={{ color: 'rgba(255,255,255,.38)', fontSize: 11 }}>JPG / PNG / WebP / GIF · 2 Mo max · stockage ≤ 1 Mo</span>
          {(photoPreview || form.photo) && (
            <img src={photoPreview || form.photo} alt="Aperçu avis" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 9, border: '1px solid rgba(201,168,76,.25)' }} />
          )}
          <button
            className="act-btn"
            onClick={saveReview}
            disabled={saving || uploading}
            style={{ marginLeft: 'auto', background: 'var(--br)', color: '#000', border: 'none', fontWeight: 800 }}
          >
            {saving || uploading ? 'Enregistrement…' : editingId ? '💾 Enregistrer' : '+ Ajouter l’avis'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '9px 11px', color: '#fca5a5', fontSize: 12 }}>
            {error}
          </div>
        )}
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un client, commentaire ou produit…"
        />
        <span style={{ color: 'var(--g4)', fontSize: 12 }}>{filteredReviews.length} avis</span>
      </div>

      {loading ? <div className="spinner">Chargement…</div> : filteredReviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'rgba(255,255,255,.35)' }}>
          Aucun avis trouvé.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredReviews.map(review => {
            const product = productMap.get(String(review.product_id))
            return (
              <div key={review.id} style={{
                background: '#151515', border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 12, padding: 12,
                display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 12, alignItems: 'center',
              }}>
                <div>
                  {review.photo ? (
                    <img src={review.photo} alt="Photo avis" loading="lazy" style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 68, height: 68, borderRadius: 10, background: '#202020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.2)', fontSize: 26 }}>⭐</div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'white', fontSize: 13 }}>{review.nom}</strong>
                    <Stars note={Number(review.note)} />
                    <span style={{ color: 'var(--g4)', fontSize: 10 }}>{new Date(review.created_at).toLocaleDateString('fr-DZ')}</span>
                  </div>
                  <div style={{ color: 'var(--br)', fontSize: 11, marginTop: 4 }}>{product?.nom || `Produit #${review.product_id}`}</div>
                  <div style={{ color: 'rgba(255,255,255,.62)', fontSize: 12, lineHeight: 1.45, marginTop: 5, whiteSpace: 'pre-wrap' }}>{review.commentaire}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="act-btn" onClick={() => editReview(review)}>✏️ Modifier</button>
                  <button className="act-btn danger" onClick={() => deleteReview(review)}>🗑️ Supprimer</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
