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
    images:         product?.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    images_gallery: product?.images_gallery ? (typeof product.images_gallery === 'string' ? JSON.parse(product.images_gallery) : product.images_gallery) : [],
    img:           product?.img || '',
    display_order: product?.display_order || 99,
    stock:         product?.stock !== undefined && product?.stock !== null ? String(product.stock) : '',
    video_url:     product?.video_url || '',
    display_mode:  product?.display_mode || 'scroll',
    card_color:    product?.card_color || '',
    ventes:        product?.ventes || 0,
    note_etoiles:  product?.note_etoiles !== undefined ? String(product.note_etoiles) : '5',
    nb_commandes:  product?.nb_commandes || 0,
    bundles:       product?.bundles ? (typeof product.bundles === 'string' ? JSON.parse(product.bundles) : product.bundles) : [],
    faq:           product?.faq ? (typeof product.faq === 'string' ? JSON.parse(product.faq) : product.faq) : [],
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
      images:         form.images,
      images_gallery: form.images_gallery.length > 0 ? form.images_gallery : null,
      img:           form.img || form.images[0]?.url || null,
      display_order: Number(form.display_order) || 99,
      stock:         form.stock !== '' ? Number(form.stock) : null,
      video_url:     form.video_url || null,
      display_mode:  form.display_mode || 'scroll',
      card_color:    form.card_color || null,
      ventes:        Number(form.ventes) || 0,
      note_etoiles:  form.note_etoiles !== '' ? Number(form.note_etoiles) : null,
      nb_commandes:  Number(form.nb_commandes) || 0,
      bundles:       form.bundles.length > 0 ? form.bundles : null,
      faq:           form.faq.length > 0 ? form.faq : null,
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
                  S'affiche "⚡ {form.ventes || 0} vendus" sur la carte
                </div>
              </div>

              <div className="form-field">
                <label>Note étoiles (1 à 5)</label>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => set('note_etoiles', String(n))} style={{
                      background: Number(form.note_etoiles) >= n ? 'rgba(249,168,37,.2)' : '#1a1a1a',
                      border: `1px solid ${Number(form.note_etoiles) >= n ? '#F9A825' : '#333'}`,
                      borderRadius:8, width:36, height:36, fontSize:18, cursor:'pointer',
                      color: Number(form.note_etoiles) >= n ? '#F9A825' : '#444',
                    }}>★</button>
                  ))}
                  <span style={{ fontSize:14, fontWeight:800, color:'#F9A825' }}>{form.note_etoiles}/5</span>
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>
                  Note fixe affichée sur la carte (indépendant des vrais avis)
                </div>
              </div>

              <div className="form-field">
                <label>Nombre de commandes</label>
                <input
                  type="number" min="0"
                  placeholder="Ex: 348"
                  value={form.nb_commandes}
                  onChange={e => set('nb_commandes', e.target.value)}
                  style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'10px 12px', color:'white', fontSize:'16px', outline:'none', width:'100%', boxSizing:'border-box' }}
                />
                <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:6 }}>
                  S'affiche "📦 {form.nb_commandes || 0} commandes" sur la page produit
                </div>
              </div>
            </div>
          </div>

          {/* ── BUNDLES / PACKS ── */}
          <div className="pf-section">
            <h3>📦 Packs & Quantités (optionnel)</h3>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:12, lineHeight:1.5 }}>
              Ajoute des offres par quantité — ex: "1 unité = 850 DA", "3 unités = 2400 DA". Le client choisit son pack avant de commander.
            </p>
            {form.bundles.map((b, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
                <input
                  placeholder="Label ex: 3 unités"
                  value={b.label}
                  onChange={e => { const bl = [...form.bundles]; bl[i]={...bl[i],label:e.target.value}; set('bundles',bl) }}
                  style={{ flex:2, background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'8px 12px', color:'white', fontSize:13, outline:'none' }}
                />
                <input
                  type="number" placeholder="Quantité"
                  value={b.qty}
                  onChange={e => { const bl = [...form.bundles]; bl[i]={...bl[i],qty:Number(e.target.value)}; set('bundles',bl) }}
                  style={{ flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'8px 12px', color:'white', fontSize:13, outline:'none' }}
                />
                <input
                  type="number" placeholder="Prix DA"
                  value={b.prix}
                  onChange={e => { const bl = [...form.bundles]; bl[i]={...bl[i],prix:Number(e.target.value)}; set('bundles',bl) }}
                  style={{ flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'8px 12px', color:'white', fontSize:13, outline:'none' }}
                />
                <button onClick={() => set('bundles', form.bundles.filter((_,j)=>j!==i))}
                  style={{ background:'rgba(239,68,68,.15)', border:'none', borderRadius:8, width:32, height:36, color:'#fca5a5', cursor:'pointer', flexShrink:0 }}>✕</button>
              </div>
            ))}
            <button className="act-btn" onClick={() => set('bundles', [...form.bundles, { label:'', qty:1, prix:0 }])}>
              + Ajouter un pack
            </button>
          </div>

          {/* ── FAQ ── */}
          <div className="pf-section">
            <h3>❓ FAQ (Questions fréquentes)</h3>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:12, lineHeight:1.5 }}>
              Questions/réponses qui s'affichent en bas de la page produit. Rassure le client et réduit les abandons.
            </p>
            {form.faq.map((f, i) => (
              <div key={i} style={{ background:'#111', borderRadius:10, padding:12, marginBottom:8, border:'1px solid #333' }}>
                <div style={{ display:'flex', gap:8, marginBottom:6 }}>
                  <input
                    placeholder="Question"
                    value={f.q}
                    onChange={e => { const fq=[...form.faq]; fq[i]={...fq[i],q:e.target.value}; set('faq',fq) }}
                    style={{ flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'8px 12px', color:'white', fontSize:13, outline:'none' }}
                  />
                  <button onClick={() => set('faq', form.faq.filter((_,j)=>j!==i))}
                    style={{ background:'rgba(239,68,68,.15)', border:'none', borderRadius:8, width:32, color:'#fca5a5', cursor:'pointer', flexShrink:0 }}>✕</button>
                </div>
                <textarea
                  placeholder="Réponse"
                  rows={2}
                  value={f.r}
                  onChange={e => { const fq=[...form.faq]; fq[i]={...fq[i],r:e.target.value}; set('faq',fq) }}
                  style={{ width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'8px 12px', color:'white', fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
                />
              </div>
            ))}
            <button className="act-btn" onClick={() => set('faq', [...form.faq, { q:'', r:'' }])}>
              + Ajouter une question
            </button>
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
          {/* ── Vidéo produit ── */}
          <div className="pf-section">
            <h3>🎬 Vidéo produit (optionnel)</h3>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:10, lineHeight:1.5 }}>
              Colle un lien YouTube ou TikTok. La vidéo s'affiche sur la page produit.
            </p>
            <input
              placeholder="https://youtube.com/watch?v=... ou https://tiktok.com/..."
              value={form.video_url}
              onChange={e => set('video_url', e.target.value)}
              style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:'10px 12px', color:'white', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
            />
            {form.video_url && (
              <div style={{ marginTop:8, background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#C9A84C', display:'flex', alignItems:'center', gap:8 }}>
                ✅ Lien vidéo enregistré — s'affichera sur la page produit
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════
              SECTION 1 — CARROUSEL (swipe gauche/droite)
          ══════════════════════════════════════ */}
          <div className="pf-section" style={{ border:'2px solid rgba(201,168,76,.25)', borderRadius:14 }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
              🎠 Photos carrousel
              <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.35)', marginLeft:4 }}>→ Swipe gauche/droite en haut du produit</span>
            </h3>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:12, lineHeight:1.5 }}>
              Mets ici les <strong style={{color:'#C9A84C'}}>3 à 5 meilleures photos</strong> — celles qui font vendre. Le client les swipe en haut de la page.
            </p>

            {/* Upload zone carrousel */}
            <label className="upload-zone" style={{ borderColor:'rgba(201,168,76,.3)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) {
                    set('images', [...form.images, { url, label:'', type:'image' }])
                    if (!form.img) set('img', url)
                  }
                }
              }}
            >
              <input type="file" accept="image/*" multiple onChange={async e => {
                const files = Array.from(e.target.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) {
                    set('images', [...form.images, { url, label:'', type:'image' }])
                    if (!form.img) set('img', url)
                  }
                }
                e.target.value = ''
              }} />
              <div style={{ fontSize:24, marginBottom:4 }}>🎠</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>
                {uploading ? '⏳ Upload...' : 'Ajouter photos carrousel'}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.25)', marginTop:3 }}>JPG, PNG, WebP</div>
            </label>

            {/* Liste photos carrousel */}
            {form.images.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:11, color:'rgba(201,168,76,.6)', fontWeight:800, marginBottom:8, letterSpacing:'.04em' }}>
                  {form.images.length} photo{form.images.length>1?'s':''} dans le carrousel
                </div>
                {form.images.map((img, i) => (
                  <div key={`car-${i}`} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, background:'rgba(201,168,76,.05)', border:'1px solid rgba(201,168,76,.2)', borderRadius:10, padding:'8px 10px' }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#C9A84C', color:'#000', fontSize:10, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    {img.url && <img src={img.url} alt="" style={{ width:50, height:50, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
                    <div style={{ flex:1, fontSize:11, color:'rgba(255,255,255,.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {form.img === img.url && <span style={{ color:'#C9A84C', fontWeight:800 }}>⭐ Principale · </span>}
                      {img.url?.split('/').pop()?.slice(-20)}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <button onClick={() => { if(i===0) return; const arr=[...form.images]; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; set('images',arr); if(i===1||i-1===0)set('img',arr[0]?.url||'') }} disabled={i===0} style={{ background:i>0?'rgba(255,255,255,.1)':'transparent', border:'none', borderRadius:4, width:22, height:20, color:i>0?'white':'rgba(255,255,255,.15)', cursor:i>0?'pointer':'default', fontSize:10 }}>▲</button>
                      <button onClick={() => { if(i===form.images.length-1) return; const arr=[...form.images]; [arr[i],arr[i+1]]=[arr[i+1],arr[i]]; set('images',arr); if(i===0)set('img',arr[0]?.url||'') }} disabled={i===form.images.length-1} style={{ background:i<form.images.length-1?'rgba(255,255,255,.1)':'transparent', border:'none', borderRadius:4, width:22, height:20, color:i<form.images.length-1?'white':'rgba(255,255,255,.15)', cursor:i<form.images.length-1?'pointer':'default', fontSize:10 }}>▼</button>
                    </div>
                    <button onClick={() => set('img', img.url)} style={{ background:'none', border:'none', color:form.img===img.url?'#C9A84C':'rgba(255,255,255,.2)', cursor:'pointer', fontSize:16 }}>★</button>
                    <button onClick={() => { const arr=form.images.filter((_,j)=>j!==i); set('images',arr); if(form.img===img.url)set('img',arr[0]?.url||'') }} style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:11, padding:'3px 8px', fontWeight:800 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {form.images.length === 0 && <div style={{ textAlign:'center', padding:12, color:'rgba(255,255,255,.2)', fontSize:12 }}>Aucune photo carrousel</div>}
          </div>

          {/* ══════════════════════════════════════
              SECTION 2 — GALERIE VERTICALE (scroll bas)
          ══════════════════════════════════════ */}
          <div className="pf-section" style={{ border:'2px solid rgba(59,130,246,.25)', borderRadius:14 }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
              📜 Photos galerie
              <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.35)', marginLeft:4 }}>→ Scroll vertical en bas du produit</span>
            </h3>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:12, lineHeight:1.5 }}>
              Mets ici les <strong style={{color:'#93c5fd'}}>photos détaillées</strong> — dimensions, emballage, utilisation, comparaisons. Le client les voit en scrollant.
            </p>

            {/* Upload zone galerie */}
            <label className="upload-zone" style={{ borderColor:'rgba(59,130,246,.3)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) set('images_gallery', [...form.images_gallery, { url, label:'', type:'image' }])
                }
              }}
            >
              <input type="file" accept="image/*" multiple onChange={async e => {
                const files = Array.from(e.target.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) set('images_gallery', [...form.images_gallery, { url, label:'', type:'image' }])
                }
                e.target.value = ''
              }} />
              <div style={{ fontSize:24, marginBottom:4 }}>📜</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>
                {uploading ? '⏳ Upload...' : 'Ajouter photos galerie'}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.25)', marginTop:3 }}>JPG, PNG, WebP</div>
            </label>

            {/* Liste photos galerie */}
            {form.images_gallery.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:11, color:'rgba(59,130,246,.7)', fontWeight:800, marginBottom:8, letterSpacing:'.04em' }}>
                  {form.images_gallery.length} photo{form.images_gallery.length>1?'s':''} dans la galerie
                </div>
                {form.images_gallery.map((img, i) => (
                  <div key={`gal-${i}`} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, background:'rgba(59,130,246,.04)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:'8px 10px' }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'rgba(59,130,246,.5)', color:'white', fontSize:10, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    {img.url && <img src={img.url} alt="" style={{ width:50, height:50, borderRadius:8, objectFit:'cover', flexShrink:0 }} />}
                    <div style={{ flex:1, fontSize:11, color:'rgba(255,255,255,.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {img.url?.split('/').pop()?.slice(-20)}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <button onClick={() => { if(i===0) return; const arr=[...form.images_gallery]; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; set('images_gallery',arr) }} disabled={i===0} style={{ background:i>0?'rgba(255,255,255,.1)':'transparent', border:'none', borderRadius:4, width:22, height:20, color:i>0?'white':'rgba(255,255,255,.15)', cursor:i>0?'pointer':'default', fontSize:10 }}>▲</button>
                      <button onClick={() => { if(i===form.images_gallery.length-1) return; const arr=[...form.images_gallery]; [arr[i],arr[i+1]]=[arr[i+1],arr[i]]; set('images_gallery',arr) }} disabled={i===form.images_gallery.length-1} style={{ background:i<form.images_gallery.length-1?'rgba(255,255,255,.1)':'transparent', border:'none', borderRadius:4, width:22, height:20, color:i<form.images_gallery.length-1?'white':'rgba(255,255,255,.15)', cursor:i<form.images_gallery.length-1?'pointer':'default', fontSize:10 }}>▼</button>
                    </div>
                    <button onClick={() => set('images_gallery', form.images_gallery.filter((_,j)=>j!==i))} style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:11, padding:'3px 8px', fontWeight:800 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {form.images_gallery.length === 0 && <div style={{ textAlign:'center', padding:12, color:'rgba(255,255,255,.2)', fontSize:12 }}>Aucune photo galerie</div>}
          </div>

          {/* ANCIEN SECTION — remplacé — placeholder pour compatibilité */}
          <div className="pf-section" style={{ display:'none' }}>
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

            {/* Mode d'affichage */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>Mode d'affichage des photos</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  { val:'scroll', icon:'📜', label:'Défilement vertical', desc:'Photos empilées (MarketDZ)' },
                  { val:'slider', icon:'🎠', label:'Carrousel swipe', desc:'Une photo à la fois' },
                  { val:'grid', icon:'⊞', label:'Grille 2 colonnes', desc:"Toutes visibles d'un coup" },
                  { val:'cinema', icon:'🎬', label:'Grande + miniatures', desc:'Style boutique premium' },
                ].map(m => (
                  <div key={m.val} onClick={() => set('display_mode', m.val)} style={{
                    background: form.display_mode===m.val ? 'rgba(201,168,76,.12)' : '#1a1a1a',
                    border: `2px solid ${form.display_mode===m.val ? '#C9A84C' : 'rgba(255,255,255,.08)'}`,
                    borderRadius:10, padding:'10px 12px', cursor:'pointer', transition:'all .2s',
                  }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
                    <div style={{ fontSize:11, fontWeight:800, color: form.display_mode===m.val ? '#C9A84C' : 'white', marginBottom:2 }}>{m.label}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Liste images avec drag & drop */}
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>
              Ordre des photos — {form.images.length} photo{form.images.length>1?'s':''}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.25)', marginBottom:10 }}>
              ☰ Glisse pour réordonner · ⭐ Photo principale · ✕ Supprimer
            </div>

            {/* Légende zones */}
            {form.images.length > 0 && (
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'rgba(255,255,255,.35)' }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:'#C9A84C', flexShrink:0 }} />
                  Photos 1-3 → Carrousel en haut
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'rgba(255,255,255,.35)' }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:'#3b82f6', flexShrink:0 }} />
                  Photos 4+ → Galerie verticale en bas
                </div>
              </div>
            )}

            {form.images.map((img, i) => {
              const isCarousel = i < 3
              const isMain = form.img === img.url

              function moveUp() {
                if (i === 0) return
                const arr = [...form.images]
                ;[arr[i-1], arr[i]] = [arr[i], arr[i-1]]
                set('images', arr)
                if (i === 1 || i-1 === 0) set('img', arr[0]?.url || '')
              }
              function moveDown() {
                if (i === form.images.length - 1) return
                const arr = [...form.images]
                ;[arr[i], arr[i+1]] = [arr[i+1], arr[i]]
                set('images', arr)
                if (i === 0) set('img', arr[0]?.url || '')
              }

              return (
                <div key={`img-${i}`} style={{
                  display:'flex', alignItems:'center', gap:8, marginBottom:6,
                  background: isMain ? 'rgba(201,168,76,.08)' : '#1a1a1a',
                  border: `2px solid ${isMain ? '#C9A84C' : isCarousel ? 'rgba(201,168,76,.2)' : 'rgba(59,130,246,.2)'}`,
                  borderRadius:10, padding:'8px 10px', transition:'all .15s',
                }}>
                  {/* Tag zone */}
                  <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                    <div style={{ fontSize:8, fontWeight:900, color: isCarousel ? '#C9A84C' : '#93c5fd', letterSpacing:'.04em' }}>
                      {isCarousel ? '🎠' : '📜'}
                    </div>
                    <div style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.3)' }}>#{i+1}</div>
                  </div>

                  {/* Aperçu */}
                  {img.url && <img src={img.url} alt="" style={{ width:52, height:52, borderRadius:8, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'} />}

                  {/* Infos */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color: isCarousel ? 'rgba(201,168,76,.7)' : 'rgba(59,130,246,.7)', fontWeight:700, marginBottom:2 }}>
                      {isMain ? '⭐ Photo principale' : isCarousel ? `Carrousel — position ${i+1}` : `Galerie verticale — position ${i+1}`}
                    </div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {img.url?.split('/').pop()?.slice(-25) || 'image'}
                    </div>
                  </div>

                  {/* Boutons réordonnement mobile ▲▼ */}
                  <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                    <button
                      onClick={moveUp}
                      disabled={i === 0}
                      style={{ background: i>0 ? 'rgba(255,255,255,.08)' : 'transparent', border:'none', borderRadius:5, width:24, height:22, color: i>0 ? 'white' : 'rgba(255,255,255,.15)', cursor: i>0 ? 'pointer' : 'default', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}
                    >▲</button>
                    <button
                      onClick={moveDown}
                      disabled={i === form.images.length - 1}
                      style={{ background: i<form.images.length-1 ? 'rgba(255,255,255,.08)' : 'transparent', border:'none', borderRadius:5, width:24, height:22, color: i<form.images.length-1 ? 'white' : 'rgba(255,255,255,.15)', cursor: i<form.images.length-1 ? 'pointer' : 'default', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}
                    >▼</button>
                  </div>

                  {/* Étoile principale */}
                  <button title="Définir comme principale" onClick={() => set('img', img.url)} style={{ background:'none', border:'none', color:isMain?'#C9A84C':'rgba(255,255,255,.2)', cursor:'pointer', fontSize:18, padding:'2px 4px', flexShrink:0 }}>★</button>
                  {/* Supprimer */}
                  <button onClick={() => removeImg(i)} style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:11, padding:'4px 8px', flexShrink:0, fontWeight:800 }}>✕</button>
                </div>
              )
            })}
            {form.images.length === 0 && <div style={{ textAlign:'center', padding:20, color:'rgba(255,255,255,.2)', fontSize:12 }}>Aucune photo — ajoutes-en ci-dessus</div>}
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
