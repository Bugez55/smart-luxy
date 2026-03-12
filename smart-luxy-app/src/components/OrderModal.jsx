import { useState } from 'react'
import { WILAYAS, getCommunesByWilaya } from '../data/wilayas'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function OrderModal({ items, onClose, onSubmit }) {
  const total = items.reduce((s, i) => s + Number(i.prix) * i.qty, 0)
  const [form, setForm] = useState({ nom: '', tel: '', wilaya: '', commune: '', adresse: '', note: '' })
  const [loading, setLoading] = useState(false)

  const communes = form.wilaya ? getCommunesByWilaya(form.wilaya) : []

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v, ...(k === 'wilaya' ? { commune: '' } : {}) }))
  }

  async function handleSubmit() {
    if (!form.nom || !form.tel || !form.wilaya || !form.commune) return
    setLoading(true)
    await onSubmit({ ...form, items })
    setLoading(false)
  }

  function waOrder() {
    const msg = items.map(i => `• ${i.nom} ×${i.qty} = ${fmt(Number(i.prix)*i.qty)}`).join('\n')
    const txt = `🛍️ Commande Smart Luxy\n\nClient: ${form.nom || '…'}\nTél: ${form.tel || '…'}\nWilaya: ${form.wilaya || '…'} / ${form.commune || '…'}\n\nArticles:\n${msg}\n\nTotal: ${fmt(total)}`
    window.open(`https://wa.me/${import.meta.env.VITE_WA_NUMBER || '213556688810'}?text=${encodeURIComponent(txt)}`, '_blank')
  }

  return (
    <div className="om-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="om">
        <div className="om-hdr">
          <h2>📋 Passer commande</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="om-body">
          {/* Items */}
          <div className="om-items">
            {items.map((item, i) => (
              <div key={i} className="om-item">
                <span className="om-item-name">{item.nom} ×{item.qty}</span>
                <span className="om-item-price">{fmt(Number(item.prix) * item.qty)}</span>
              </div>
            ))}
            <hr className="om-divider" />
            <div className="om-total">
              <span>Total à payer</span>
              <strong>{fmt(total)}</strong>
            </div>
          </div>

          {/* Form */}
          <div className="form-row">
            <div className="form-field">
              <label>Nom complet *</label>
              <input placeholder="Votre nom" value={form.nom} onChange={e => set('nom', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Téléphone *</label>
              <input placeholder="0555 00 00 00" value={form.tel} onChange={e => set('tel', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Wilaya *</label>
              <select value={form.wilaya} onChange={e => set('wilaya', e.target.value)}>
                <option value="">Choisir une wilaya</option>
                {WILAYAS.map(w => <option key={w.code} value={w.nom}>{w.code} — {w.nom}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Commune *</label>
              <select value={form.commune} onChange={e => set('commune', e.target.value)} disabled={!form.wilaya}>
                <option value="">Choisir une commune</option>
                {communes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Adresse (optionnel)</label>
            <input placeholder="Rue, quartier…" value={form.adresse} onChange={e => set('adresse', e.target.value)} />
          </div>

          <div className="form-field">
            <label>Note (optionnel)</label>
            <textarea placeholder="Instructions, préférences…" rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
        </div>

        <div className="om-footer">
          <button
            className="btn-confirm"
            disabled={loading || !form.nom || !form.tel || !form.wilaya || !form.commune}
            onClick={handleSubmit}
          >
            {loading ? 'Envoi en cours…' : '✅ Confirmer la commande'}
          </button>
          <button className="btn-wa-order" onClick={waOrder}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            Commander via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
