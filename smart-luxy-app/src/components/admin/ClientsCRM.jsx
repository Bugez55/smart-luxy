// ══════════════════════════════════════════════════════════
//  CLIENTS CRM — Fiches clients construites depuis les commandes
//  Aucune nouvelle table nécessaire pour les stats (calculées en live)
//  Une seule table "client_notes" pour les notes/tags persistants
// ══════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

function daysAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(diff)
}

const TAGS = [
  { key: 'vip',      label: '⭐ VIP',          color: '#C9A84C' },
  { key: 'fiable',   label: '✅ Fiable',       color: '#22c55e' },
  { key: 'a_risque', label: '⚠️ À risque',     color: '#f59e0b' },
  { key: 'refuse',   label: '🚫 Refuse souvent', color: '#ef4444' },
]

export default function ClientsCRM({ orders, onToast }) {
  const [notes, setNotes] = useState({})
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [filterTag, setFilterTag] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('client_notes').select('*').then(({ data }) => {
      const map = {}
      ;(data || []).forEach(n => { map[n.telephone] = n })
      setNotes(map)
    })
  }, [])

  // ── Construire les fiches clients depuis les commandes ──
  const clients = useMemo(() => {
    const map = {}
    for (const o of orders) {
      const tel = o.telephone
      if (!tel) continue
      if (!map[tel]) {
        map[tel] = {
          telephone: tel,
          nom: o.nom_client,
          wilaya: o.wilaya,
          commandes: [],
          totalDepense: 0,
          nbCommandes: 0,
          nbLivrees: 0,
          nbAnnulees: 0,
          derniereCommande: o.created_at,
        }
      }
      const c = map[tel]
      c.commandes.push(o)
      c.nbCommandes++
      if (o.statut === 'delivered' || o.statut === 'confirmed') {
        c.totalDepense += Number(o.total) || 0
        c.nbLivrees++
      }
      if (o.statut === 'cancelled') c.nbAnnulees++
      if (new Date(o.created_at) > new Date(c.derniereCommande)) {
        c.derniereCommande = o.created_at
        c.nom = o.nom_client
        c.wilaya = o.wilaya
      }
    }
    return Object.values(map)
  }, [orders])

  // ── Filtrer + trier ──
  const filtered = useMemo(() => {
    let list = clients.filter(c =>
      !search ||
      c.nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.telephone?.includes(search)
    )
    if (filterTag !== 'all') {
      list = list.filter(c => notes[c.telephone]?.tag === filterTag)
    }
    if (sortBy === 'recent') list.sort((a,b) => new Date(b.derniereCommande) - new Date(a.derniereCommande))
    if (sortBy === 'depense') list.sort((a,b) => b.totalDepense - a.totalDepense)
    if (sortBy === 'nb') list.sort((a,b) => b.nbCommandes - a.nbCommandes)
    if (sortBy === 'inactif') list.sort((a,b) => new Date(a.derniereCommande) - new Date(b.derniereCommande))
    return list
  }, [clients, search, filterTag, sortBy, notes])

  async function saveNote(tel) {
    setSaving(true)
    const existing = notes[tel] || {}
    const payload = { telephone: tel, note: noteDraft, tag: existing.tag || null, updated_at: new Date().toISOString() }
    await supabase.from('client_notes').upsert(payload)
    setNotes(n => ({ ...n, [tel]: payload }))
    setSaving(false)
    onToast && onToast('✅ Note enregistrée', 'default')
  }

  async function setTag(tel, tagKey) {
    const existing = notes[tel] || {}
    const newTag = existing.tag === tagKey ? null : tagKey
    const payload = { telephone: tel, note: existing.note || '', tag: newTag, updated_at: new Date().toISOString() }
    await supabase.from('client_notes').upsert(payload)
    setNotes(n => ({ ...n, [tel]: payload }))
  }

  const vipCount = clients.filter(c => c.nbCommandes >= 3 || c.totalDepense >= 10000).length
  const inactifs = clients.filter(c => daysAgo(c.derniereCommande) > 30).length

  const sec = { background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:16, marginBottom:12 }
  const inp = { background:'#111', border:'1px solid #333', borderRadius:8, padding:'9px 12px', color:'white', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit' }

  return (
    <div>
      <h3 style={{ color:'white', fontSize:16, fontWeight:800, marginBottom:6 }}>👥 Clients (CRM)</h3>
      <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:16, lineHeight:1.5 }}>
        Fiches clients construites automatiquement à partir de tes commandes — historique, dépenses, notes.
      </p>

      {/* ── Stats rapides ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
        <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'12px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#C9A84C' }}>{clients.length}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Clients uniques</div>
        </div>
        <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'12px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#22c55e' }}>{vipCount}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>⭐ Clients fidèles</div>
        </div>
        <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'12px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#f59e0b' }}>{inactifs}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Inactifs +30j</div>
        </div>
      </div>

      {/* ── Recherche + tri + filtre ── */}
      <div style={sec}>
        <input placeholder="Rechercher (nom, téléphone…)" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, marginBottom:10 }} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
          {[
            { key:'recent', label:'📅 Plus récent' },
            { key:'depense', label:'💰 Plus dépensé' },
            { key:'nb', label:'🔢 Plus de commandes' },
            { key:'inactif', label:'😴 Plus inactif' },
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)} style={{
              background: sortBy===s.key ? 'rgba(201,168,76,.15)' : '#111',
              border: `1px solid ${sortBy===s.key ? 'rgba(201,168,76,.4)' : '#333'}`,
              borderRadius: 20, padding:'5px 12px', color: sortBy===s.key ? '#C9A84C' : 'rgba(255,255,255,.5)',
              fontSize:11, fontWeight:700, cursor:'pointer',
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={() => setFilterTag('all')} style={{
            background: filterTag==='all' ? 'rgba(255,255,255,.1)' : '#111', border:'1px solid #333',
            borderRadius:20, padding:'4px 10px', color: filterTag==='all' ? 'white' : 'rgba(255,255,255,.4)',
            fontSize:10, fontWeight:700, cursor:'pointer',
          }}>Tous</button>
          {TAGS.map(t => (
            <button key={t.key} onClick={() => setFilterTag(t.key)} style={{
              background: filterTag===t.key ? `${t.color}22` : '#111',
              border: `1px solid ${filterTag===t.key ? t.color+'80' : '#333'}`,
              borderRadius:20, padding:'4px 10px', color: filterTag===t.key ? t.color : 'rgba(255,255,255,.4)',
              fontSize:10, fontWeight:700, cursor:'pointer',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── Liste clients ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'rgba(255,255,255,.25)', fontSize:13 }}>Aucun client trouvé</div>
      ) : filtered.map(c => {
        const isOpen = expanded === c.telephone
        const clientTag = notes[c.telephone]?.tag
        const tagInfo = TAGS.find(t => t.key === clientTag)
        const isVip = c.nbCommandes >= 3 || c.totalDepense >= 10000
        const inactive = daysAgo(c.derniereCommande) > 30

        return (
          <div key={c.telephone} style={{ background:'#1a1a1a', border:`1px solid ${isOpen ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.07)'}`, borderRadius:12, marginBottom:8, overflow:'hidden' }}>
            <div
              onClick={() => { setExpanded(isOpen ? null : c.telephone); setNoteDraft(notes[c.telephone]?.note || '') }}
              style={{ padding:'12px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:'white' }}>{c.nom}</span>
                  {isVip && <span style={{ fontSize:10 }}>⭐</span>}
                  {tagInfo && <span style={{ fontSize:9, fontWeight:800, color:tagInfo.color, background:`${tagInfo.color}18`, padding:'1px 7px', borderRadius:10 }}>{tagInfo.label}</span>}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>
                  📞 {c.telephone} · 📍 {c.wilaya} · {c.nbCommandes} commande{c.nbCommandes>1?'s':''}
                  {inactive && <span style={{ color:'#f59e0b' }}> · inactif {daysAgo(c.derniereCommande)}j</span>}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:900, color:'#C9A84C' }}>{fmt(c.totalDepense)}</div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>{isOpen ? '▲' : '▼'}</div>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                {/* Actions rapides */}
                <div style={{ display:'flex', gap:6, marginTop:12, marginBottom:12, flexWrap:'wrap' }}>
                  <a href={`https://wa.me/${c.telephone.replace(/^0/,'213')}`} target="_blank" rel="noreferrer" style={{
                    background:'rgba(37,211,102,.12)', border:'1px solid rgba(37,211,102,.3)', borderRadius:8,
                    padding:'6px 12px', color:'#86efac', fontSize:11, fontWeight:800, textDecoration:'none',
                  }}>💬 WhatsApp</a>
                  <a href={`tel:${c.telephone}`} style={{
                    background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:8,
                    padding:'6px 12px', color:'#93c5fd', fontSize:11, fontWeight:800, textDecoration:'none',
                  }}>📞 Appeler</a>
                </div>

                {/* Tags */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,.4)', marginBottom:6 }}>ÉTIQUETTE</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {TAGS.map(t => (
                      <button key={t.key} onClick={() => setTag(c.telephone, t.key)} style={{
                        background: clientTag===t.key ? `${t.color}22` : '#111',
                        border: `1px solid ${clientTag===t.key ? t.color : '#333'}`,
                        borderRadius:20, padding:'5px 12px', color: clientTag===t.key ? t.color : 'rgba(255,255,255,.4)',
                        fontSize:11, fontWeight:700, cursor:'pointer',
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>

                {/* Historique commandes */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,.4)', marginBottom:6 }}>
                    HISTORIQUE ({c.commandes.length})
                  </div>
                  <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                    {c.commandes.sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).map(o => (
                      <div key={o.id} style={{ display:'flex', justifyContent:'space-between', background:'#111', borderRadius:6, padding:'6px 10px', fontSize:11 }}>
                        <span style={{ color:'rgba(255,255,255,.5)' }}>{new Date(o.created_at).toLocaleDateString('fr-DZ')} · {o.statut}</span>
                        <span style={{ color:'#C9A84C', fontWeight:700 }}>{fmt(o.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note perso */}
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,.4)', marginBottom:6 }}>NOTE PERSONNELLE</div>
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    placeholder="Ex: préfère être appelé le matin, adresse difficile à trouver..."
                    rows={2}
                    style={{ ...inp, resize:'vertical', marginBottom:8 }}
                  />
                  <button onClick={() => saveNote(c.telephone)} disabled={saving} style={{
                    background:'rgba(201,168,76,.12)', border:'1px solid rgba(201,168,76,.3)', borderRadius:8,
                    padding:'6px 14px', color:'#C9A84C', fontSize:11, fontWeight:800, cursor:'pointer',
                  }}>{saving ? '⏳' : '💾 Enregistrer la note'}</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
