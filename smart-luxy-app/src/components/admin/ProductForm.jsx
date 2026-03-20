import { useState, useRef } from 'react'
import { supabase } from '../../supabase'

const CATS = ['Cuisine','Maison','Électronique','Mode','Beauté','Sport','Jardin','Autre']
const BADGES = ['','⚡ Nouveau','🔥 Tendance','⭐ Top vente','💎 Premium','🎁 Promo']

export default function ProductForm({ product, onClose, onSave }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    nom:           product?.nom || '',
    prix:          product?.prix || '',
    prix_old:      product?.prix_old || '',
    categorie:     product?.categorie || '',
    badge:         product?.badge || '',
    emoji:         product?.emoji || '📦',
    desc:          product?.description || '',
    specs:         product?.specs ? (typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs) : [],
    images:        product?.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    img:           product?.img || '',
    display_order: product?.display_order || 99,
    stock:         product?.stock !== undefined && product?.stock !== null ? String(product.stock) : '',
    card_color:    product?.card_color || '',
    ventes:        product?.ventes || 0,
  })
  const [newSpec, setNewSpec] = useState('')
  const [uploading, setUploading] = useState(false)
  const [newImgUrl, setNewImgUrl] = useState('')
  const [newImgLabel, setNewImgLabel] = useState('')
  const fileRef = useRef()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadFile(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `products/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    setUploading(false)
    if (error) { alert('Erreur upload: ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const url = await uploadFile(file)
      if (url) addImageRow(url, file.name, file.type.includes('gif') || file.type.includes('webp') ? 'gif' : 'image')
    }
  }

  function addImageRow(url = '', label = '', type = 'image') {
    set('images', [...form.images, { url, label, type }])
    if (!form.img && url) set('img', url)
  }

  function updateImg(i, key, val) {
    set('images', form.images.map((img, idx) => idx === i ? { ...img, [key]: val } : img))
  }

  function removeImg(i) {
    const imgs = form.images.filter((_, idx) => idx !== i)
    set('images', imgs)
    if (form.img === form.images[i]?.url) set('img', imgs[0]?.url || '')
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
    onSave({
      ...(isEdit ? { id: product.id } : {}),
      nom:           form.nom,
      prix:          Number(form.prix),
      prix_old:      Number(form.prix_old) || null,
      categorie:     form.categorie,
      badge:         form.badge,
      emoji:         form.emoji,
      description:   form.desc,
      specs:         form.specs,
      images:        form.images,
      img:           form.img || form.images[0]?.url || null,
      display_order: Number(form.display_order) || 99,
      stock:         form.stock !== '' ? Number(form.stock) : null,
      card_color:    form.card_color || null,
      ventes:        Number(form.ventes) || 0,
    })
  }

  // Indicateur stock
  const stockNum = form.stock !== '' ? Number(form.stock) : null
  const stockStatus = stockNum === null ? null : stockNum === 0 ? 'epuise' : stockNum <= 5 ? 'bas' : 'ok'

  return (
    <div className="pf-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pf">
        <div className="pf-hdr">
          <h2>{isEdit ? '✏️ Modifier le produit' : '➕ Nouveau produit'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="pf-body">
          {/* ── Infos de base ── */}
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
            </div>
          </div>

          {/* ── STOCK ── */}
          <div className="pf-section">
            <h3>📦 Gestion du stock</h3>
            <div className="form-field">
              <label>Quantité en stock</label>
              <input
                type="number"
                min="0"
                placeholder="Laisser vide = stock illimité"
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                style={{
                  border: `2px solid ${
                    stockStatus === 'epuise' ? '#ef4444' :
                    stockStatus === 'bas' ? '#f97316' :
                    stockStatus === 'ok' ? '#22c55e' : 'rgba(255,255,255,.1)'
                  }`,
                  transition: 'border-color .2s',
                }}
              />
            </div>

            {/* Indicateur visuel */}
            <div style={{
              marginTop: 10,
              padding: '10px 14px',
              borderRadius: 10,
              background: stockStatus === null
                ? 'rgba(255,255,255,.04)'
                : stockStatus === 'epuise'
                  ? 'rgba(239,68,68,.1)'
                  : stockStatus === 'bas'
                    ? 'rgba(249,115,22,.1)'
                    : 'rgba(34,197,94,.08)',
              border: `1px solid ${
                stockStatus === null ? 'rgba(255,255,255,.08)' :
                stockStatus === 'epuise' ? 'rgba(239,68,68,.3)' :
                stockStatus === 'bas' ? 'rgba(249,115,22,.3)' : 'rgba(34,197,94,.2)'
              }`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>
                {stockStatus === null ? '♾️' : stockStatus === 'epuise' ? '🚫' : stockStatus === 'bas' ? '🔥' : '✅'}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>
                  {stockStatus === null && 'Stock illimité — aucun badge affiché'}
                  {stockStatus === 'epuise' && 'ÉPUISÉ — boutons désactivés sur le site'}
                  {stockStatus === 'bas' && `Stock bas (${stockNum}) — badge rouge animé sur le site`}
                  {stockStatus === 'ok' && `${stockNum} unités disponibles — stock normal`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                  {stockStatus === null && 'Le stock est automatiquement déduit à chaque commande si défini'}
                  {stockStatus === 'epuise' && 'Les clients ne peuvent plus commander ce produit'}
                  {stockStatus === 'bas' && 'Urgence d\'achat affichée — booste les conversions'}
                  {stockStatus === 'ok' && 'Le stock se déduit automatiquement à chaque commande'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Personnalisation carte ── */}
          <div className="pf-section">
            <h3>🎨 Personnalisation de la carte</h3>

            <div className="pf-grid">
              <div className="form-field">
                <label>Couleur de fond de la carte</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input
                    type="color"
                    value={form.card_color || '#141414'}
                    onChange={e => set('card_color', e.target.value)}
                    style={{ width:44, height:36, borderRadius:8, border:'1px solid #333', background:'none', cursor:'pointer', padding:2 }}
                  />
                  <input
                    placeholder="Ex: #1a1a2e ou vide = noir"
                    value={form.card_color}
                    onChange={e => set('card_color', e.target.value)}
                    style={{ flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'8px 12px', color:'white', fontSize:13, outline:'none' }}
                  />
                  {form.card_color && (
                    <button onClick={() => set('card_color', '')} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:16 }}>✕</button>
                  )}
                </div>
                {/* Palettes rapides */}
                <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                  {[
                    { label:'Noir', color:'#141414' },
                    { label:'Verre', color:'rgba(255,255,255,0.05)' },
                    { label:'Bleu nuit', color:'#0d1526' },
                    { label:'Violet', color:'#120f1e' },
                    { label:'Vert', color:'#071410' },
                    { label:'Rouge', color:'#170b0b' },
                    { label:'Or', color:'#1a1200' },
                    { label:'Rose', color:'#1a0a10' },
                  ].map(p => (
                    <button
                      key={p.color}
                      onClick={() => set('card_color', p.color)}
                      style={{
                        background: p.color,
                        border: `2px solid ${form.card_color === p.color ? '#C9A84C' : 'rgba(255,255,255,.15)'}`,
                        borderRadius:8, padding:'4px 10px',
                        color:'rgba(255,255,255,.7)', fontSize:10, fontWeight:700,
                        cursor:'pointer',
                      }}
                    >{p.label}</button>
                  ))}
                </div>

                {/* Aperçu de la carte */}
                <div style={{ marginTop:12, padding:12, borderRadius:12, background:'#0a0a0a', border:'1px solid #333' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:8, fontWeight:700, letterSpacing:'.06em' }}>APERÇU</div>
                  <div style={{
                    background: form.card_color || '#141414',
                    borderRadius:12, overflow:'hidden',
                    border:'1px solid rgba(255,255,255,.08)', maxWidth:160,
                  }}>
                    <div style={{ height:80, background:'rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>
                      {form.emoji || '📦'}
                    </div>
                    <div style={{ padding:'8px 10px' }}>
                      <div style={{ fontSize:11, color:'white', fontWeight:700, marginBottom:4 }}>{form.nom || 'Nom du produit'}</div>
                      <div style={{ fontSize:13, color:'#C9A84C', fontWeight:900 }}>{form.prix ? Number(form.prix).toLocaleString() + ' DA' : '0 DA'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label>Nombre de ventes affiché</label>
                <input
                  type="number" min="0"
                  placeholder="Ex: 127"
                  value={form.ventes}
                  onChange={e => set('ventes', e.target.value)}
                  style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'10px 12px', color:'white', fontSize:'16px', outline:'none', width:'100%', boxSizing:'border-box' }}
                />
                <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:6 }}>
                  S'affiche sous forme "⚡ {form.ventes || 0} vendus" sur la carte
                </div>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div className="pf-section">
            <h3>Description</h3>
            <div className="form-field">
              <textarea
                rows={4}
                placeholder="Description du produit"
                value={form.desc}
                onChange={e => set('desc', e.target.value)}
              />
            </div>
          </div>

          {/* ── Specs ── */}
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

          {/* ── Images ── */}
          <div className="pf-section">
            <h3>Photos & Médias</h3>
            <label
              className="upload-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) addImageRow(url, f.name, f.type.includes('gif') || f.type.includes('webp') ? 'gif' : 'image')
                }
              }}
            >
              <input ref={fileRef} type="file" accept="image/*,.gif,.webp" multiple onChange={handleFileSelect} />
              <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, color: 'var(--g4)' }}>
                {uploading
                ? '⏳ Compression + upload en cours…'
                : 'Cliquer ou glisser des photos ici'
              }
              </div>
              <div style={{ fontSize: 11, color: 'var(--g5)', marginTop: 4 }}>JPG, PNG, WebP, GIF</div>
            </label>

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