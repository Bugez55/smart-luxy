import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { openWA, fmt } from '../../utils/notify'
import ProductForm from './ProductForm'

const STATUTS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'new',       label: '🆕 Nouvelles' },
  { key: 'confirmed', label: '✅ Confirmées' },
  { key: 'delivered', label: '📦 Livrées' },
  { key: 'cancelled', label: '❌ Annulées' },
]

const STATUT_COLORS = {
  new:       { bg: 'rgba(147,197,253,.15)', color: '#93c5fd', label: '🆕 Nouvelle' },
  confirmed: { bg: 'rgba(134,239,172,.15)', color: '#86efac', label: '✅ Confirmée' },
  delivered: { bg: 'rgba(201,168,76,.15)',  color: '#C9A84C', label: '📦 Livrée' },
  cancelled: { bg: 'rgba(252,165,165,.15)', color: '#fca5a5', label: '❌ Annulée' },
}

// ── Impression facture ────────────────────────────────────
function printInvoice(order) {
  const items = (() => {
    try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) }
    catch { return [] }
  })()
  const modeLiv = order.mode_livraison || 'domicile'
  const fraisLiv = Number(order.frais_livraison || 0)
  const totalProd = items.reduce((s, i) => s + Number(i.prix) * i.qty, 0)
  const total = Number(order.total || totalProd + fraisLiv)
  const fmtDA = n => Number(n).toLocaleString('fr-DZ') + ' DA'
  const date = new Date(order.created_at).toLocaleDateString('fr-DZ', {
    day:'2-digit', month:'long', year:'numeric'
  })

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture — Smart Luxy #${order.id?.slice(0,8).toUpperCase()}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: white; }
    .page { max-width: 680px; margin: 0 auto; padding: 40px 32px; }

    /* Header */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #C9A84C; }
    .brand { font-size: 28px; font-weight: 900; color: #0e0e0e; letter-spacing: -.04em; }
    .brand em { color: #C9A84C; font-style: normal; }
    .brand-sub { font-size: 11px; color: #888; margin-top: 3px; letter-spacing: .06em; text-transform: uppercase; }
    .inv-meta { text-align: right; }
    .inv-meta .inv-num { font-size: 20px; font-weight: 900; color: #C9A84C; }
    .inv-meta .inv-date { font-size: 12px; color: #888; margin-top: 4px; }

    /* Badge statut */
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; margin-top: 6px; }
    .badge-new       { background: #dbeafe; color: #1d4ed8; }
    .badge-confirmed { background: #dcfce7; color: #15803d; }
    .badge-delivered { background: #fef9c3; color: #854d0e; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }

    /* Infos client */
    .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #999; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .info-box { background: #f8f8f8; border-radius: 10px; padding: 14px 16px; }
    .info-box .label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
    .info-box .row { font-size: 13px; color: #333; margin-bottom: 4px; }
    .info-box .row strong { color: #0e0e0e; font-weight: 700; }

    /* Tableau articles */
    .articles-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #999; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #0e0e0e; color: white; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 11px 14px; font-size: 13.5px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tbody td:last-child { text-align: right; font-weight: 700; color: #C9A84C; }
    tbody tr:hover { background: #fafafa; }
    .article-name { font-weight: 700; color: #0e0e0e; }
    .article-prix { font-size: 12px; color: #888; }

    /* Totaux */
    .totaux { margin-left: auto; width: 260px; }
    .tot-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #666; border-bottom: 1px solid #f0f0f0; }
    .tot-row:last-child { border-bottom: none; padding-top: 10px; font-size: 17px; font-weight: 900; color: #0e0e0e; }
    .tot-row:last-child span:last-child { color: #C9A84C; }
    .gratuit { color: #15803d !important; font-weight: 700; }

    /* Footer */
    .inv-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
    .inv-footer-left { font-size: 11px; color: #aaa; line-height: 1.7; }
    .inv-footer-right { text-align: right; font-size: 11px; color: #aaa; }
    .thank-you { font-size: 14px; font-weight: 800; color: #C9A84C; margin-bottom: 4px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 24px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="inv-header">
    <div>
      <div class="brand">Smart <em>Luxy</em></div>
      <div class="brand-sub">Boutique en ligne · Algérie 🇩🇿</div>
    </div>
    <div class="inv-meta">
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Bon de commande</div>
      <div class="inv-num">#${order.id?.slice(0,8).toUpperCase()}</div>
      <div class="inv-date">${date}</div>
      <span class="badge badge-${order.statut}">${STATUT_COLORS[order.statut]?.label || order.statut}</span>
    </div>
  </div>

  <!-- Infos -->
  <div class="info-grid">
    <div class="info-box">
      <div class="label">👤 Client</div>
      <div class="row"><strong>${order.nom_client}</strong></div>
      <div class="row">📞 ${order.telephone}</div>
      ${order.note ? `<div class="row" style="margin-top:6px;color:#888;font-size:12px">📝 ${order.note}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="label">🚚 Livraison</div>
      <div class="row"><strong>${modeLiv === 'bureau' ? '📦 Retrait bureau' : '🏠 À domicile'}</strong></div>
      <div class="row">📍 ${order.wilaya}${order.commune ? ` — ${order.commune}` : ''}</div>
      ${order.adresse ? `<div class="row" style="font-size:12px;color:#666">${order.adresse}</div>` : ''}
    </div>
  </div>

  <!-- Articles -->
  <div class="articles-title">🛍️ Articles commandés</div>
  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th style="text-align:center">Qté</th>
        <th style="text-align:right">Prix unit.</th>
        <th>Sous-total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
      <tr>
        <td>
          <div class="article-name">${item.nom}</div>
          ${item.categorie ? `<div class="article-prix">${item.categorie}</div>` : ''}
        </td>
        <td style="text-align:center;font-weight:700">${item.qty}</td>
        <td style="text-align:right;color:#666">${fmtDA(item.prix)}</td>
        <td>${fmtDA(Number(item.prix) * item.qty)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <!-- Totaux -->
  <div class="totaux">
    <div class="tot-row">
      <span>Sous-total produits</span>
      <span>${fmtDA(totalProd)}</span>
    </div>
    <div class="tot-row">
      <span>Frais de livraison</span>
      <span class="${fraisLiv === 0 ? 'gratuit' : ''}">${fraisLiv === 0 ? 'Gratuit ✓' : fmtDA(fraisLiv)}</span>
    </div>
    <div class="tot-row">
      <span>TOTAL À PAYER</span>
      <span>${fmtDA(total)}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="inv-footer">
    <div class="inv-footer-left">
      Smart Luxy · Boutique en ligne · Algérie<br>
      📱 +213 556 688 810 · nabilmohellebi2@gmail.com<br>
      Paiement à la livraison (COD)
    </div>
    <div class="inv-footer-right">
      <div class="thank-you">Merci pour votre commande !</div>
      <div>Document généré le ${new Date().toLocaleDateString('fr-DZ')}</div>
    </div>
  </div>

</div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

// ── AdminPanel ────────────────────────────────────────────
export default function AdminPanel({ onLogout, onToast }) {
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [editProd, setEditProd] = useState(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
  }, [])

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('display_order')
    setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders(); loadProducts() }, [])

  const filteredOrders = orders.filter(o => {
    if (filter !== 'all' && o.statut !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return o.id?.toLowerCase().includes(q) ||
        o.nom_client?.toLowerCase().includes(q) ||
        o.telephone?.includes(q) ||
        o.wilaya?.toLowerCase().includes(q)
    }
    return true
  })

  async function setStatus(id, statut) {
    await supabase.from('orders').update({ statut }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, statut } : o))
  }

  async function delOrder(id) {
    if (!confirm('Supprimer cette commande ?')) return
    await supabase.from('orders').delete().eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
    onToast('🗑️ Commande supprimée')
  }

  const stats = {
    total: orders.length,
    new: orders.filter(o => o.statut === 'new').length,
    confirmed: orders.filter(o => o.statut === 'confirmed').length,
    ca: orders.filter(o => o.statut !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0),
  }

  async function toggleActive(id, val) {
    await supabase.from('products').update({ is_active: val }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: val } : p))
  }

  async function deleteProd(id) {
    if (!confirm('Supprimer ce produit définitivement ?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    onToast('🗑️ Produit supprimé')
  }

  async function saveProd(data) {
    if (data.id) {
      const { error } = await supabase.from('products').update(data).eq('id', data.id)
      if (error) { onToast('❌ Erreur sauvegarde', 'error'); return }
    } else {
      const { error } = await supabase.from('products').insert({ ...data, is_active: true, display_order: products.length + 1 })
      if (error) { onToast('❌ Erreur ajout', 'error'); return }
    }
    onToast('✅ Produit enregistré !')
    setEditProd(null)
    loadProducts()
  }

  return (
    <div className="adm">
      {/* Top bar */}
      <div className="adm-top">
        <div className="adm-logo">
          <span style={{ width:30, height:30, background:'white', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#C9A84C' }}>S</span>
          Smart <em>Luxy</em> — Admin
        </div>
        <div className="adm-tabs">
          {[['orders','📋 Commandes'],['products','📦 Produits']].map(([k,l]) => (
            <button key={k} className={`adm-tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button className="adm-logout" onClick={onLogout}>Déconnexion</button>
      </div>

      <div className="adm-body">
        {/* Stats */}
        <div className="adm-stats">
          <div className="stat-card"><div className="label">Total commandes</div><div className="value">{stats.total}</div></div>
          <div className="stat-card"><div className="label">🆕 Nouvelles</div><div className="value" style={{color:'#93c5fd'}}>{stats.new}</div></div>
          <div className="stat-card"><div className="label">✅ Confirmées</div><div className="value" style={{color:'#86efac'}}>{stats.confirmed}</div></div>
          <div className="stat-card"><div className="label">💰 Chiffre d'affaires</div><div className="value gold">{fmt(stats.ca)}</div></div>
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div>
            <div className="adm-toolbar">
              <input
                className="adm-search"
                placeholder="Rechercher (nom, tél, ID…)"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {STATUTS.map(s => (
                <button key={s.key} className={`filter-btn ${filter===s.key?'active':''}`} onClick={() => setFilter(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty"><div style={{fontSize:40}}>📭</div><p>Aucune commande trouvée.</p></div>
            ) : filteredOrders.map(o => {
              const items = (() => { try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items||[]) } catch { return [] } })()
              const isOpen = expanded === o.id
              const sc = STATUT_COLORS[o.statut] || { bg:'#2a2a2a', color:'#aaa', label: o.statut }
              const modeLiv = o.mode_livraison || 'domicile'

              return (
                <div key={o.id} className="ocard">
                  <div className="ocard-hdr" onClick={() => setExpanded(isOpen ? null : o.id)}>
                    <div style={{flex:1}}>
                      <div className="ocard-id">#{o.id?.slice(0,8).toUpperCase()}</div>
                      <div className="ocard-client">{o.nom_client}</div>
                      <div className="ocard-loc">📍 {o.wilaya} — {o.commune}</div>
                      <div style={{fontSize:11, color:'#555', marginTop:2}}>
                        {modeLiv === 'bureau' ? '📦 Bureau' : '🏠 Domicile'} · 📞 {o.telephone}
                      </div>
                    </div>
                    <div className="ocard-meta">
                      <div className="ocard-total">{fmt(o.total)}</div>
                      <span style={{
                        display:'inline-block', padding:'3px 10px', borderRadius:20,
                        fontSize:11, fontWeight:800, letterSpacing:'.04em',
                        background: sc.bg, color: sc.color,
                      }}>{sc.label}</span>
                      <div className="ocard-date">{new Date(o.created_at).toLocaleDateString('fr-DZ')}</div>
                    </div>
                    <span style={{color:'#444', marginLeft:8}}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div className="ocard-body">
                      {/* Articles */}
                      <div className="ocard-items">
                        <strong style={{color:'white', fontSize:12, textTransform:'uppercase', letterSpacing:'.05em'}}>Articles</strong>
                        {items.map((item, i) => (
                          <div key={i} style={{display:'flex', justifyContent:'space-between', marginTop:6}}>
                            <span>{item.nom} <span style={{color:'#555'}}>×{item.qty}</span></span>
                            <span style={{color:'var(--br)'}}>{fmt(Number(item.prix)*item.qty)}</span>
                          </div>
                        ))}
                        <div style={{
                          borderTop:'1px solid var(--brd)', marginTop:8, paddingTop:8,
                          display:'flex', flexDirection:'column', gap:4,
                        }}>
                          <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#555'}}>
                            <span>Frais livraison</span>
                            <span style={{color: Number(o.frais_livraison)===0 ? '#4CAF50' : '#aaa'}}>
                              {Number(o.frais_livraison)===0 ? 'Gratuit' : fmt(o.frais_livraison)}
                            </span>
                          </div>
                          <div style={{display:'flex', justifyContent:'space-between', color:'white', fontWeight:800, fontSize:15}}>
                            <span>Total</span><span style={{color:'var(--br)'}}>{fmt(o.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Détails */}
                      {(o.adresse || o.note) && (
                        <div style={{fontSize:13, color:'#666', marginTop:8}}>
                          {o.adresse && <div>🏠 {o.adresse}</div>}
                          {o.note && <div>📝 {o.note}</div>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="ocard-actions">
                        {/* 🖨️ Imprimer facture */}
                        <button
                          className="act-btn"
                          style={{
                            background:'rgba(201,168,76,.15)',
                            border:'1px solid rgba(201,168,76,.3)',
                            color:'#C9A84C', fontWeight:800,
                          }}
                          onClick={() => printInvoice(o)}
                        >
                          🖨️ Imprimer facture
                        </button>

                        <button className="act-btn wa" onClick={() => openWA(o)}>💬 WhatsApp</button>

                        {o.statut !== 'confirmed' && (
                          <button className="act-btn" onClick={() => setStatus(o.id,'confirmed')}>✅ Confirmer</button>
                        )}
                        {o.statut !== 'delivered' && (
                          <button className="act-btn" onClick={() => setStatus(o.id,'delivered')}>📦 Livré</button>
                        )}
                        {o.statut !== 'cancelled' && (
                          <button className="act-btn" onClick={() => setStatus(o.id,'cancelled')}>❌ Annuler</button>
                        )}
                        <button className="act-btn danger" onClick={() => delOrder(o.id)}>🗑️ Supprimer</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <div>
            <div className="adm-toolbar" style={{marginBottom:16}}>
              <span style={{color:'var(--g4)', fontSize:13}}>{products.length} produits</span>
              <div style={{marginLeft:'auto'}}>
                <button
                  className="act-btn"
                  style={{background:'var(--br)', color:'var(--bk)', border:'none', padding:'8px 18px', fontWeight:800}}
                  onClick={() => setEditProd(false)}
                >
                  + Ajouter un produit
                </button>
              </div>
            </div>

            {loading ? <div className="spinner">Chargement…</div> : (
              <div className="adm-pgrid">
                {products.map(p => {
                  const imgs = (() => { try { return typeof p.images === 'string' ? JSON.parse(p.images) : (p.images||[]) } catch { return [] } })()
                  const mainImg = imgs[0]?.url || p.img
                  return (
                    <div key={p.id} className="adm-pcard" style={{opacity: p.is_active ? 1 : .5}}>
                      <div className="adm-pcard-img">
                        {mainImg ? <img src={mainImg} alt={p.nom} /> : <span style={{fontSize:40}}>{p.emoji || '📦'}</span>}
                      </div>
                      <div className="adm-pcard-body">
                        <div className="adm-pcard-name" title={p.nom}>{p.nom}</div>
                        <div className="adm-pcard-price">{fmt(p.prix)}</div>
                        <div className="adm-pcard-actions">
                          <button className="act-btn" onClick={() => setEditProd(p)}>✏️ Modifier</button>
                          <button className="act-btn" onClick={() => toggleActive(p.id, !p.is_active)}>
                            {p.is_active ? '👁 Masquer' : '👁 Afficher'}
                          </button>
                          <button className="act-btn danger" onClick={() => deleteProd(p.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {editProd !== null && (
        <ProductForm
          product={editProd || null}
          onClose={() => setEditProd(null)}
          onSave={saveProd}
        />
      )}
    </div>
  )
}
