import { useState, useRef, useEffect } from 'react'
import { WILAYAS, getCommunesByWilaya } from '../data/wilayas'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

// ── Prix livraison par wilaya (Yalidine depuis Tizi Ouzou) ──
const LIVRAISON = {
  'Adrar':              { bureau: 1000, domicile: 1600 },
  'Chlef':              { bureau: 400,  domicile: 800  },
  'Laghouat':           { bureau: 600,  domicile: 1100 },
  'Oum El Bouaghi':     { bureau: 400,  domicile: 950  },
  'Batna':              { bureau: 400,  domicile: 950  },
  'Béjaïa':             { bureau: 400,  domicile: 850  },
  'Biskra':             { bureau: 600,  domicile: 1100 },
  'Béchar':             { bureau: 750,  domicile: 1400 },
  'Blida':              { bureau: 400,  domicile: 800  },
  'Bouira':             { bureau: 400,  domicile: 850  },
  'Tamanrasset':        { bureau: 1000, domicile: 1800 },
  'Tébessa':            { bureau: 600,  domicile: 1100 },
  'Tlemcen':            { bureau: 400,  domicile: 850  },
  'Tiaret':             { bureau: 400,  domicile: 850  },
  'Tizi Ouzou':         { bureau: 0,    domicile: 300  },
  'Alger':              { bureau: 300,  domicile: 750  },
  'Djelfa':             { bureau: 600,  domicile: 1100 },
  'Jijel':              { bureau: 400,  domicile: 950  },
  'Sétif':              { bureau: 400,  domicile: 900  },
  'Saïda':              { bureau: 400,  domicile: 850  },
  'Skikda':             { bureau: 400,  domicile: 950  },
  'Sidi Bel Abbès':     { bureau: 400,  domicile: 850  },
  'Annaba':             { bureau: 400,  domicile: 900  },
  'Guelma':             { bureau: 400,  domicile: 950  },
  'Constantine':        { bureau: 400,  domicile: 900  },
  'Médéa':              { bureau: 400,  domicile: 850  },
  'Mostaganem':         { bureau: 400,  domicile: 800  },
  "M'Sila":             { bureau: 400,  domicile: 900  },
  'Mascara':            { bureau: 400,  domicile: 850  },
  'Ouargla':            { bureau: 750,  domicile: 1200 },
  'Oran':               { bureau: 400,  domicile: 850  },
  'El Bayadh':          { bureau: 400,  domicile: 900  },
  'Illizi':             { bureau: 1500, domicile: 1900 },
  'Bordj Bou Arréridj': { bureau: 400,  domicile: 900  },
  'Boumerdès':          { bureau: 400,  domicile: 850  },
  'El Tarf':            { bureau: 400,  domicile: 1000 },
  'Tindouf':            { bureau: 1500, domicile: 1900 },
  'Tissemsilt':         { bureau: 400,  domicile: 850  },
  'El Oued':            { bureau: 750,  domicile: 1200 },
  'Khenchela':          { bureau: 600,  domicile: 1000 },
  'Souk Ahras':         { bureau: 600,  domicile: 1000 },
  'Tipaza':             { bureau: 400,  domicile: 850  },
  'Mila':               { bureau: 400,  domicile: 950  },
  'Aïn Defla':          { bureau: 400,  domicile: 850  },
  'Naâma':              { bureau: 600,  domicile: 1200 },
  'Aïn Témouchent':     { bureau: 400,  domicile: 850  },
  'Ghardaïa':           { bureau: 750,  domicile: 1200 },
  'Relizane':           { bureau: 400,  domicile: 800  },
  // Wilayas déléguées
  'Timimoun':           { bureau: 1000, domicile: 1600 },
  'Bordj Badji Mokhtar':{ bureau: 1500, domicile: 1900 },
  'Ouled Djellal':      { bureau: 600,  domicile: 1100 },
  'Béni Abbès':         { bureau: 750,  domicile: 1400 },
  'In Salah':           { bureau: 1000, domicile: 1800 },
  'In Guezzam':         { bureau: 1500, domicile: 1900 },
  'Touggourt':          { bureau: 750,  domicile: 1200 },
  'Djanet':             { bureau: 1500, domicile: 1900 },
  "El M'Ghair":         { bureau: 750,  domicile: 1200 },
  'El Meniaa':          { bureau: 750,  domicile: 1200 },
  'Aflou':              { bureau: 600,  domicile: 1100 },
  'Aïn Oussera':        { bureau: 600,  domicile: 1100 },
  'Barika':             { bureau: 400,  domicile: 950  },
  'Bir El Ater':        { bureau: 600,  domicile: 1100 },
  'Bou Saâda':          { bureau: 400,  domicile: 900  },
  'El Abiodh Sidi Cheikh': { bureau: 400, domicile: 900 },
  'El Aricha':          { bureau: 400,  domicile: 850  },
  'El Kantara':         { bureau: 600,  domicile: 1100 },
  'Ksar Chellala':      { bureau: 400,  domicile: 850  },
  'Ksar El Boukhari':   { bureau: 400,  domicile: 850  },
  'Messaad':            { bureau: 600,  domicile: 1100 },
}

