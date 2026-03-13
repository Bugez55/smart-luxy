import { useState, useRef } from 'react'
import { supabase } from '../../supabase'

const CATS = ['Cuisine','Maison','Électronique','Mode','Beauté','Sport','Jardin','Autre']
const BADGES = ['','⚡ Nouveau','🔥 Tendance','⭐ Top vente','💎 Premium','🎁 Promo']

export default function ProductForm({ product, onClose, onSave }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    nom:        product?.nom || '',
    prix:       product?.prix || '',
    prix_old:   product?.prix_old || '',
    categorie:  product?.categorie || '',
    badge:      product?.badge || '',
    emoji:      product?.emoji || '📦',
    desc:       product?.description || '',
    specs:      product?.specs ? (typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs) : [],
    images:     product?.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    img:        product?.img || '',
    display_order: product?.display_order || 99,
    stock: product?.stock !== undefined && product?.stock !== null ? product.stock : '',
  })
  const [newSpec, setNewSpec] = useState('')
  const [uploading, setUploading] = useState(false)
  const [newImgUrl, setNewImgUrl] = useState('')
  const [newImgLabel, setNewImgLabel] = useState('')
  const fileRef = useRef()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Upload image to Supabase Storage
  async function uploadFile(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `products/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('product-images').upload(path, file)
    setUploading(false)
    if (error) { alert('Erreur upload: ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const url = await uploadFile(file)
      if (url) {
        const isGif = file.type === 'image/gif' || file.type === 'image/webp'
        addImageRow(url, file.name, isGif ? 'gif' : 'image')
      }
    }
  }

  function addImageRow(url = '', label = '', type = 'image') {
    set('images', [...form.images, { url, label, type }])
    if (!form.img && url) set('img', url)
  }

  function updateImg(i, key, val) {
    const imgs = form.images.map((img, idx) => idx === i ? { ...img, [key]: val } : img)
    set('images', imgs)
  }

  function removeImg(i) {
    const imgs = form.images.filter((_, idx) => idx !== i)
    set('images', imgs)
    if (form.img === form.images[i]?.url) {
      set('img', imgs[0]?.url || '')
    }
  }

  function addSpec() {
    if (!newSpec.trim()) return
    set('specs', [...form.specs, newSpec.trim()])
    setNewSpec('')
  }

  function removeSpec(i) { set('specs', form.specs.filter((_, idx) => idx !== i)) }

  function addUrlImg() {
    if (!newImgUrl.trim()) return
    addImageRow(newImgUrl.trim(), newImgLabel || newImgUrl.split('/').pop(), 'image')
    setNewImgUrl(''); setNewImgLabel('')
  }

  function handleSave() {
    if (!form.nom || !form.prix) return
    const data = {
      ...(isEdit ? { id: product.id } : {}),
      nom: form.nom,
      prix: Number(form.prix),
      prix_old: Number(form.prix_old) || null,
      categorie: form.categorie,
      badge: form.badge,
      emoji: form.emoji,
      description: form.desc,
      specs: form.specs,
      images: form.images,
      img: form.img || form.images[0]?.url || null,
      display_order: Number(form.display_order) || 99,
      stock: form.stock !== '' ? Number(form.stock) : null,
    }
    onSave(data)
  }

  return (
    <div className="pf-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pf">
        <div className="pf-hdr">
          <h2>{isEdit ? '✏️ Modifier le produit' : '➕ Nouveau produit'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="pf-body">
          {/* Infos de base */}
          <div className="pf-section">
            <h3>Informations</h3>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>Nom du produit *</label>
              <input placeholder="Ex: Mini Robot Culinaire 4-en-1" value={form.nom} onChange={e => set('nom', e.target.value)} />
            </div>
            <div className="pf-grid">
              <div className="form-field">
                <label>Prix (DA) *</label>
                <input type="number" placeholder="2990" value={form.prix} onChange={e => set('prix', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Ancien prix (DA)</label>
                <input type="number" placeholder="4500" value={form.prix_old} onChange={e => set('prix_old', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Catégorie</label>
                <select value={form.categorie} onChange={e => set('categorie', e.target.value)}>
                  <option value="">Choisir…</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Badge</label>
                <select value={form.badge} onChange={e => set('badge', e.target.value)}>
                  {BADGES.map(b => <option key={b} value={b}>{b || '— Aucun —'}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Emoji</label>
                <input placeholder="📦" value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4} />
              </div>
              <div className="form-field">
                <label>Ordre affichage</label>
                <input type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Stock disponible</label>
                <input
                  type="number" min="0"
                  placeholder="Illimité si vide"
                  value={form.stock}
                  onChange={e => set('stock', e.target.value)}
                />
                {form.stock !== '' && Number(form.stock) <= 5 && Number(form.stock) > 0 && (
                  <div style={{ fontSize:11, color:'#f87171', marginTop:4 }}>
                    ⚠️ Stock bas — badge rouge affiché sur le produit
                  </div>
                )}
                {form.stock !== '' && Number(form.stock) === 0 && (
                  <div style={{ fontSize:11, color:'#fca5a5', marginTop:4 }}>
                    ❌ Produit marqué comme ÉPUISÉ
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pf-section">
            <h3>Description</h3>
            <div className="form-field">
              <textarea
                rows={4}
                placeholder="Description du produit (HTML supporté : <b>, <br>, etc.)"
                value={form.desc}
                onChange={e => set('desc', e.target.value)}
              />
            </div>
          </div>

          {/* Specs */}
          <div className="pf-section">
            <h3>Caractéristiques</h3>
            {form.specs.map((s, i) => (
              <div key={i} className="img-row">
                <span style={{ flex: 1, fontSize: 13, color: 'white' }}>✓ {s}</span>
                <button className="img-row del" onClick={() => removeSpec(i)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13 }}
                placeholder="Ex: Batterie USB-C incluse"
                value={newSpec}
                onChange={e => setNewSpec(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSpec()}
              />
              <button className="act-btn" onClick={addSpec}>+ Ajouter</button>
            </div>
          </div>

          {/* Images */}
          <div className="pf-section">
            <h3>Photos & Médias</h3>

            {/* Upload depuis l'appareil */}
            <label
              className="upload-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={async e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); for(const f of files){ const url = await uploadFile(f); if(url) addImageRow(url, f.name, f.type.includes('gif')||f.type.includes('webp')?'gif':'image') } }}
            >
              <input ref={fileRef} type="file" accept="image/*,.gif,.webp" multiple onChange={handleFileSelect} />
              <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, color: 'var(--g4)' }}>{uploading ? '⏳ Upload en cours…' : 'Cliquer ou glisser des photos/GIFs ici'}</div>
              <div style={{ fontSize: 11, color: 'var(--g5)', marginTop: 4 }}>JPG, PNG, WebP, GIF</div>
            </label>

            {/* URL manuelle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                style={{ flex: 2, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13 }}
                placeholder="URL d'image (https://…)"
                value={newImgUrl}
                onChange={e => setNewImgUrl(e.target.value)}
              />
              <input
                style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13 }}
                placeholder="Label"
                value={newImgLabel}
                onChange={e => setNewImgLabel(e.target.value)}
              />
              <button className="act-btn" onClick={addUrlImg}>+ URL</button>
            </div>

            {/* Images list */}
            {form.images.map((img, i) => (
              <div key={i} className="img-row">
                {img.url && <img src={img.url} className="img-preview" alt="" onError={e => e.target.style.display='none'} />}
                <input placeholder="Label" value={img.label} onChange={e => updateImg(i, 'label', e.target.value)} style={{ flex: 1 }} />
                <select value={img.type} onChange={e => updateImg(i, 'type', e.target.value)}>
                  <option value="image">🖼 Image</option>
                  <option value="gif">🎬 GIF/Vidéo</option>
                </select>
                <button
                  style={{ background: 'none', border: 'none', color: form.img === img.url ? 'var(--br)' : 'var(--g4)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                  title="Définir comme image principale"
                  onClick={() => set('img', img.url)}
                >★</button>
                <button className="img-row del" onClick={() => removeImg(i)}>✕</button>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--g4)', marginTop: 6 }}>⭐ = image principale · 🎬 = GIF/animation</p>
          </div>
        </div>

        <div className="pf-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={handleSave} disabled={!form.nom || !form.prix}>
            {isEdit ? '💾 Enregistrer' : '➕ Créer le produit'}
          </button>
        </div>
      </div>
    </div>
  )
}
