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
    cout_achat:        product?.cout_achat !== undefined && product?.cout_achat !== null ? String(product.cout_achat) : '',
    frais_liv_est:     product?.frais_liv_est || '400',
    ads_cout_da:       product?.ads_cout_da !== undefined && product?.ads_cout_da !== null ? String(product.ads_cout_da) : '',
    taux_confirmation: product?.taux_confirmation !== undefined && product?.taux_confirmation !== null ? String(product.taux_confirmation) : '60',
    taux_livraison:    product?.taux_livraison !== undefined && product?.taux_livraison !== null ? String(product.taux_livraison) : '60',
    cout_stockage:     product?.cout_stockage !== undefined && product?.cout_stockage !== null ? String(product.cout_stockage) : '',
    cout_retour:       product?.cout_retour !== undefined && product?.cout_retour !== null ? String(product.cout_retour) : '',
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
    stock_initial: product?.stock_initial !== undefined && product?.stock_initial !== null ? String(product.stock_initial) : '',
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

  // Vérifie la vraie signature binaire du fichier (les premiers octets)
  // pour empêcher un fichier malveillant renommé en .jpg/.png de passer
  async function isRealImage(file) {
    const buffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // Signatures binaires officielles des vrais formats image
    const signatures = {
      jpg:  'ffd8ff',
      png:  '89504e47',
      gif:  '474946',
      webp: '52494646', // RIFF (WebP commence par RIFF....WEBP)
    }
    return Object.values(signatures).some(sig => hex.startsWith(sig))
  }

  async function uploadFile(file) {
    // Rejeter tout fichier dont le contenu réel n'est pas une vraie image
    // (empêche un .html/.js/.exe renommé en .png de contourner le filtre accept="")
    const looksLikeImage = await isRealImage(file)
    if (!looksLikeImage) {
      alert('❌ Ce fichier n\'est pas une image valide. Seuls JPG, PNG, GIF et WebP sont acceptés.')
      return null
    }

    // Limite de taille raisonnable (10 Mo) pour éviter les abus
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ Fichier trop volumineux (max 10 Mo).')
      return null
    }

    setUploading(true)

    // Détecter GIF par extension ET par type MIME (certains mobiles ne remplissent pas le type)
    const fileName = file.name || ''
    const isGif = file.type === 'image/gif' || fileName.toLowerCase().endsWith('.gif')

    let fileToUpload = file
    let ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'

    // Compresser SEULEMENT les images fixes non-GIF
    if (!isGif && file.size > 300 * 1024) {
      try {
        fileToUpload = await new Promise(resolve => {
          const img = new Image()
          const objUrl = URL.createObjectURL(file)
          img.onload = () => {
            const MAX = 1200
            let { width, height } = img
            if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            canvas.getContext('2d').drawImage(img, 0, 0, width, height)
            canvas.toBlob(blob => {
              URL.revokeObjectURL(objUrl)
              resolve(blob && blob.size < file.size ? blob : file)
            }, 'image/jpeg', 0.82)
          }
          img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file) }
          img.src = objUrl
        })
        ext = 'jpg'
      } catch { fileToUpload = file }
    }

    const path = `products/${Date.now()}.${ext}`
    const opts = isGif ? { contentType: 'image/gif', upsert: true } : { upsert: true }

    const { error } = await supabase.storage.from('product-images').upload(path, fileToUpload, opts)
    setUploading(false)

    if (error) {
      alert('Erreur upload: ' + error.message)
      return null
    }

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
      cout_achat:        form.cout_achat !== '' ? Number(form.cout_achat) : null,
      ads_cout_da:       form.ads_cout_da !== '' ? Number(form.ads_cout_da) : null,
      taux_confirmation: form.taux_confirmation !== '' ? Number(form.taux_confirmation) : 60,
      taux_livraison:    form.taux_livraison !== '' ? Number(form.taux_livraison) : 60,
      cout_stockage:     form.cout_stockage !== '' ? Number(form.cout_stockage) : null,
      cout_retour:       form.cout_retour !== '' ? Number(form.cout_retour) : null,
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
      stock_initial: form.stock_initial !== '' ? Number(form.stock_initial) : null,
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

          {/* ── 💰 Calculateur de marge réel (avec pub Facebook/TikTok) ── */}
          <div className="pf-section" style={{ border:'2px solid rgba(34,197,94,.25)', borderRadius:14 }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
              💰 Calculateur de marge réelle
              <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.35)', marginLeft:4 }}>→ Pub, confirmation, livraison, retours — le vrai coût</span>
            </h3>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:12, lineHeight:1.5 }}>
              Sur 100 clics publicitaires, tout le monde ne confirme pas sa commande, et tout le monde ne se fait pas livrer. Ce calcul répartit le vrai coût pub sur les ventes qui aboutissent réellement.
            </p>

            <div className="pf-grid">
              <div className="form-field">
                <label>Prix fournisseur / achat (DA)</label>
                <input type="number" placeholder="Ex: 1200" value={form.cout_achat} onChange={e => set('cout_achat', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Coût pub par clic/lead (DA)</label>
                <input type="number" placeholder="Ex: 260" value={form.ads_cout_da} onChange={e => set('ads_cout_da', e.target.value)} />
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>
                  Dépense Facebook/TikTok ÷ nombre de clics ou leads
                </div>
              </div>
              <div className="form-field">
                <label>Taux de confirmation (%)</label>
                <input type="number" min="1" max="100" placeholder="60" value={form.taux_confirmation} onChange={e => set('taux_confirmation', e.target.value)} />
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>
                  % de leads qui confirment vraiment leur commande
                </div>
              </div>
              <div className="form-field">
                <label>Taux de livraison (%)</label>
                <input type="number" min="1" max="100" placeholder="60" value={form.taux_livraison} onChange={e => set('taux_livraison', e.target.value)} />
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>
                  % de commandes confirmées vraiment livrées (reste = retour)
                </div>
              </div>
              <div className="form-field">
                <label>Frais livraison (DA)</label>
                <input type="number" placeholder="400" value={form.frais_liv_est} onChange={e => set('frais_liv_est', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Stockage / autres charges (DA)</label>
                <input type="number" placeholder="Ex: 200" value={form.cout_stockage} onChange={e => set('cout_stockage', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Coût moyen d'un retour (DA)</label>
                <input type="number" placeholder="Ex: 250" value={form.cout_retour} onChange={e => set('cout_retour', e.target.value)} />
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>
                  Frais de renvoi transporteur pour un colis refusé
                </div>
              </div>
            </div>

            {(() => {
              const prixVente   = Number(form.prix) || 0
              const coutAchat   = Number(form.cout_achat) || 0
              const adsCout     = Number(form.ads_cout_da) || 0
              const tauxConfirm = Number(form.taux_confirmation) || 60
              const tauxLiv     = Number(form.taux_livraison) || 60
              const fraisLiv    = Number(form.frais_liv_est) || 0
              const coutStock   = Number(form.cout_stockage) || 0
              const coutRetour  = Number(form.cout_retour) || 0

              const hasData = prixVente > 0 && coutAchat > 0

              if (!hasData) {
                return (
                  <div style={{ textAlign:'center', padding:16, color:'rgba(255,255,255,.25)', fontSize:12, marginTop:8 }}>
                    Remplis au moins le prix de vente et le prix fournisseur pour voir ta marge
                  </div>
                )
              }

              // ── Vraie cascade : coût pub réparti sur les ventes qui aboutissent ──
              const coutParConfirmee = tauxConfirm > 0 ? (adsCout * 100) / tauxConfirm : 0
              const coutParLivree    = tauxLiv > 0 ? (coutParConfirmee * 100) / tauxLiv : 0
              const coutRetourAmorti = tauxLiv > 0 ? coutRetour * ((100 - tauxLiv) / tauxLiv) : 0

              const coutTotal = coutAchat + coutParLivree + fraisLiv + coutStock + coutRetourAmorti
              const margeNette = prixVente - coutTotal
              const margePct = coutAchat > 0 ? (margeNette / coutAchat) * 100 : 0

              const isNegative = margeNette < 0
              const isLow = margeNette >= 0 && margePct < 30
              const color = isNegative ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e'
              const bgColor = isNegative ? 'rgba(239,68,68,.1)' : isLow ? 'rgba(245,158,11,.1)' : 'rgba(34,197,94,.1)'
              const borderColor = isNegative ? 'rgba(239,68,68,.3)' : isLow ? 'rgba(245,158,11,.3)' : 'rgba(34,197,94,.3)'

              const prixPour30 = Math.ceil((coutTotal * 1.3) / 10) * 10
              const prixPour50 = Math.ceil((coutTotal * 1.5) / 10) * 10
              const prixPour100 = Math.ceil((coutTotal * 2) / 10) * 10

              return (
                <div style={{ marginTop: 14 }}>
                  {/* Détail de la cascade — seulement si pub renseignée */}
                  {adsCout > 0 && (
                    <div style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'12px 14px', marginBottom:10, fontSize:11, color:'rgba(255,255,255,.5)', lineHeight:1.9 }}>
                      <div style={{ fontWeight:800, color:'rgba(255,255,255,.6)', marginBottom:4 }}>📉 Cascade du coût publicitaire réel :</div>
                      <div>Coût pub par clic : <strong style={{color:'white'}}>{adsCout.toLocaleString()} DA</strong></div>
                      <div>÷ {tauxConfirm}% confirment → <strong style={{color:'white'}}>{coutParConfirmee.toFixed(0)} DA</strong> par commande confirmée</div>
                      <div>÷ {tauxLiv}% livrées → <strong style={{color:'#fca5a5'}}>{coutParLivree.toFixed(0)} DA</strong> par vente réellement livrée</div>
                    </div>
                  )}

                  <div style={{ background:bgColor, border:`1px solid ${borderColor}`, borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontWeight:700 }}>
                        {isNegative ? '🚨 Tu vends à PERTE' : isLow ? '⚠️ Marge faible' : '✅ Bonne marge'}
                      </span>
                      <span style={{ fontSize:20, fontWeight:900, color }}>
                        {margeNette >= 0 ? '+' : ''}{margeNette.toLocaleString(undefined,{maximumFractionDigits:0})} DA
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>
                      Soit {margePct.toFixed(0)}% de marge — coût réel total : {coutTotal.toLocaleString(undefined,{maximumFractionDigits:0})} DA
                    </div>
                    <div style={{ display:'flex', gap:10, marginTop:8, fontSize:10, color:'rgba(255,255,255,.35)', flexWrap:'wrap' }}>
                      <span>Achat: {coutAchat.toLocaleString()}</span>
                      <span>Pub: {coutParLivree.toFixed(0)}</span>
                      <span>Livraison: {fraisLiv.toLocaleString()}</span>
                      <span>Stockage: {coutStock.toLocaleString()}</span>
                      <span>Retours: {coutRetourAmorti.toFixed(0)}</span>
                    </div>
                  </div>

                  {(isNegative || isLow) && (
                    <div style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', marginBottom:8 }}>
                        💡 Prix suggérés pour une meilleure marge (coût réel inclus) :
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {[
                          { label:'Marge 30%', prix:prixPour30 },
                          { label:'Marge 50%', prix:prixPour50 },
                          { label:'Marge 100%', prix:prixPour100 },
                        ].map(s => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => set('prix', String(s.prix))}
                            style={{
                              background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)',
                              borderRadius:8, padding:'6px 12px', color:'#86efac',
                              fontSize:11, fontWeight:700, cursor:'pointer',
                            }}
                          >{s.label} → {s.prix.toLocaleString()} DA</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
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

            {/* Stock initial — pour la barre de progression "urgence" */}
            <div className="form-field" style={{ marginTop: 10 }}>
              <label>Stock initial (optionnel)</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 50 — pour afficher une barre 'X vendus sur 50'"
                value={form.stock_initial}
                onChange={e => set('stock_initial', e.target.value)}
              />
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>
                Renseigne le stock de départ pour afficher une barre de progression qui crée de l'urgence chez le client (ex: "42 vendus sur 50")
              </div>
            </div>

            {/* Aperçu barre de progression */}
            {form.stock_initial && form.stock !== '' && Number(form.stock_initial) > 0 && (() => {
              const total = Number(form.stock_initial)
              const restant = Number(form.stock)
              const vendus = Math.max(0, total - restant)
              const pct = Math.min(100, Math.round((vendus / total) * 100))
              return (
                <div style={{ marginTop: 10, background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, marginBottom:6 }}>
                    <span style={{ color:'#fca5a5' }}>🔥 {vendus} vendus sur {total}</span>
                    <span style={{ color:'rgba(255,255,255,.4)' }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,.08)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#f97316,#ef4444)', borderRadius:3, transition:'width .3s' }} />
                  </div>
                </div>
              )
            })()}

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
              <input type="file" accept="image/*,.gif,.webp" multiple onChange={async e => {
                const files = Array.from(e.target.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) {
                    const type = f.type.includes('gif') ? 'gif' : 'image'
                    set('images', [...form.images, { url, label:'', type }])
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
              <input type="file" accept="image/*,.gif,.webp" multiple onChange={async e => {
                const files = Array.from(e.target.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) {
                    const type = f.type.includes('gif') ? 'gif' : 'image'
                    set('images_gallery', [...form.images_gallery, { url, label:'', type }])
                  }
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