// ── Traductions ──────────────────────────────────────────
const T = {
  fr: {
    title: 'Passer commande',
    nom: 'Nom complet',
    tel: 'Téléphone',
    wilaya: 'Wilaya',
    commune: 'Commune',
    adresse: 'Adresse',
    note: 'Note',
    nomPh: 'Votre nom',
    telPh: '0555 00 00 00',
    wilayaPh: 'Choisir une wilaya',
    communePh: 'Choisir une commune',
    communeFirst: "Choisir d'abord une wilaya",
    adressePh: 'Rue, quartier…',
    notePh: 'Instructions, préférences…',
    livraison: 'Mode de livraison',
    domicile: '🏠 À domicile',
    bureau: '📦 Retrait au bureau (Tizi Ouzou)',
    fraisLiv: 'Frais de livraison',
    totalCmd: 'Total commande',
    totalPayer: 'Total à payer',
    indisponible: 'Non disponible',
    gratuit: 'Gratuit',
    confirmer: '✅ Confirmer la commande',
    envoi: 'Envoi en cours…',
    whatsapp: 'Commander via WhatsApp',
    required: '*',
    delaiDom: '2–5 jours ouvrables',
    delaiBur: '1–3 jours, retrait à Tizi Ouzou',
    search: '🔍 Rechercher…',
    aucun: 'Aucun résultat',
    communes: 'communes',
  },
  ar: {
    title: 'تأكيد الطلب',
    nom: 'الاسم الكامل',
    tel: 'رقم الهاتف',
    wilaya: 'الولاية',
    commune: 'البلدية',
    adresse: 'العنوان',
    note: 'ملاحظة',
    nomPh: 'اسمك الكامل',
    telPh: '0555 00 00 00',
    wilayaPh: 'اختر الولاية',
    communePh: 'اختر البلدية',
    communeFirst: 'اختر الولاية أولاً',
    adressePh: 'الشارع، الحي…',
    notePh: 'تعليمات، تفضيلات…',
    livraison: 'طريقة التوصيل',
    domicile: '🏠 توصيل للمنزل',
    bureau: '📦 استلام من المكتب (تيزي وزو)',
    fraisLiv: 'تكاليف التوصيل',
    totalCmd: 'مجموع الطلب',
    totalPayer: 'المجموع الكلي',
    indisponible: 'غير متوفر',
    gratuit: 'مجاناً',
    confirmer: '✅ تأكيد الطلب',
    envoi: 'جارٍ الإرسال…',
    whatsapp: 'الطلب عبر واتساب',
    required: '*',
    delaiDom: '2–5 أيام عمل',
    delaiBur: '1–3 أيام، استلام بتيزي وزو',
    search: '🔍 بحث…',
    aucun: 'لا توجد نتائج',
    communes: 'بلدية',
  }
}

