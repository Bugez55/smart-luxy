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

export default function AdminPanel({ onLogout, onToast }) {
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [editProd, setEditProd] = useState(null) // null=closed, false=new, {...}=edit

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

  // ── Orders ─────────────────────────────────────────────
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

  // ── Products ───────────────────────────────────────────
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
    onToast('✅ Produit enregistré !', 'green')
    setEditProd(null)
    loadProducts()
  }

  return (
    <div className="adm">
      {/* Top bar */}
      <div className="adm-top">
        <div className="adm-logo">
          <span style={{ width: 30, height: 30, background: 'white', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#C9A84C' }}>S</span>
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
          <div className="stat-card"><div className="label">🆕 Nouvelles</div><div className="value" style={{ color: '#93c5fd' }}>{stats.new}</div></div>
          <div className="stat-card"><div className="label">✅ Confirmées</div><div className="value" style={{ color: '#86efac' }}>{stats.confirmed}</div></div>
          <div className="stat-card"><div className="label">💰 Chiffre d'affaires</div><div className="value gold">{fmt(stats.ca)}</div></div>
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div>
            <div className="adm-toolbar">
              <input className="adm-search" placeholder="Rechercher (nom, tél, ID…)" value={search} onChange={e => setSearch(e.target.value)} />
              {STATUTS.map(s => (
                <button key={s.key} className={`filter-btn ${filter===s.key?'active':''}`} onClick={() => setFilter(s.key)}>{s.label}</button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty"><div style={{ fontSize: 40 }}>📭</div><p>Aucune commande trouvée.</p></div>
            ) : filteredOrders.map(o => {
              const items = (() => { try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items||[]) } catch { return [] } })()
              const isOpen = expanded === o.id
              return (
                <div key={o.id} className="ocard">
                  <div className="ocard-hdr" onClick={() => setExpanded(isOpen ? null : o.id)}>
                    <div>
                      <div className="ocard-id">{o.id}</div>
                      <div className="ocard-client">{o.nom_client}</div>
                      <div className="ocard-loc">📍 {o.wilaya} — {o.commune}</div>
                    </div>
                    <div className="ocard-meta">
                      <div className="ocard-total">{fmt(o.total)}</div>
                      <span className={`badge-statut ${o.statut}`}>{o.statut}</span>
                      <div className="ocard-date">{new Date(o.created_at).toLocaleDateString('fr-DZ')}</div>
                    </div>
                    <span style={{ color: 'var(--g4)', marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div className="ocard-body">
                      <div className="ocard-items">
                        <strong style={{ color: 'white', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Articles</strong>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.nom} ×{item.qty}</span>
                            <span style={{ color: 'var(--br)' }}>{fmt(Number(item.prix) * item.qty)}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--brd)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 700 }}>
                          <span>Total</span><span style={{ color: 'var(--br)' }}>{fmt(o.total)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--g4)', marginTop: 4 }}>
                        📞 {o.telephone}
                        {o.adresse && <> · 🏠 {o.adresse}</>}
                        {o.note && <> · 📝 {o.note}</>}
                      </div>
                      <div className="ocard-actions">
                        <button className="act-btn wa" onClick={() => openWA(o)}>💬 WhatsApp</button>
                        {o.statut !== 'confirmed'  && <button className="act-btn" onClick={() => setStatus(o.id,'confirmed')}>✅ Confirmer</button>}
                        {o.statut !== 'delivered'  && <button className="act-btn" onClick={() => setStatus(o.id,'delivered')}>📦 Livré</button>}
                        {o.statut !== 'cancelled'  && <button className="act-btn" onClick={() => setStatus(o.id,'cancelled')}>❌ Annuler</button>}
                        {o.statut === 'new'        && <button className="act-btn" onClick={() => setStatus(o.id,'new')}>🆕 Remettre nouveau</button>}
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
            <div className="adm-toolbar" style={{ marginBottom: 16 }}>
              <span style={{ color: 'var(--g4)', fontSize: 13 }}>{products.length} produits</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="act-btn" style={{ background: 'var(--br)', color: 'var(--bk)', border: 'none', padding: '8px 16px', fontWeight: 800 }} onClick={() => setEditProd(false)}>
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
                    <div key={p.id} className="adm-pcard" style={{ opacity: p.is_active ? 1 : .5 }}>
                      <div className="adm-pcard-img">
                        {mainImg ? <img src={mainImg} alt={p.nom} /> : <span style={{ fontSize: 40 }}>{p.emoji || '📦'}</span>}
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

      {/* Product form modal */}
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