// ── Dropdown avec recherche ──────────────────────────────
function SearchSelect({ options, value, onChange, placeholder, disabled, rtl }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function select(val) { onChange(val); setSearch(''); setOpen(false) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          background: '#1e1e1e', border: `1px solid ${open ? '#C9A84C' : '#333'}`,
          borderRadius: 8, padding: '10px 12px',
          color: value ? 'white' : '#555', fontSize: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          direction: rtl ? 'rtl' : 'ltr',
          transition: 'border-color .2s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <span style={{ color: '#555', fontSize: 10, marginRight: rtl ? 0 : 0, marginLeft: rtl ? 0 : 8, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: '#1a1a1a', border: '1px solid #C9A84C',
          borderRadius: 10, marginTop: 4, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,.8)',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a' }}>
            <input
              autoFocus
              placeholder={rtl ? '🔍 بحث…' : '🔍 Rechercher…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: '#252525', border: '1px solid #333',
                borderRadius: 6, padding: '6px 10px', color: 'white',
                fontSize: 16, outline: 'none', direction: rtl ? 'rtl' : 'ltr',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, color: '#555', fontSize: 13, textAlign: 'center' }}>
                {rtl ? 'لا توجد نتائج' : 'Aucun résultat'}
              </div>
            ) : filtered.map(opt => (
              <div
                key={opt}
                onClick={() => select(opt)}
                style={{
                  padding: '9px 14px', fontSize: 13.5, cursor: 'pointer',
                  color: opt === value ? '#C9A84C' : 'rgba(255,255,255,.8)',
                  background: opt === value ? 'rgba(201,168,76,.08)' : 'transparent',
                  fontWeight: opt === value ? 700 : 400,
                  borderBottom: '1px solid rgba(255,255,255,.03)',
                  direction: rtl ? 'rtl' : 'ltr',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = opt === value ? 'rgba(201,168,76,.08)' : 'transparent' }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Bouton de confirmation premium ───────────────────────
function ConfirmButton({ loading, disabled, onClick, label, labelLoading }) {
  const [ripples, setRipples] = useState([])
  const active = !disabled && !loading

  function handleClick(e) {
    if (!active) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(i => i.id !== id)), 700)
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '15px',
        background: active
          ? 'linear-gradient(135deg, #C9A84C 0%, #a8832e 100%)'
          : '#1e1e1e',
        border: active ? 'none' : '1px solid #2a2a2a',
        borderRadius: 14,
        color: active ? '#0a0a0a' : '#444',
        fontSize: 15, fontWeight: 900,
        cursor: active ? 'pointer' : loading ? 'wait' : 'not-allowed',
        marginBottom: 8,
        transition: 'all .3s cubic-bezier(.22,1,.36,1)',
        boxShadow: active ? '0 6px 24px rgba(201,168,76,.35)' : 'none',
        transform: active ? 'translateY(0)' : 'none',
        position: 'relative', overflow: 'hidden',
        letterSpacing: '.01em',
      }}
      onMouseEnter={e => { if (active) e.currentTarget.style.transform = 'translateY(-2px)'; if (active) e.currentTarget.style.boxShadow = '0 10px 32px rgba(201,168,76,.45)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; if (active) e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,168,76,.35)' }}
      onMouseDown={e => { if (active) e.currentTarget.style.transform = 'scale(.98)' }}
      onMouseUp={e => { if (active) e.currentTarget.style.transform = 'translateY(-2px)' }}
    >
      {/* Shimmer permanent quand actif */}
      {active && !loading && (
        <span style={{
          position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent)',
          animation: 'btnShimmer 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Ripples au clic */}
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute',
          left: r.x - 60, top: r.y - 60,
          width: 120, height: 120,
          background: 'rgba(255,255,255,.3)',
          borderRadius: '50%',
          animation: 'rippleOut .7s ease-out forwards',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Contenu */}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? (
          <>
            <span style={{
              width: 18, height: 18, border: '2px solid rgba(0,0,0,.3)',
              borderTopColor: '#0a0a0a', borderRadius: '50%',
              animation: 'spinBtn .7s linear infinite', display: 'inline-block',
            }} />
            {labelLoading}
          </>
        ) : (
          label
        )}
      </span>

      <style>{`
        @keyframes btnShimmer {
          0%   { left: -100%; }
          60%  { left: 150%; }
          100% { left: 150%; }
        }
        @keyframes rippleOut {
          from { transform: scale(0); opacity: 1; }
          to   { transform: scale(3); opacity: 0; }
        }
        @keyframes spinBtn {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}

// ── Modal principale ─────────────────────────────────────
export default function OrderModal({ items, onClose, onSubmit }) {
  const [lang, setLang] = useState('fr')
  const [modeLiv, setModeLiv] = useState('domicile') // 'domicile' | 'bureau'
  const [form, setForm] = useState({ nom: '', tel: '', wilaya: '', commune: '', adresse: '', note: '' })
  const [loading, setLoading] = useState(false)

  const t = T[lang]
  const rtl = lang === 'ar'

  const totalProduits = items.reduce((s, i) => s + Number(i.prix) * i.qty, 0)

  // Wilaya sélectionnée (nom pur sans code)
  const wilayaNom = form.wilaya ? form.wilaya.replace(/^\d+ — /, '') : ''
  const prixLiv = wilayaNom && LIVRAISON[wilayaNom] ? LIVRAISON[wilayaNom][modeLiv] : null
  const fraisLiv = prixLiv !== null && prixLiv !== undefined ? prixLiv : null
  const totalFinal = totalProduits + (fraisLiv || 0)

  const communes = wilayaNom ? getCommunesByWilaya(wilayaNom) : []
  const wilayasOptions = WILAYAS.map(w => `${w.code} — ${w.nom}`)

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v, ...(k === 'wilaya' ? { commune: '' } : {}) }))
  }

  function switchLang() { setLang(l => l === 'fr' ? 'ar' : 'fr') }

  async function handleSubmit() {
    if (!form.nom || !form.tel || !form.wilaya || !form.commune) return
    setLoading(true)
    await onSubmit({
      ...form,
      items,
      mode_livraison: modeLiv,
      frais_livraison: fraisLiv || 0,
      total: totalFinal,
    })
    setLoading(false)
  }

  function waOrder() {
    const livTxt = modeLiv === 'bureau'
      ? (rtl ? 'استلام من المكتب (تيزي وزو)' : 'Retrait bureau (Tizi Ouzou)')
      : (rtl ? 'توصيل للمنزل' : 'Livraison à domicile')
    const msg = items.map(i => `• ${i.nom} ×${i.qty} = ${fmt(Number(i.prix) * i.qty)}`).join('\n')
    const txt = `🛍️ Commande Smart Luxy\n\nClient: ${form.nom || '…'}\nTél: ${form.tel || '…'}\nWilaya: ${form.wilaya || '…'} / ${form.commune || '…'}\n\nArticles:\n${msg}\n\nSous-total: ${fmt(totalProduits)}\nLivraison (${livTxt}): ${fraisLiv !== null ? fmt(fraisLiv) : '?'}\n\n💰 TOTAL: ${fmt(totalFinal)}`
    window.open(`https://wa.me/${import.meta.env.VITE_WA_NUMBER || '213556688810'}?text=${encodeURIComponent(txt)}`, '_blank')
  }

  const inputStyle = {
    background: '#1e1e1e', border: '1px solid #333', borderRadius: 8,
    padding: '10px 12px', color: 'white', fontSize: 16, width: '100%',
    outline: 'none', boxSizing: 'border-box',
    direction: rtl ? 'rtl' : 'ltr', fontFamily: 'inherit',
  }
  const labelStyle = {
    fontSize: 11, fontWeight: 800, color: '#888',
    textTransform: rtl ? 'none' : 'uppercase',
    letterSpacing: rtl ? 0 : '.05em',
    display: 'block', marginBottom: 5,
    textAlign: rtl ? 'right' : 'left',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#141414', width: '100%', maxWidth: 600,
        maxHeight: '95vh', borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'omSlide .3s cubic-bezier(.22,1,.36,1)',
        direction: rtl ? 'rtl' : 'ltr',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
          padding: '14px 16px', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'white' }}>
            📋 {t.title}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={switchLang} style={{
              background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)',
              borderRadius: 20, padding: '4px 12px', color: '#C9A84C',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}>
              {lang === 'fr' ? '🇩🇿 عربي' : '🇫🇷 Français'}
            </button>
            <button onClick={onClose} style={{
              background: '#252525', border: 'none', borderRadius: '50%',
              width: 30, height: 30, color: '#aaa', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>✕</button>
          </div>
        </div>

        {/* ── Corps ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* Récap articles */}
          <div style={{
            background: '#1c1c1c', border: '1px solid #2a2a2a',
            borderRadius: 12, padding: 12, marginBottom: 16,
          }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 13.5, marginBottom: i < items.length - 1 ? 6 : 0,
              }}>
                <span style={{ color: '#aaa' }}>{item.nom} ×{item.qty}</span>
                <span style={{ color: '#C9A84C', fontWeight: 700 }}>{fmt(Number(item.prix) * item.qty)}</span>
              </div>
            ))}
          </div>

          {/* ── Mode livraison ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>{t.livraison}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['domicile', 'bureau'].map(mode => (
                <button key={mode} onClick={() => setModeLiv(mode)} style={{
                  padding: '12px 8px',
                  background: modeLiv === mode ? 'rgba(201,168,76,.12)' : '#1e1e1e',
                  border: `2px solid ${modeLiv === mode ? '#C9A84C' : '#2a2a2a'}`,
                  borderRadius: 10, color: modeLiv === mode ? '#C9A84C' : '#777',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  transition: 'all .2s', textAlign: 'center', lineHeight: 1.4,
                }}>
                  {mode === 'domicile' ? t.domicile : t.bureau}
                  <div style={{
                    fontSize: 10, fontWeight: 500, marginTop: 4,
                    color: modeLiv === mode ? 'rgba(201,168,76,.7)' : '#444',
                  }}>
                    {mode === 'domicile' ? t.delaiDom : t.delaiBur}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Wilaya + Commune ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>{t.wilaya} <span style={{ color: '#C9A84C' }}>*</span></label>
              <SearchSelect
                options={wilayasOptions}
                value={form.wilaya}
                onChange={v => set('wilaya', v)}
                placeholder={t.wilayaPh}
                rtl={rtl}
              />
            </div>
            <div>
              <label style={labelStyle}>
                {t.commune} <span style={{ color: '#C9A84C' }}>*</span>
                {communes.length > 0 && (
                  <span style={{ color: '#C9A84C', fontWeight: 400, marginRight: rtl ? 0 : 0, marginLeft: rtl ? 0 : 4 }}>
                    ({communes.length})
                  </span>
                )}
              </label>
              <SearchSelect
                options={communes}
                value={form.commune}
                onChange={v => set('commune', v)}
                placeholder={form.wilaya ? t.communePh : t.communeFirst}
                disabled={!form.wilaya}
                rtl={rtl}
              />
            </div>
          </div>

          {/* ── Prix livraison affiché ── */}
          {form.wilaya && (
            <div style={{
              background: 'rgba(201,168,76,.07)',
              border: '1px solid rgba(201,168,76,.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>
                {t.fraisLiv} {modeLiv === 'domicile' ? '🏠' : '📦'}
              </span>
              <span style={{ fontWeight: 800, color: fraisLiv === 0 ? '#4CAF50' : '#C9A84C', fontSize: 15 }}>
                {fraisLiv === 0 ? t.gratuit : fmt(fraisLiv)}
              </span>
            </div>
          )}

          {/* ── Nom + Tel ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>{t.nom} <span style={{ color: '#C9A84C' }}>*</span></label>
              <input
                placeholder={t.nomPh}
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.tel} <span style={{ color: '#C9A84C' }}>*</span></label>
              <input
                placeholder={t.telPh}
                value={form.tel}
                onChange={e => set('tel', e.target.value)}
                style={inputStyle}
                type="tel"
              />
            </div>
          </div>

          {/* ── Adresse (domicile uniquement) ── */}
          {modeLiv === 'domicile' && (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{t.adresse}</label>
              <input
                placeholder={t.adressePh}
                value={form.adresse}
                onChange={e => set('adresse', e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>{t.note}</label>
            <textarea
              placeholder={t.notePh}
              rows={2}
              value={form.note}
              onChange={e => set('note', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }}
            />
          </div>
        </div>

        {/* ── Footer total + boutons ── */}
        <div style={{
          background: '#1a1a1a', borderTop: '1px solid #2a2a2a',
          padding: '12px 16px', flexShrink: 0,
        }}>
          {/* Récap prix */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
              <span>{t.totalCmd}</span>
              <span>{fmt(totalProduits)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
              <span>{t.fraisLiv}</span>
              <span style={{ color: fraisLiv === 0 ? '#4CAF50' : '#aaa' }}>
                {fraisLiv === null ? '—' : fraisLiv === 0 ? (rtl ? 'مجاناً' : 'Gratuit') : fmt(fraisLiv)}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 6, borderTop: '1px solid #2a2a2a',
              fontSize: 17, fontWeight: 900, color: 'white',
            }}>
              <span>{t.totalPayer}</span>
              <span style={{ color: '#C9A84C' }}>{fmt(totalFinal)}</span>
            </div>
          </div>

          {/* ✅ Bouton confirmer — version premium animée */}
          <ConfirmButton
            loading={loading}
            disabled={!form.nom || !form.tel || !form.wilaya || !form.commune}
            onClick={handleSubmit}
            label={t.confirmer}
            labelLoading={t.envoi}
          />

          {/* Bouton WhatsApp */}
          <button onClick={waOrder} style={{
            width: '100%', padding: '12px',
            background: '#25D366', border: 'none', borderRadius: 12,
            color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            {t.whatsapp}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes omSlide {
          from { transform: translateY(50px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        input:focus, textarea:focus { border-color: #C9A84C !important; }
        input::placeholder, textarea::placeholder { color: #444; }
      `}</style>
    </div>
  )
}
