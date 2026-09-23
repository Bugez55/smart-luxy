import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../supabase'
import { alertStockBas, resumeQuotidien } from '../../utils/notify'
import { saveSettings, saveSetting, getSettings } from '../../utils/useSettings'
import { openWA, fmt } from '../../utils/notify'
import ProductForm from './ProductForm'
import ClientsCRM from './ClientsCRM'
import { sendCapiEvent } from '../../utils/api'
import CONFIG from '../../config'

const STATUTS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'new',       label: '🆕 Nouvelles' },
  { key: 'confirmed', label: '✅ Confirmées' },
  { key: 'shipped',   label: '🚚 Expédiées' },
  { key: 'delivered', label: '📦 Livrées' },
  { key: 'cancelled', label: '❌ Annulées' },
]

const STATUT_COLORS = {
  new:       { bg: 'rgba(147,197,253,.15)', color: '#93c5fd', label: '🆕 Nouvelle' },
  confirmed: { bg: 'rgba(134,239,172,.15)', color: '#86efac', label: '✅ Confirmée' },
  shipped:   { bg: 'rgba(167,139,250,.15)', color: '#c4b5fd', label: '🚚 Expédiée' },
  delivered: { bg: 'rgba(201,168,76,.15)',  color: '#C9A84C', label: '📦 Livrée' },
  cancelled: { bg: 'rgba(252,165,165,.15)', color: '#fca5a5', label: '❌ Annulée' },
}

// Transitions autorisées : le même workflow est aussi contrôlé côté Supabase.
const ORDER_STATUS_TRANSITIONS = {
  new:       ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

function canTransitionOrderStatus(from, to) {
  return from === to || Boolean(ORDER_STATUS_TRANSITIONS[from]?.includes(to))
}


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
  <title>Facture — Wazyo #${escapeHtml(order.id?.slice(0,8).toUpperCase())}</title>
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
      <div class="brand">Wazyo</div>
      <div class="brand-sub">Boutique en ligne · Algérie 🇩🇿</div>
    </div>
    <div class="inv-meta">
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Bon de commande</div>
      <div class="inv-num">#${escapeHtml(order.id?.slice(0,8).toUpperCase())}</div>
      <div class="inv-date">${date}</div>
      <span class="badge badge-${order.statut}">${STATUT_COLORS[order.statut]?.label || order.statut}</span>
    </div>
  </div>

  <!-- Infos -->
  <div class="info-grid">
    <div class="info-box">
      <div class="label">👤 Client</div>
      <div class="row"><strong>${escapeHtml(order.nom_client)}</strong></div>
      <div class="row">📞 ${escapeHtml(order.telephone)}</div>
      ${order.note ? `<div class="row" style="margin-top:6px;color:#888;font-size:12px">📝 ${escapeHtml(order.note)}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="label">🚚 Livraison</div>
      <div class="row"><strong>${modeLiv === 'bureau' ? '📦 Retrait bureau' : '🏠 À domicile'}</strong></div>
      <div class="row">📍 ${escapeHtml(order.wilaya)}${order.commune ? ` — ${escapeHtml(order.commune)}` : ''}</div>
      ${order.adresse ? `<div class="row" style="font-size:12px;color:#666">${escapeHtml(order.adresse)}</div>` : ''}
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
          <div class="article-name">${escapeHtml(item.nom)}</div>
          ${item.categorie ? `<div class="article-prix">${escapeHtml(item.categorie)}</div>` : ''}
        </td>
        <td style="text-align:center;font-weight:700">${escapeHtml(String(item.qty))}</td>
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
      Wazyo · Boutique en ligne · Algérie<br>
      📱 +213 556 688 810 · ${escapeHtml(CONFIG.email)}<br>
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

// ═══════════════════════════════════════════════════
//  OUTIL COMPRESSION IMAGES EXISTANTES
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  ADMIN SETTINGS — Paramètres complets
// ═══════════════════════════════════════════════════
function AdminSettings({ onLogout, onToast }) {
  const [adminEmail, setAdminEmail] = useState('')
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data?.user?.email || '')
    })
  }, [])

  // ── Infos boutique ──
  const [shop, setShop] = useState({
    name:    'Wazyo',
    phone:   '213556688810',
    address: 'Tizi Ouzou, Algérie',
    email:   '',
  })

  // Charger depuis Supabase au montage
  useEffect(() => {
    getSettings().then(s => {
      setShop({
        name:    s.shop_name    || 'Wazyo',
        phone:   s.shop_phone   || '213556688810',
        address: s.shop_address || 'Tizi Ouzou, Algérie',
        email:   s.shop_email   || '',
      })
      setFreeShip(s.free_ship || '')
      setMaintenance(s.maintenance === 'true')
      setPaiement({
        ccp_numero:       s.ccp_numero       || '',
        ccp_nom:          s.ccp_nom          || '',
        baridimob_numero: s.baridimob_numero || '',
        ccp_actif:        s.ccp_actif === 'true',
        baridimob_actif:  s.baridimob_actif === 'true',
      })
    })
  }, [])

  async function savePaiement() {
    setPaiementSaving(true)
    await saveSetting('ccp_numero', paiement.ccp_numero)
    await saveSetting('ccp_nom', paiement.ccp_nom)
    await saveSetting('baridimob_numero', paiement.baridimob_numero)
    await saveSetting('ccp_actif', String(paiement.ccp_actif))
    await saveSetting('baridimob_actif', String(paiement.baridimob_actif))
    setPaiementSaving(false)
    onToast && onToast('✅ Moyens de paiement sauvegardés', 'default')
  }
  const [shopSaving, setShopSaving] = useState(false)

  // ── Mode maintenance ──
  const [maintenance, setMaintenance] = useState(false)

  // ── Livraison gratuite seuil ──
  const [freeShip, setFreeShip] = useState(
    localStorage.getItem('sl_free_ship') || ''
  )

  // ── Paiement CCP / BaridiMob ──
  const [paiement, setPaiement] = useState({
    ccp_numero: '', ccp_nom: '', baridimob_numero: '',
    ccp_actif: false, baridimob_actif: false,
  })
  const [paiementSaving, setPaiementSaving] = useState(false)

  // ── Sauvegarder infos boutique ──
  async function saveShop() {
    setShopSaving(true)
    try {
      // Sauvegarder chaque champ séparément
      await saveSetting('shop_name',    shop.name)
      await saveSetting('shop_phone',   shop.phone)
      await saveSetting('shop_email',   shop.email)
      await saveSetting('shop_address', shop.address)

      // Relire depuis Supabase pour confirmer
      const check = await getSettings()
      console.log('✅ Settings sauvegardés:', check)
      onToast && onToast('✅ Sauvegardé ! Téléphone: ' + check.shop_phone, 'default')
    } catch(e) {
      console.error('saveShop error:', e)
      onToast && onToast('❌ Erreur : ' + (e?.message || JSON.stringify(e)), 'error')
    }
    setShopSaving(false)
  }

  async function toggleMaintenance() {
    const val = !maintenance
    try {
      await saveSetting('maintenance', String(val))
      setMaintenance(val)
      onToast && onToast(val ? '🔧 Mode maintenance activé' : '✅ Site remis en ligne', 'default')
    } catch (e) {
      console.error('toggleMaintenance:', e)
      onToast && onToast('❌ Impossible de modifier le mode maintenance', 'error')
    }
  }

  async function saveFreeShip() {
    await saveSettings({ free_ship: freeShip })
    onToast && onToast('✅ Seuil livraison gratuite sauvegardé', 'default')
  }

  const inp = {
    background: '#1e1e1e', border: '1px solid #333', borderRadius: 8,
    padding: '10px 12px', color: 'white', fontSize: '16px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const lbl = {
    fontSize: 11, fontWeight: 800, color: '#888',
    letterSpacing: '.05em', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  }
  const section = {
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,.07)',
    borderRadius: 14, padding: '18px 16px', marginBottom: 14,
  }
  const sectionTitle = {
    fontSize: 14, fontWeight: 800, color: 'white',
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
  }

  return (
    <div>
      <h3 style={{ color:'white', fontSize:16, fontWeight:800, marginBottom:20 }}>⚙️ Paramètres</h3>

      {/* ── COMPTE ADMIN ── */}
      <div style={section}>
        <div style={sectionTitle}>🔐 Compte administrateur</div>
        <div style={{
          background:'rgba(34,197,94,.08)',
          border:'1px solid rgba(34,197,94,.2)',
          borderRadius:10,
          padding:'10px 12px',
          fontSize:12,
          lineHeight:1.5,
          color:'rgba(255,255,255,.65)'
        }}>
          <strong style={{color:'#86efac'}}>Session Supabase Auth active</strong><br />
          {adminEmail ? `Compte : ${adminEmail}` : 'Compte administrateur authentifié'}<br />
          <span style={{color:'rgba(255,255,255,.35)'}}>
            Le mot de passe n'est pas stocké dans le site, le navigateur ou localStorage.
            Pour le modifier, utilise « Mot de passe oublié » / la gestion du compte dans Supabase Authentication.
          </span>
        </div>
      </div>

      {/* ── INFOS BOUTIQUE ── */}
      <div style={section}>
        <div style={sectionTitle}>🏪 Informations de la boutique</div>

        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Nom de la boutique</label>
          <input value={shop.name} onChange={e => setShop(s => ({ ...s, name: e.target.value }))} style={inp} placeholder="Wazyo" />
        </div>

        <div className="adm-shop-contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Téléphone WhatsApp</label>
            <input value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))} style={inp} placeholder="213XXXXXXXXX" type="tel" />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input value={shop.email} onChange={e => setShop(s => ({ ...s, email: e.target.value }))} style={inp} placeholder="contact@wazyo.dz" type="email" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Adresse</label>
          <input value={shop.address} onChange={e => setShop(s => ({ ...s, address: e.target.value }))} style={inp} placeholder="Tizi Ouzou, Algérie" />
        </div>

        <button onClick={saveShop} style={{
          padding: '10px 20px', background: 'rgba(201,168,76,.15)',
          border: '1px solid rgba(201,168,76,.3)', borderRadius: 10,
          color: '#C9A84C', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>{shopSaving ? '⏳…' : '💾 Sauvegarder'}</button>
      </div>

      {/* ── LIVRAISON GRATUITE ── */}
      <div style={section}>
        <div style={sectionTitle}>🚚 Seuil livraison gratuite</div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 12, lineHeight: 1.5 }}>
          Si le total commande dépasse ce montant, la livraison devient gratuite automatiquement. Laisser vide pour désactiver.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number" value={freeShip}
            onChange={e => setFreeShip(e.target.value)}
            placeholder="Ex: 5000 DA — vide = désactivé"
            style={{ ...inp, flex: 1 }}
          />
          <button onClick={saveFreeShip} style={{
            background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)',
            borderRadius: 10, padding: '0 16px',
            color: '#86efac', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>✅</button>
        </div>
      </div>

      {/* ── PAIEMENT CCP / BARIDIMOB ── */}
      <div style={section}>
        <div style={sectionTitle}>💳 Moyens de paiement</div>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:16, lineHeight:1.5 }}>
          Active BaridiMob et/ou CCP en plus du paiement à la livraison. Les clients pourront choisir sur la page produit.
        </p>

        {/* BaridiMob */}
        <div style={{
          background: paiement.baridimob_actif ? 'rgba(59,130,246,.06)' : '#1a1a1a',
          border: `1px solid ${paiement.baridimob_actif ? 'rgba(59,130,246,.25)' : '#2a2a2a'}`,
          borderRadius:12, padding:14, marginBottom:12,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>📱</span>
              <span style={{ fontSize:13, fontWeight:800, color:'white' }}>BaridiMob</span>
            </div>
            <button
              onClick={() => setPaiement(p => ({ ...p, baridimob_actif: !p.baridimob_actif }))}
              style={{
                padding:'5px 14px', border:'none', borderRadius:20,
                background: paiement.baridimob_actif ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.08)',
                color: paiement.baridimob_actif ? '#86efac' : 'rgba(255,255,255,.4)',
                fontSize:11, fontWeight:800, cursor:'pointer',
              }}
            >{paiement.baridimob_actif ? '🟢 Activé' : '⚪ Désactivé'}</button>
          </div>
          <label style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:800, display:'block', marginBottom:4 }}>Numéro de compte BaridiMob</label>
          <input
            value={paiement.baridimob_numero}
            onChange={e => setPaiement(p => ({ ...p, baridimob_numero: e.target.value }))}
            placeholder="00799999002583676007"
            style={{ ...inp, fontFamily:'monospace' }}
          />
        </div>

        {/* CCP */}
        <div style={{
          background: paiement.ccp_actif ? 'rgba(201,168,76,.06)' : '#1a1a1a',
          border: `1px solid ${paiement.ccp_actif ? 'rgba(201,168,76,.25)' : '#2a2a2a'}`,
          borderRadius:12, padding:14, marginBottom:14,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>🏦</span>
              <span style={{ fontSize:13, fontWeight:800, color:'white' }}>CCP (Virement)</span>
            </div>
            <button
              onClick={() => setPaiement(p => ({ ...p, ccp_actif: !p.ccp_actif }))}
              style={{
                padding:'5px 14px', border:'none', borderRadius:20,
                background: paiement.ccp_actif ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.08)',
                color: paiement.ccp_actif ? '#86efac' : 'rgba(255,255,255,.4)',
                fontSize:11, fontWeight:800, cursor:'pointer',
              }}
            >{paiement.ccp_actif ? '🟢 Activé' : '⚪ Désactivé'}</button>
          </div>
          <label style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:800, display:'block', marginBottom:4 }}>Numéro CCP</label>
          <input
            value={paiement.ccp_numero}
            onChange={e => setPaiement(p => ({ ...p, ccp_numero: e.target.value }))}
            placeholder="0012345678 clé 90"
            style={{ ...inp, fontFamily:'monospace', marginBottom:8 }}
          />
          <label style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:800, display:'block', marginBottom:4 }}>Nom du titulaire</label>
          <input
            value={paiement.ccp_nom}
            onChange={e => setPaiement(p => ({ ...p, ccp_nom: e.target.value }))}
            placeholder="Nom complet"
            style={inp}
          />
        </div>

        <button onClick={savePaiement} disabled={paiementSaving} style={{
          width:'100%', padding:'11px',
          background: paiementSaving ? '#222' : 'linear-gradient(135deg,#C9A84C,#E9C46A)',
          border:'none', borderRadius:10,
          color: paiementSaving ? '#444' : '#000',
          fontSize:13, fontWeight:800, cursor: paiementSaving ? 'default' : 'pointer',
        }}>{paiementSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder les paiements'}</button>
      </div>

      {/* ── MODE MAINTENANCE ── */}
      <div style={{ ...section, border: `1px solid ${maintenance ? 'rgba(239,68,68,.3)' : 'rgba(255,255,255,.07)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={sectionTitle}>🔧 Mode maintenance</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: -8, lineHeight: 1.5 }}>
              {maintenance ? "⚠️ Le site est en maintenance — les clients voient une page d'attente" : 'Le site est en ligne et accessible aux clients'}
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            style={{
              flexShrink: 0, marginLeft: 12,
              padding: '8px 16px', borderRadius: 10,
              background: maintenance ? 'rgba(239,68,68,.2)' : 'rgba(34,197,94,.15)',
              color: maintenance ? '#fca5a5' : '#86efac',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
              border: `1px solid ${maintenance ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.25)'}`,
            }}
          >{maintenance ? '🔴 Actif' : '🟢 Inactif'}</button>
        </div>
      </div>

      {/* ── DÉCONNEXION ── */}
      <div style={section}>
        <div style={sectionTitle}>🚪 Session admin</div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '11px',
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 10, color: '#fca5a5',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}
        >🚪 Se déconnecter</button>
      </div>

    </div>
  )
}





// ═══════════════════════════════════════════════════
//  THEME EDITOR
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  LIVRAISON MANAGER — Yalidine + Noest + World Express
// ═══════════════════════════════════════════════════
function ShippingRatesEditor({ onToast }) {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    let mounted = true
    supabase.from('shipping_rates').select('*').order('wilaya').then(({ data, error }) => {
      if (!mounted) return
      if (error) { onToast && onToast('❌ Impossible de charger les tarifs', 'error'); setLoading(false); return }
      setRates(data || [])
      setLoading(false)
    })
    return () => { mounted = false }
  }, [open])

  function setField(wilaya, field, value) {
    setRates(prev => prev.map(r => r.wilaya === wilaya ? { ...r, [field]: value } : r))
  }

  async function saveRow(wilaya) {
    const row = rates.find(r => r.wilaya === wilaya)
    if (!row) return
    setSavingId(wilaya)
    const { error } = await supabase.from('shipping_rates')
      .update({ bureau: Number(row.bureau) || 0, domicile: Number(row.domicile) || 0 })
      .eq('wilaya', wilaya)
    setSavingId(null)
    if (error) onToast && onToast(`❌ Erreur pour ${wilaya}`, 'error')
    else onToast && onToast(`✅ ${wilaya} mis à jour`, 'default')
  }

  const sec = { background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:16, marginBottom:12 }
  const inp = { background:'#111', border:'1px solid #333', borderRadius:8, padding:'7px 9px', color:'white', fontSize:13, outline:'none', width:80, boxSizing:'border-box', fontFamily:'inherit' }

  return (
    <div style={sec}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background:'none', border:'none', cursor:'pointer', width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:0 }}
      >
        <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em' }}>💰 TARIFS DE LIVRAISON PAR WILAYA</span>
        <span style={{ color:'rgba(255,255,255,.4)', fontSize:14 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop:14 }}>
          {loading && <div style={{ color:'rgba(255,255,255,.4)', fontSize:13 }}>Chargement…</div>}
          {!loading && rates.length === 0 && (
            <div style={{ color:'rgba(255,255,255,.4)', fontSize:13 }}>Aucun tarif trouvé — vérifie que le schema.sql a bien été exécuté.</div>
          )}
          {!loading && rates.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:420, overflowY:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 70px', gap:8, fontSize:10, fontWeight:800, color:'rgba(255,255,255,.3)', letterSpacing:'.05em', padding:'0 2px' }}>
                <span>WILAYA</span><span>BUREAU</span><span>DOMICILE</span><span></span>
              </div>
              {rates.map(r => (
                <div key={r.wilaya} style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 70px', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'white' }}>{r.wilaya}</span>
                  <input type="number" value={r.bureau} onChange={e => setField(r.wilaya, 'bureau', e.target.value)} style={inp} />
                  <input type="number" value={r.domicile} onChange={e => setField(r.wilaya, 'domicile', e.target.value)} style={inp} />
                  <button
                    onClick={() => saveRow(r.wilaya)}
                    disabled={savingId === r.wilaya}
                    style={{ background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.3)', borderRadius:8, padding:'7px 0', color:'#e5c158', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >{savingId === r.wilaya ? '…' : '💾'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LivraisonManager({ orders, onToast }) {
  const [selectedCompany, setSelectedCompany] = useState('yalidine')
  const [sending, setSending] = useState({})
  const [search, setSearch] = useState('')

  // Commandes confirmées non livrées
  const pendingOrders = orders.filter(o =>
    o.statut === 'confirmed' || o.statut === 'new'
  ).filter(o =>
    !search || o.nom_client?.toLowerCase().includes(search.toLowerCase()) ||
    o.telephone?.includes(search) || o.wilaya?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Envoyer vers Yalidine via API serveur ──
  async function sendToYalidine(order) {
    setSending(p => ({ ...p, [order.id]: true }))
    try {
      const data = await fetch('/api/shipping', {
        method: 'POST',
        headers: await (async () => {
          const { data: sessionData } = await supabase.auth.getSession()
          return {
            'Content-Type': 'application/json',
            ...(sessionData?.session?.access_token
              ? { Authorization: `Bearer ${sessionData.session.access_token}` }
              : {}),
          }
        })(),
        body: JSON.stringify({ provider: 'yalidine', orderId: order.id }),
      }).then(async response => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`)
        return body
      })

      onToast && onToast(`✅ Colis créé ! Tracking: ${data.tracking}`, 'default')

      if (data.label_url) window.open(data.label_url, '_blank', 'noopener,noreferrer')
      else window.open(`https://yalidine.app/app/particulier/bordereau.php?tracking=${encodeURIComponent(data.tracking)}`, '_blank', 'noopener,noreferrer')
    } catch(e) {
      onToast && onToast('❌ Yalidine: ' + e.message, 'error')
    }
    setSending(p => ({ ...p, [order.id]: false }))
  }


  // ── Ouvrir Noest DZ avec données pré-remplies ──
  function sendToNoest(order) {
    const url = `https://noest-dz.com/expediteur/ajouter-colis?` +
      `nom=${encodeURIComponent(order.nom_client)}&` +
      `telephone=${encodeURIComponent(order.telephone)}&` +
      `wilaya=${encodeURIComponent(order.wilaya || '')}&` +
      `commune=${encodeURIComponent(order.commune || '')}&` +
      `adresse=${encodeURIComponent(order.adresse || '')}&` +
      `montant=${order.total}&` +
      `reference=${order.id}`
    window.open(url, '_blank', 'noopener,noreferrer')
    onToast && onToast('✅ Noest DZ ouvert avec les données', 'default')
  }

  // ── Ouvrir Yalidine web avec données pré-remplies ──
  function openYalidineWeb(order) {
    const url = `https://yalidine.app/app/particulier/ajouter-particulier.php?` +
      `firstname=${encodeURIComponent(order.nom_client?.split(' ')[0] || '')}&` +
      `familyname=${encodeURIComponent(order.nom_client?.split(' ').slice(1).join(' ') || '')}&` +
      `phone=${encodeURIComponent(order.telephone || '')}&` +
      `wilaya=${encodeURIComponent(getWilayaId(order.wilaya) || '')}&` +
      `address=${encodeURIComponent(order.adresse || order.commune || '')}&` +
      `price=${order.total}&` +
      `ref=${order.id}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Télécharger bordereau PDF maison ──
  function printBordereau(order) {
    const items = (() => { try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) } catch { return [] } })()
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bordereau ${escapeHtml(order.id)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; }
      .box { border: 2px solid #000; border-radius: 6px; padding: 14px; margin-bottom: 14px; }
      .title { font-size: 22px; font-weight: 900; text-align: center; margin-bottom: 4px; }
      .sub { text-align:center; color:#555; font-size:11px; margin-bottom:14px; }
      .row { display:flex; justify-content:space-between; margin-bottom:6px; }
      .label { font-weight:700; color:#333; }
      .val { color:#000; }
      table { width:100%; border-collapse:collapse; margin-top:8px; }
      th { background:#111; color:white; padding:7px 10px; text-align:left; font-size:12px; }
      td { padding:7px 10px; border-bottom:1px solid #eee; }
      .total { font-size:18px; font-weight:900; text-align:right; margin-top:10px; }
      .barcode { text-align:center; font-size:28px; letter-spacing:4px; padding:10px; background:#f5f5f5; border-radius:6px; margin-top:8px; font-family:monospace; }
      .company { font-size:11px; color:#888; text-align:center; margin-top:4px; }
      @media print { @page{margin:10mm} button{display:none!important} }
    </style>
    </head><body>
    <button onclick="window.print()" style="background:#000;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;margin-bottom:16px;display:block;width:100%">🖨️ Imprimer le bordereau</button>
    <div class="title">Wazyo</div>
    <div class="sub">Bordereau de livraison · Algérie 🇩🇿</div>
    <div class="box">
      <div class="row"><span class="label">N° Commande:</span><span class="val" style="font-weight:900;font-size:15px">${escapeHtml(order.id)}</span></div>
      <div class="row"><span class="label">Date:</span><span class="val">${new Date(order.created_at).toLocaleDateString('fr-DZ')}</span></div>
      <div class="row"><span class="label">Mode:</span><span class="val">${order.mode_livraison === 'bureau' ? '📦 Retrait bureau' : '🏠 Livraison à domicile'}</span></div>
    </div>
    <div class="box">
      <div class="label" style="margin-bottom:8px;font-size:14px">📍 Destinataire</div>
      <div class="row"><span class="label">Nom:</span><span class="val">${escapeHtml(order.nom_client)}</span></div>
      <div class="row"><span class="label">Téléphone:</span><span class="val">${escapeHtml(order.telephone)}</span></div>
      <div class="row"><span class="label">Wilaya:</span><span class="val">${escapeHtml(order.wilaya)}</span></div>
      <div class="row"><span class="label">Commune:</span><span class="val">${escapeHtml(order.commune)}</span></div>
      ${order.adresse ? `<div class="row"><span class="label">Adresse:</span><span class="val">${escapeHtml(order.adresse)}</span></div>` : ''}
    </div>
    <div class="box">
      <div class="label" style="margin-bottom:8px;font-size:14px">🛍️ Articles</div>
      <table><thead><tr><th>Produit</th><th>Qté</th><th>Prix</th></tr></thead><tbody>
      ${items.map(it => `<tr><td>${escapeHtml(it.nom)}</td><td>${escapeHtml(String(it.qty))}</td><td>${(it.prix*it.qty).toLocaleString()} DA</td></tr>`).join('')}
      </tbody></table>
      <div class="total">Total à percevoir: ${Number(order.total).toLocaleString()} DA</div>
    </div>
    <div class="barcode">${escapeHtml(order.id)}</div>
    <div class="company">Société de livraison: ${selectedCompany === 'yalidine' ? 'Yalidine' : selectedCompany === 'noest' ? 'Noest DZ' : 'World Express'}</div>
    </body></html>`)
    win.document.close()
  }

  // Mapper wilaya → ID Yalidine (simplifié)
  function getWilayaId(wilayaStr) {
    if (!wilayaStr) return 1
    const num = wilayaStr.match(/^(\d+)/)?.[1]
    return num ? parseInt(num) : 1
  }

  const sec = { background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:16, marginBottom:12 }
  const inp = { background:'#111', border:'1px solid #333', borderRadius:8, padding:'9px 12px', color:'white', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit' }

  const COMPANIES = [
    { id:'yalidine', name:'Yalidine', icon:'🟡', color:'#f59e0b', hasApi: true },
    { id:'noest',    name:'Noest DZ', icon:'🔵', color:'#3b82f6', hasApi: false },
    { id:'worldex',  name:'World Express', icon:'🟢', color:'#22c55e', hasApi: false },
  ]

  return (
    <div>
      <h3 style={{ color:'white', fontSize:16, fontWeight:800, marginBottom:6 }}>🚚 Gestion des livraisons</h3>
      <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:20, lineHeight:1.5 }}>
        Envoie tes commandes vers ta société de livraison et génère les bordereaux.
      </p>

      <ShippingRatesEditor onToast={onToast} />

      {/* ── Choix société ── */}
      <div style={sec}>
        <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', marginBottom:10 }}>SOCIÉTÉ DE LIVRAISON</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {COMPANIES.map(co => (
            <button key={co.id} onClick={() => setSelectedCompany(co.id)} style={{
              background: selectedCompany===co.id ? `${co.color}15` : '#111',
              border: `2px solid ${selectedCompany===co.id ? co.color : 'rgba(255,255,255,.08)'}`,
              borderRadius:12, padding:'12px 8px', cursor:'pointer', textAlign:'center', transition:'all .2s',
            }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{co.icon}</div>
              <div style={{ fontSize:11, fontWeight:800, color:selectedCompany===co.id ? co.color : 'rgba(255,255,255,.5)' }}>{co.name}</div>
              {co.hasApi && <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', marginTop:2 }}>API disponible</div>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Configuration Yalidine ── */}
      {selectedCompany === 'yalidine' && (
        <div style={sec}>
          <div style={{ fontSize:12, fontWeight:800, color:'#f59e0b', marginBottom:10 }}>🔐 Yalidine — configuration serveur</div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,.45)', margin:0, lineHeight:1.6 }}>
            Les identifiants Yalidine ne sont plus stockés dans le navigateur.
            Configure <strong style={{color:'#f59e0b'}}>YALIDINE_API_ID</strong> et
            <strong style={{color:'#f59e0b'}}> YALIDINE_API_TOKEN</strong> dans
            <strong> Vercel → Settings → Environment Variables</strong>.
          </p>
        </div>
      )}

      {/* ── Liste commandes ── */}
      <div style={sec}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:800, color:'white' }}>Commandes à expédier ({pendingOrders.length})</div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher (nom, tél, wilaya...)"
          style={{ ...inp, marginBottom:10 }}
        />

        {pendingOrders.length === 0 ? (
          <div style={{ textAlign:'center', padding:20, color:'rgba(255,255,255,.2)', fontSize:12 }}>Aucune commande en attente</div>
        ) : pendingOrders.map(order => {
          const items = (() => { try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) } catch { return [] } })()
          const isSending = sending[order.id]
          const co = COMPANIES.find(c => c.id === selectedCompany)

          return (
            <div key={order.id} style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
              {/* Infos commande */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:900, color:'white' }}>{order.nom_client}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>📞 {order.telephone} · 📍 {order.wilaya}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>#{order.id?.slice(0,8).toUpperCase()}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:14, fontWeight:900, color:'#C9A84C' }}>{Number(order.total).toLocaleString()} DA</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{items.length} article{items.length>1?'s':''}</div>
                </div>
              </div>

              {/* Boutons actions */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {/* Bouton principal selon la société */}
                {selectedCompany === 'yalidine' && (
                  <>
                    <button onClick={() => sendToYalidine(order)} disabled={isSending} style={{
                      flex:1, background:isSending?'#222':'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)',
                      borderRadius:8, padding:'8px 12px', color:'#f59e0b', fontSize:11, fontWeight:800, cursor:isSending?'default':'pointer',
                    }}>
                      {isSending ? '⏳ Envoi...' : '🟡 Créer colis Yalidine'}
                    </button>
                    <button onClick={() => openYalidineWeb(order)} style={{
                      background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.25)',
                      borderRadius:8, padding:'8px 12px', color:'#f59e0b', fontSize:11, fontWeight:800, cursor:'pointer',
                    }}>🌐 Web</button>
                  </>
                )}

                {selectedCompany === 'noest' && (
                  <button onClick={() => sendToNoest(order)} style={{
                    flex:1, background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.25)',
                    borderRadius:8, padding:'8px 12px', color:'#93c5fd', fontSize:11, fontWeight:800, cursor:'pointer',
                  }}>🔵 Ouvrir Noest DZ</button>
                )}

                {selectedCompany === 'worldex' && (
                  <button onClick={() => window.open('https://www.world-express.dz', '_blank', 'noopener,noreferrer')} style={{
                    flex:1, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)',
                    borderRadius:8, padding:'8px 12px', color:'#86efac', fontSize:11, fontWeight:800, cursor:'pointer',
                  }}>🟢 Ouvrir World Express</button>
                )}

                {/* Bordereau PDF */}
                <button onClick={() => printBordereau(order)} style={{
                  background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:8, padding:'8px 12px', color:'rgba(255,255,255,.6)', fontSize:11, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap',
                }}>🖨️ Bordereau</button>
              </div>

              {/* Tracking si disponible */}
              {order.tracking_code && (
                <div style={{ marginTop:6, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'#86efac' }}>
                  📦 Tracking: <strong>{order.tracking_code}</strong>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ThemeEditor({ onToast }) {
  const [theme, setTheme] = useState({
    theme_bg: '#0a0a0a', theme_card: '#141414',
    theme_accent: '#C9A84C', theme_text: '#e0e0e0', theme_text_sub: '#888888',
  })
  const [saving, setSaving] = useState(false)
  const [activePreset, setActivePreset] = useState(null)
  const [customThemes, setCustomThemes] = useState([])
  const [newThemeName, setNewThemeName] = useState('')
  const [savingCustom, setSavingCustom] = useState(false)

  const DEFAULT_THEME = { theme_bg:'#0a0a0a', theme_card:'#141414', theme_accent:'#C9A84C', theme_text:'#e0e0e0', theme_text_sub:'#888888' }

  useEffect(() => {
    getSettings().then(s => {
      setTheme(t => ({
        ...t,
        theme_bg:       s.theme_bg       || t.theme_bg,
        theme_card:     s.theme_card     || t.theme_card,
        theme_accent:   s.theme_accent   || t.theme_accent,
        theme_text:     s.theme_text     || t.theme_text,
        theme_text_sub: s.theme_text_sub || t.theme_text_sub,
      }))
      try {
        const parsed = JSON.parse(s.custom_themes || '[]')
        setCustomThemes(Array.isArray(parsed) ? parsed : [])
      } catch { setCustomThemes([]) }
    })
  }, [])

  // Applique un objet CSS complet au DOM en une seule passe
  function applyToDOM(t) {
    const r = document.documentElement
    r.style.setProperty('--bk', t.theme_bg)
    r.style.setProperty('--bk2', t.theme_bg)
    r.style.setProperty('--card', t.theme_card)
    r.style.setProperty('--card2', t.theme_card)
    r.style.setProperty('--br', t.theme_accent)
    r.style.setProperty('--br2', t.theme_accent)
    r.style.setProperty('--br3', t.theme_accent)
    r.style.setProperty('--g3', t.theme_text)
    r.style.setProperty('--g4', t.theme_text_sub)
    document.body.style.background = t.theme_bg
  }

  // Pour un seul champ modifié manuellement (color picker)
  function apply(key, val) {
    setTheme(prev => {
      const next = { ...prev, [key]: val }
      applyToDOM(next)
      return next
    })
    setActivePreset(null)
  }

  // Pour appliquer un preset entier d'un coup — corrige le bug de closure
  function applyPreset(p, idx) {
    const next = {
      theme_bg: p.bg, theme_card: p.card, theme_accent: p.accent,
      theme_text: p.text, theme_text_sub: p.sub,
    }
    setTheme(next)
    applyToDOM(next)
    setActivePreset(idx)
  }

  async function save() {
    setSaving(true)
    for (const [k, v] of Object.entries(theme)) await saveSetting(k, v)
    setSaving(false)
    onToast && onToast('✅ Thème sauvegardé ! Visible pour tous les clients.', 'default')
  }

  // Sauvegarder la combinaison actuelle comme thème personnalisé réutilisable
  async function saveCustomTheme() {
    if (!newThemeName.trim()) { onToast && onToast('Donne un nom à ton thème', 'error'); return }
    setSavingCustom(true)
    const newCustom = {
      name: newThemeName.trim(),
      bg: theme.theme_bg, card: theme.theme_card, accent: theme.theme_accent,
      text: theme.theme_text, sub: theme.theme_text_sub,
      id: Date.now(),
    }
    const updated = [...customThemes, newCustom]
    await saveSetting('custom_themes', JSON.stringify(updated))
    setCustomThemes(updated)
    setNewThemeName('')
    setSavingCustom(false)
    onToast && onToast(`✅ Thème "${newCustom.name}" enregistré ! Tu peux le réutiliser à tout moment.`, 'default')
  }

  async function deleteCustomTheme(id) {
    const updated = customThemes.filter(t => t.id !== id)
    await saveSetting('custom_themes', JSON.stringify(updated))
    setCustomThemes(updated)
    onToast && onToast('🗑️ Thème supprimé', 'default')
  }

  function restoreDefault() {
    setTheme(DEFAULT_THEME)
    applyToDOM(DEFAULT_THEME)
    setActivePreset(0)
    onToast && onToast('↺ Thème par défaut restauré (pas encore sauvegardé — clique "Sauvegarder" pour confirmer)', 'default')
  }

  const PRESETS = [
    { name:'🌑 Noir doré',        bg:'#0a0a0a', card:'#141414', accent:'#C9A84C', text:'#e0e0e0', sub:'#888888' },
    { name:'🤍 Blanc élégant',    bg:'#f5f5f0', card:'#ffffff', accent:'#C9A84C', text:'#1a1a1a', sub:'#666666' },
    { name:'⚪ Gris minimal',     bg:'#f0f0f2', card:'#ffffff', accent:'#111111', text:'#1a1a1a', sub:'#707070' },
    { name:'🌿 Vert naturel',     bg:'#071009', card:'#0f1c0c', accent:'#4caf50', text:'#e0f0e0', sub:'#80b080' },
    { name:'🍃 Vert menthe clair',bg:'#f0faf5', card:'#ffffff', accent:'#0d9488', text:'#0f2e24', sub:'#4a8577' },
    { name:'💙 Bleu nuit',        bg:'#050d1a', card:'#0d1b2e', accent:'#3b82f6', text:'#e0eaff', sub:'#7090b0' },
    { name:'🩵 Bleu ciel clair',  bg:'#f0f7ff', card:'#ffffff', accent:'#2563eb', text:'#0f1f3d', sub:'#5878a8' },
    { name:'🌹 Rose luxe',        bg:'#120a0f', card:'#1e0f18', accent:'#e91e8c', text:'#ffe0f0', sub:'#b070a0' },
    { name:'🩷 Rose poudré clair',bg:'#fdf2f6', card:'#ffffff', accent:'#db2777', text:'#3d0f22', sub:'#a06078' },
    { name:'🔴 Rouge passion',    bg:'#0f0505', card:'#1a0a0a', accent:'#ef4444', text:'#ffe8e8', sub:'#c08080' },
    { name:'🟣 Violet royal',     bg:'#08050f', card:'#120c1e', accent:'#9333ea', text:'#f0e8ff', sub:'#a080c0' },
    { name:'💜 Lavande clair',    bg:'#f7f4ff', card:'#ffffff', accent:'#7c3aed', text:'#1f1233', sub:'#7a6699' },
    { name:'🟠 Orange chaud',     bg:'#0f0800', card:'#1a1000', accent:'#f97316', text:'#fff3e0', sub:'#c09060' },
    { name:'🍑 Pêche clair',      bg:'#fff7f0', card:'#ffffff', accent:'#ea580c', text:'#331c0d', sub:'#a37a5c' },
    { name:'⚫ Charbon mat',      bg:'#111111', card:'#1c1c1c', accent:'#d4d4d4', text:'#f0f0f0', sub:'#8a8a8a' },
    { name:'🟡 Sable doré clair', bg:'#faf6ed', card:'#ffffff', accent:'#b8860b', text:'#2e2410', sub:'#8a7a55' },
  ]

  const sec = { background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:16, marginBottom:12 }
  const lbl = { fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8, display:'block' }

  return (
    <div>
      <h3 style={{ color:'white', fontSize:16, fontWeight:800, marginBottom:6 }}>🎨 Thème de la boutique</h3>
      <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:18, lineHeight:1.5 }}>
        Personnalise les couleurs de tout le site. L'aperçu est en temps réel.
      </p>

      {/* Palettes */}
      <div style={sec}>
        <span style={lbl}>Palettes prêtes à l'emploi</span>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {PRESETS.map((p, idx) => (
            <button key={p.name} onClick={() => applyPreset(p, idx)} style={{
              background: p.card,
              border: `2px solid ${activePreset === idx ? p.accent : p.accent + '80'}`,
              borderRadius:12, padding:'12px 10px', cursor:'pointer', textAlign:'left',
              transition:'transform .15s, box-shadow .15s',
              boxShadow: activePreset === idx ? `0 0 0 2px ${p.accent}` : 'none',
              position:'relative',
            }}>
              {activePreset === idx && (
                <div style={{ position:'absolute', top:6, right:6, width:16, height:16, borderRadius:'50%', background:p.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:p.card, fontWeight:900 }}>✓</div>
              )}
              <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                {[p.bg, p.card, p.accent, p.text].map((col, i) => (
                  <div key={i} style={{ width:14, height:14, borderRadius:3, background:col, border:'1px solid rgba(255,255,255,.15)' }} />
                ))}
              </div>
              <div style={{ fontSize:12, fontWeight:800, color: p.text }}>{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mes thèmes personnalisés sauvegardés ── */}
      {customThemes.length > 0 && (
        <div style={sec}>
          <span style={lbl}>⭐ Mes thèmes enregistrés</span>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {customThemes.map(ct => (
              <div key={ct.id} style={{ position:'relative' }}>
                <button onClick={() => {
                  const t = { theme_bg:ct.bg, theme_card:ct.card, theme_accent:ct.accent, theme_text:ct.text, theme_text_sub:ct.sub }
                  setTheme(t); applyToDOM(t); setActivePreset(null)
                }} style={{
                  width:'100%', background: ct.card, border:`2px solid ${ct.accent}80`, borderRadius:12,
                  padding:'12px 10px', cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                    {[ct.bg, ct.card, ct.accent, ct.text].map((col, i) => (
                      <div key={i} style={{ width:14, height:14, borderRadius:3, background:col, border:'1px solid rgba(255,255,255,.15)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize:12, fontWeight:800, color: ct.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ct.name}</div>
                </button>
                <button onClick={() => deleteCustomTheme(ct.id)} style={{
                  position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:'50%',
                  background:'#ef4444', border:'2px solid #1a1a1a', color:'white', fontSize:11, fontWeight:900,
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sauvegarder la combinaison actuelle comme thème perso ── */}
      <div style={sec}>
        <span style={lbl}>💾 Enregistrer la combinaison actuelle</span>
        <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:10, lineHeight:1.5 }}>
          Donne un nom à tes couleurs actuelles pour les retrouver et les réappliquer n'importe quand.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <input
            value={newThemeName}
            onChange={e => setNewThemeName(e.target.value)}
            placeholder="Ex: Ma palette d'été"
            style={{ flex:1, background:'#111', border:'1px solid #333', borderRadius:8, padding:'9px 12px', color:'white', fontSize:13, outline:'none' }}
          />
          <button onClick={saveCustomTheme} disabled={savingCustom} style={{
            background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.3)', borderRadius:8,
            padding:'9px 16px', color:'#C9A84C', fontSize:12, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap',
          }}>{savingCustom ? '⏳' : '💾 Enregistrer'}</button>
        </div>
      </div>

      {/* Couleurs manuelles */}
      <div style={sec}>
        <span style={lbl}>Personnaliser</span>
        {[
          { key:'theme_bg',       label:'🎨 Fond du site' },
          { key:'theme_card',     label:'📦 Fond des cartes' },
          { key:'theme_accent',   label:'✨ Couleur accent (boutons, prix)' },
          { key:'theme_text',     label:'📝 Texte principal' },
          { key:'theme_text_sub', label:'💬 Texte secondaire' },
        ].map(item => (
          <div key={item.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, background:'rgba(255,255,255,.03)', borderRadius:10, padding:10 }}>
            <div style={{ flex:1, fontSize:13, fontWeight:600, color:'white' }}>{item.label}</div>
            <input type="color"
              value={theme[item.key].startsWith('#') ? theme[item.key] : '#888888'}
              onChange={e => apply(item.key, e.target.value)}
              style={{ width:38, height:34, borderRadius:8, border:'2px solid rgba(255,255,255,.2)', background:'none', cursor:'pointer', padding:2 }}
            />
            <input value={theme[item.key]} onChange={e => apply(item.key, e.target.value)}
              style={{ width:100, background:'#111', border:'1px solid #333', borderRadius:8, padding:'6px 8px', color:'white', fontSize:11, outline:'none', fontFamily:'monospace' }}
            />
          </div>
        ))}
      </div>

      {/* Aperçu */}
      <div style={{ ...sec, background: theme.theme_bg }}>
        <span style={{ ...lbl, color: theme.theme_text_sub }}>Aperçu</span>
        <div style={{ background: theme.theme_card, borderRadius:10, overflow:'hidden', border:`1px solid ${theme.theme_accent}40` }}>
          <div style={{ height:50, background:`${theme.theme_accent}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📦</div>
          <div style={{ padding:'10px 12px' }}>
            <div style={{ fontSize:13, fontWeight:700, color: theme.theme_text, marginBottom:4 }}>Nom du produit</div>
            <div style={{ fontSize:15, fontWeight:900, color: theme.theme_accent, marginBottom:8 }}>2990 DA</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <div style={{ background:`${theme.theme_accent}15`, border:`1px solid ${theme.theme_accent}40`, borderRadius:8, padding:'6px', textAlign:'center', fontSize:11, fontWeight:700, color: theme.theme_accent }}>🛒 Panier</div>
              <div style={{ background: theme.theme_accent, borderRadius:8, padding:'6px', textAlign:'center', fontSize:11, fontWeight:900, color: theme.theme_bg }}>⚡ Acheter</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'center', marginTop:8, fontSize:11, color: theme.theme_text_sub }}>Boutique · Algérie 🇩🇿</div>
      </div>

      {/* Boutons */}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={restoreDefault}
          style={{ flex:1, padding:'11px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:800, cursor:'pointer' }}>
          ↺ Thème par défaut
        </button>
        <button onClick={save} disabled={saving}
          style={{ flex:2, padding:'11px', background:saving?'#222':'linear-gradient(135deg,#C9A84C,#E9C46A)', border:'none', borderRadius:12, color:saving?'#444':'#000', fontSize:13, fontWeight:900, cursor:saving?'default':'pointer' }}>
          {saving ? '⏳...' : '💾 Sauvegarder le thème'}
        </button>
      </div>
    </div>
  )
}


function ImageOptimizer({ products, supabase }) {
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [current, setCurrent] = useState('')
  const [savings, setSavings] = useState(0)

  async function compressImg(url) {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.82)
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  async function reupload(blob, originalPath) {
    const path = `products/opt-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  }

  async function run() {
    setRunning(true); setDone(false); setResults([]); setSavings(0)
    let totalSaved = 0
    const res = []

    for (const prod of products) {
      if (!prod.img) continue
      setCurrent(prod.nom)

      // Vérifier taille via fetch HEAD
      try {
        const r = await fetch(prod.img, { method: 'HEAD' })
        const size = parseInt(r.headers.get('content-length') || '0')

        if (size > 300 * 1024) { // > 300KB → compresser
          const blob = await compressImg(prod.img)
          if (blob && blob.size < size) {
            const saved = size - blob.size
            totalSaved += saved
            const newUrl = await reupload(blob)
            if (newUrl) {
              await supabase.from('products').update({ img: newUrl }).eq('id', prod.id)
              res.push({ nom: prod.nom, avant: size, apres: blob.size, url: newUrl, ok: true })
            } else {
              res.push({ nom: prod.nom, avant: size, apres: blob?.size, ok: false, err: 'Upload échoué' })
            }
          } else {
            res.push({ nom: prod.nom, avant: size, apres: size, skipped: true })
          }
        } else {
          res.push({ nom: prod.nom, avant: size, skipped: true, reason: 'Déjà optimisée' })
        }
      } catch(e) {
        res.push({ nom: prod.nom, skipped: true, reason: 'Inaccessible' })
      }

      setResults([...res])
      setSavings(totalSaved)
    }

    setCurrent('')
    setRunning(false)
    setDone(true)
  }

  function fmtSize(b) {
    if (!b) return '?'
    if (b > 1024*1024) return (b/1024/1024).toFixed(1) + ' MB'
    return Math.round(b/1024) + ' KB'
  }

  const toOptimize = products.filter(p => p.img).length

  return (
    <div>
      <h3 style={{ color:'white', fontSize:15, fontWeight:800, marginBottom:8 }}>
        🗜️ Optimisation des images existantes
      </h3>
      <p style={{ color:'rgba(255,255,255,.4)', fontSize:12, marginBottom:20, lineHeight:1.6 }}>
        Compresse automatiquement toutes les images de tes produits déjà en ligne.
        Les images &gt; 300KB seront réduites à max 1200px et 82% de qualité — invisible à l'œil mais 3-5x plus léger.
      </p>

      {/* Stats */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <div style={{ flex:1, background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'12px', textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#C9A84C' }}>{toOptimize}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Produits avec images</div>
        </div>
        <div style={{ flex:1, background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'12px', textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#22c55e' }}>
            {savings > 0 ? fmtSize(savings) : '—'}
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Économisé</div>
        </div>
      </div>

      {/* Bouton lancer */}
      {!running && !done && (
        <button
          onClick={run}
          disabled={toOptimize === 0}
          style={{
            width:'100%', padding:'13px',
            background: toOptimize > 0 ? 'linear-gradient(135deg,#C9A84C,#E9C46A)' : '#1a1a1a',
            border:'none', borderRadius:12,
            color: toOptimize > 0 ? '#000' : '#333',
            fontSize:14, fontWeight:800, cursor: toOptimize > 0 ? 'pointer' : 'default',
            marginBottom:16,
          }}
        >
          🗜️ Lancer la compression ({toOptimize} images)
        </button>
      )}

      {/* En cours */}
      {running && (
        <div style={{ background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.2)', borderRadius:10, padding:'14px', marginBottom:16, textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#C9A84C', marginBottom:4 }}>
            ⏳ Compression en cours…
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{current}</div>
          <div style={{ marginTop:10, height:4, background:'rgba(255,255,255,.08)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%', background:'#C9A84C', borderRadius:2,
              width: `${results.length / Math.max(toOptimize,1) * 100}%`,
              transition:'width .3s',
            }} />
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:6 }}>
            {results.length} / {toOptimize} traités
          </div>
        </div>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {done && (
            <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:10, padding:'12px 14px', marginBottom:8, textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#86efac' }}>
                ✅ Terminé — {fmtSize(savings)} économisés
              </div>
            </div>
          )}
          {results.map((r, i) => (
            <div key={i} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              background:'#1a1a1a', borderRadius:8, padding:'8px 12px',
              border:`1px solid ${r.ok ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.05)'}`,
            }}>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.7)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {r.nom}
              </span>
              <span style={{ fontSize:11, color: r.ok ? '#86efac' : 'rgba(255,255,255,.3)', marginLeft:8, flexShrink:0 }}>
                {r.ok ? `${fmtSize(r.avant)} → ${fmtSize(r.apres)}` : r.reason || r.err || 'Ignorée'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPanel({ onLogout, onToast }) {
  const [tab, setTab] = useState('orders')
  const [promos, setPromos] = useState([])
  const [bannerMsgs, setBannerMsgs] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [newPromo, setNewPromo] = useState({ code:'', reduction:10, max_uses:'' })
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
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

  const selectedOrderRows = orders.filter(o => selectedOrders.has(o.id))
  const canBulkConfirm = selectedOrderRows.length > 0 && selectedOrderRows.every(o => canTransitionOrderStatus(o.statut, 'confirmed'))
  const canBulkShip = selectedOrderRows.length > 0 && selectedOrderRows.every(o => canTransitionOrderStatus(o.statut, 'shipped'))
  const canBulkDeliver = selectedOrderRows.length > 0 && selectedOrderRows.every(o => canTransitionOrderStatus(o.statut, 'delivered'))
  const canBulkCancel = selectedOrderRows.length > 0 && selectedOrderRows.every(o => canTransitionOrderStatus(o.statut, 'cancelled'))

  // ── Actions groupées ──
  function toggleSelect(id) {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)))
    }
  }

  async function bulkSetStatus(statut) {
    if (selectedOrders.size === 0) return

    const ordersToUpdate = orders.filter(o => selectedOrders.has(o.id))
    const invalidOrders = ordersToUpdate.filter(o => !canTransitionOrderStatus(o.statut, statut))

    if (invalidOrders.length > 0) {
      const names = invalidOrders.slice(0, 3).map(o => `#${o.id?.slice(0, 8).toUpperCase()}`).join(', ')
      const suffix = invalidOrders.length > 3 ? ` +${invalidOrders.length - 3}` : ''
      onToast && onToast(`⚠️ Transition impossible pour ${names}${suffix}`, 'error')
      return
    }

    if (!window.confirm(`Passer ${selectedOrders.size} commande${selectedOrders.size > 1 ? 's' : ''} à « ${STATUT_COLORS[statut]?.label || statut} » ?`)) return
    setBulkLoading(true)

    const { error } = await supabase.from('orders')
      .update({ statut })
      .in('id', Array.from(selectedOrders))

    if (error) {
      onToast && onToast('❌ ' + error.message, 'error')
      setBulkLoading(false)
      return
    }

    setOrders(prev => prev.map(o =>
      selectedOrders.has(o.id) ? { ...o, statut } : o
    ))

    if (statut === 'delivered') {
      for (const order of ordersToUpdate) {
        sendCapiEvent({
          eventName: 'Purchase',
          orderId: order.id,
          eventId: `${order.id}-purchase`,
        }, true).catch(e => console.error(`❌ CAPI Purchase (${order.id}):`, e))
      }
    }

    const successLabel = {
      confirmed: 'confirmées',
      shipped: 'expédiées',
      delivered: 'livrées',
      cancelled: 'annulées',
    }[statut] || 'mises à jour'

    onToast && onToast(`✅ ${selectedOrders.size} commande${selectedOrders.size > 1 ? 's' : ''} ${successLabel}`, 'default')
    setSelectedOrders(new Set())
    setBulkLoading(false)
  }

  async function bulkDelete() {
    if (selectedOrders.size === 0) return
    if (!window.confirm(`Supprimer ${selectedOrders.size} commandes définitivement ?`)) return
    setBulkLoading(true)
    const { error } = await supabase.from('orders').delete().in('id', Array.from(selectedOrders))
    if (error) {
      onToast && onToast('❌ ' + error.message, 'error')
      setBulkLoading(false)
      return
    }
    setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)))
    onToast && onToast(`🗑️ ${selectedOrders.size} commandes supprimées`, 'default')
    setSelectedOrders(new Set())
    setBulkLoading(false)
  }

  function printSelected() {
    const toPrint = orders.filter(o => selectedOrders.has(o.id))
    if (toPrint.length === 0) { onToast && onToast("Sélectionne des commandes d\'abord", "error"); return }
    const html = toPrint.map(order => {
      const items = (() => { try { return typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []) } catch { return [] } })()
      return `
        <div style="border:2px solid #333; border-radius:10px; padding:20px; margin-bottom:20px; page-break-inside:avoid;">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <div>
              <div style="font-size:18px; font-weight:900;">Wazyo</div>
              <div style="font-size:11px; color:#666;">Boutique en ligne · Algérie</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px; font-weight:700;">N° ${escapeHtml(order.id)}</div>
              <div style="font-size:11px; color:#666;">${new Date(order.created_at).toLocaleDateString('fr-DZ')}</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; background:#f9f9f9; padding:12px; border-radius:8px;">
            <div><strong>Client :</strong> ${escapeHtml(order.nom_client)}</div>
            <div><strong>Tél :</strong> ${escapeHtml(order.telephone)}</div>
            <div><strong>Wilaya :</strong> ${escapeHtml(order.wilaya)}</div>
            <div><strong>Commune :</strong> ${escapeHtml(order.commune)}</div>
            <div><strong>Adresse :</strong> ${escapeHtml(order.adresse || '—')}</div>
            <div><strong>Livraison :</strong> ${order.mode_livraison === 'bureau' ? '📦 Bureau' : '🏠 Domicile'}</div>
          </div>
          <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
            <tr style="background:#333; color:white;">
              <th style="padding:7px; text-align:left; border-radius:4px 0 0 4px;">Produit</th>
              <th style="padding:7px; text-align:center;">Qté</th>
              <th style="padding:7px; text-align:right; border-radius:0 4px 4px 0;">Prix</th>
            </tr>
            ${items.map((it, i) => `
              <tr style="background:${i%2?'#f5f5f5':'white'}">
                <td style="padding:7px; border-bottom:1px solid #eee;">${escapeHtml(it.nom)}</td>
                <td style="padding:7px; text-align:center; border-bottom:1px solid #eee;">×${escapeHtml(String(it.qty))}</td>
                <td style="padding:7px; text-align:right; border-bottom:1px solid #eee; font-weight:700;">${(it.prix * it.qty).toLocaleString()} DA</td>
              </tr>
            `).join('')}
          </table>
          <div style="text-align:right; padding:10px; background:#f0f0f0; border-radius:8px;">
            <div style="font-size:12px; color:#666;">Frais livraison : ${(order.frais_livraison || 0).toLocaleString()} DA</div>
            <div style="font-size:18px; font-weight:900; color:#000;">TOTAL : ${Number(order.total).toLocaleString()} DA</div>
          </div>
          ${order.note ? `<div style="margin-top:8px; font-size:12px; color:#666;">📝 Note : ${escapeHtml(order.note)}</div>` : ''}
        </div>
      `
    }).join('')

    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Factures Wazyo</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        @media print {
          @page { margin: 15mm; }
          .no-print { display: none; }
        }
      </style>
      </head><body>
      <div class="no-print" style="text-align:center; margin-bottom:20px;">
        <button onclick="window.print()" style="background:#000; color:white; border:none; padding:12px 32px; border-radius:8px; font-size:15px; cursor:pointer; margin-right:10px;">🖨️ Imprimer tout (${toPrint.length} factures)</button>
        <button onclick="window.close()" style="background:#eee; border:none; padding:12px 24px; border-radius:8px; cursor:pointer;">✕ Fermer</button>
      </div>
      ${html}
      </body></html>
    `)
    win.document.close()
  }

  async function setStatus(id, statut) {
    const order = orders.find(o => o.id === id)
    if (!order) return

    if (!canTransitionOrderStatus(order.statut, statut)) {
      onToast && onToast(`⚠️ Impossible : ${STATUT_COLORS[order.statut]?.label || order.statut} → ${STATUT_COLORS[statut]?.label || statut}`, 'error')
      return
    }

    const { error } = await supabase.from('orders').update({ statut }).eq('id', id)
    if (error) { onToast && onToast('❌ ' + error.message, 'error'); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, statut } : o))

    // "Purchase" envoyé à Meta seulement ici — à la vraie livraison confirmée,
    // pas à la simple commande.
    if (statut === 'delivered') {
      sendCapiEvent({
        eventName: 'Purchase',
        orderId: order.id,
        eventId: `${order.id}-purchase`,
      }, true).catch(e => console.error(`❌ CAPI Purchase (${order.id}):`, e))
    }

    const successLabel = {
      confirmed: 'confirmée',
      shipped: 'expédiée',
      delivered: 'livrée',
      cancelled: 'annulée',
    }[statut] || 'mise à jour'
    onToast && onToast(`✅ Commande ${successLabel}`, 'default')
  }

  async function delOrder(id) {
    if (!confirm('Supprimer cette commande ?')) return
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) { onToast && onToast('❌ ' + error.message, 'error'); return }
    setOrders(prev => prev.filter(o => o.id !== id))
    onToast('🗑️ Commande supprimée')
  }

  const stats = {
    total: orders.length,
    new: orders.filter(o => o.statut === 'new').length,
    confirmed: orders.filter(o => o.statut === 'confirmed').length,
    ca: orders.filter(o => o.statut !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0),
  }

  // Stats avancées
  const wilayaCount = {}
  orders.forEach(o => { wilayaCount[o.wilaya] = (wilayaCount[o.wilaya]||0)+1 })
  const topWilayas = Object.entries(wilayaCount).sort((a,b)=>b[1]-a[1]).slice(0,5)

  const prodCount = {}
  orders.forEach(o => {
    const items = (() => { try { return typeof o.items==='string'?JSON.parse(o.items):(o.items||[]) } catch{return[]} })()
    items.forEach(i => { prodCount[i.nom] = (prodCount[i.nom]||0)+i.qty })
  })
  const topProds = Object.entries(prodCount).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Ventes par jour (7 derniers jours)
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-i)
    const key = d.toISOString().slice(0,10)
    const label = d.toLocaleDateString('fr-DZ',{weekday:'short'})
    const ca = orders.filter(o => o.created_at?.slice(0,10)===key && o.statut!=='cancelled')
                      .reduce((s,o)=>s+Number(o.total||0),0)
    return { key, label, ca }
  }).reverse()
  const maxCA = Math.max(...last7.map(d=>d.ca), 1)

  // ── Bannière défilante ──
  async function loadBanner() {
    const { data } = await supabase.from('banner_messages').select('*').order('position', { ascending: true })
    setBannerMsgs(data || [])
  }

  async function addMsg() {
    const msg = newMsg.trim()
    if (!msg) return
    const pos = (bannerMsgs.length + 1)
    await supabase.from('banner_messages').insert({ message: msg, actif: true, position: pos })
    setNewMsg('')
    loadBanner()
  }

  async function toggleMsg(id, actif) {
    await supabase.from('banner_messages').update({ actif }).eq('id', id)
    setBannerMsgs(prev => prev.map(m => m.id === id ? { ...m, actif } : m))
  }

  async function deleteMsg(id) {
    await supabase.from('banner_messages').delete().eq('id', id)
    setBannerMsgs(prev => prev.filter(m => m.id !== id))
  }

  async function moveMsg(id, dir) {
    const idx = bannerMsgs.findIndex(m => m.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= bannerMsgs.length) return
    const a = bannerMsgs[idx], b = bannerMsgs[swapIdx]
    await supabase.from('banner_messages').update({ position: b.position }).eq('id', a.id)
    await supabase.from('banner_messages').update({ position: a.position }).eq('id', b.id)
    loadBanner()
  }

  // Chargement promos
  async function loadPromos() {
    const { data } = await supabase.from('promos').select('*').order('created_at', { ascending:false })
    setPromos(data||[])
  }

  async function addPromo() {
    const code = newPromo.code.trim().toUpperCase()
    if (!code) return
    await supabase.from('promos').insert({
      code, reduction: Number(newPromo.reduction),
      max_uses: newPromo.max_uses ? Number(newPromo.max_uses) : null,
      actif: true, uses: 0,
    })
    setNewPromo({ code:'', reduction:10, max_uses:'' })
    loadPromos()
    loadBanner()
  }

  async function togglePromo(id, actif) {
    await supabase.from('promos').update({ actif }).eq('id', id)
    setPromos(prev => prev.map(p => p.id===id ? {...p, actif} : p))
  }

  async function deletePromo(id) {
    await supabase.from('promos').delete().eq('id', id)
    setPromos(prev => prev.filter(p => p.id!==id))
  }

  // ── Export Excel ──
  function exportExcel() {
    const rows = orders.map(o => {
      const items = (() => { try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items||[]) } catch { return [] } })()
      return {
        'N° Commande':      o.id,
        'Date':             new Date(o.created_at).toLocaleDateString('fr-DZ'),
        'Heure':            new Date(o.created_at).toLocaleTimeString('fr-DZ', { hour:'2-digit', minute:'2-digit' }),
        'Client':           o.nom_client,
        'Téléphone':        o.telephone,
        'Wilaya':           o.wilaya,
        'Commune':          o.commune,
        'Adresse':          o.adresse || '',
        'Mode livraison':   o.mode_livraison === 'bureau' ? 'Bureau' : 'Domicile',
        'Articles':         items.map(i => `${i.nom} x${i.qty}`).join(' | '),
        'Sous-total (DA)':  items.reduce((s,i) => s + Number(i.prix)*i.qty, 0),
        'Frais liv. (DA)':  o.frais_livraison || 0,
        'Total (DA)':       o.total,
        'Statut':           o.statut,
        'Note':             o.note || '',
      }
    })

    // Générer CSV (compatible Excel)
    const cols = Object.keys(rows[0] || {})
    const bom = '\uFEFF' // BOM pour UTF-8 avec accents
    const csv = bom + [
      cols.join(';'),
      ...rows.map(r => cols.map(c => {
        const v = String(r[c] || '').replace(/"/g, '""')
        return v.includes(';') || v.includes('\n') ? `"${v}"` : v
      }).join(';'))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `wazyo-commandes-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onToast && onToast(`✅ ${rows.length} commandes exportées`, 'default')
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
      if (error) {
        console.error('Erreur update produit — message:', error.message, '| details:', error.details, '| hint:', error.hint, '| code:', error.code)
        onToast('❌ ' + (error.message || error.hint || 'Erreur sauvegarde'), 'error')
        return
      }
    } else {
      const { error } = await supabase.from('products').insert({ ...data, is_active: true, display_order: products.length + 1 })
      if (error) {
        console.error('Erreur insert produit — message:', error.message, '| details:', error.details, '| hint:', error.hint, '| code:', error.code)
        onToast('❌ ' + (error.message || error.hint || 'Erreur ajout'), 'error')
        return
      }
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
          Wazyo — Admin
        </div>
        <div className="adm-tabs">
          {[['orders','📋 Commandes'],['clients','👥 Clients'],['products','📦 Produits'],['stats','📊 Stats'],['promos','🎟️ Promos'],['banner','📢 Bannière'],['images','🗜️ Images'],['livraison','🚚 Livraison'],['theme','🎨 Thème'],['settings','⚙️ Paramètres']].map(([k,l]) => (
            <button key={k} className={`adm-tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button className="adm-logout" onClick={onLogout}>Déconnexion</button>
      </div>

      <div className="adm-body">
        {/* Barre actions rapides */}
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <button
            onClick={async () => {
              await resumeQuotidien(orders, products)
              onToast && onToast('📊 Résumé envoyé sur Telegram !', 'default')
            }}
            style={{
              background:'rgba(201,168,76,.12)', border:'1px solid rgba(201,168,76,.25)',
              borderRadius:8, padding:'7px 14px',
              color:'#C9A84C', fontSize:12, fontWeight:800, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
            }}
          >📊 Résumé Telegram maintenant</button>

          <button
            onClick={async () => {
              // Vérifier tous les produits en stock bas
              const bas = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock <= 5)
              if (bas.length === 0) {
                onToast && onToast('✅ Tous les stocks sont OK !', 'default')
                return
              }
              for (const p of bas) await alertStockBas(p, p.stock)
              onToast && onToast(`⚠️ ${bas.length} alerte(s) stock envoyée(s) sur Telegram`, 'default')
            }}
            style={{
              background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)',
              borderRadius:8, padding:'7px 14px',
              color:'#fca5a5', fontSize:12, fontWeight:800, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
            }}
          >⚠️ Vérifier stocks maintenant</button>
        </div>

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
              <button
                onClick={exportExcel}
                disabled={orders.length === 0}
                style={{
                  background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)',
                  borderRadius: 8, padding: '6px 14px',
                  color: '#86efac', fontSize: 12, fontWeight: 800,
                  cursor: orders.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >📥 Excel ({orders.length})</button>
            </div>

            {/* ── BARRE ACTIONS GROUPÉES ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0', marginBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,.06)',
              flexWrap: 'wrap',
            }}>
              {/* Tout sélectionner */}
              <button onClick={selectAll} style={{
                background: selectedOrders.size > 0 ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.05)',
                border: `1px solid ${selectedOrders.size > 0 ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,.1)'}`,
                borderRadius: 8, padding: '5px 12px',
                color: selectedOrders.size > 0 ? '#C9A84C' : 'rgba(255,255,255,.4)',
                fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0
                  ? '☑ Tout désélect.' : `☐ Tout sélect. (${filteredOrders.length})`}
              </button>

              {/* Actions — visibles seulement si sélection */}
              {selectedOrders.size > 0 && (
                <>
                  <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {selectedOrders.size} sélectionnée{selectedOrders.size > 1 ? 's' : ''}
                  </div>

                  {canBulkConfirm && (
                    <button onClick={() => bulkSetStatus('confirmed')} disabled={bulkLoading} style={{
                      background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)',
                      borderRadius: 8, padding: '5px 12px',
                      color: '#86efac', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>✅ Confirmer tout</button>
                  )}

                  {canBulkShip && (
                    <button onClick={() => bulkSetStatus('shipped')} disabled={bulkLoading} style={{
                      background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.25)',
                      borderRadius: 8, padding: '5px 12px',
                      color: '#c4b5fd', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>🚚 Expédier tout</button>
                  )}

                  {canBulkDeliver && (
                    <button onClick={() => bulkSetStatus('delivered')} disabled={bulkLoading} style={{
                      background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)',
                      borderRadius: 8, padding: '5px 12px',
                      color: '#93c5fd', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>📦 Livrer tout</button>
                  )}

                  {canBulkCancel && (
                    <button onClick={() => bulkSetStatus('cancelled')} disabled={bulkLoading} style={{
                      background: 'rgba(252,165,165,.10)', border: '1px solid rgba(252,165,165,.22)',
                      borderRadius: 8, padding: '5px 12px',
                      color: '#fca5a5', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>❌ Annuler tout</button>
                  )}

                  <button onClick={printSelected} style={{
                    background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)',
                    borderRadius: 8, padding: '5px 12px',
                    color: '#C9A84C', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>🖨️ Imprimer ({selectedOrders.size})</button>

                  <button onClick={bulkDelete} disabled={bulkLoading} style={{
                    background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
                    borderRadius: 8, padding: '5px 12px',
                    color: '#fca5a5', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                    marginLeft: 'auto',
                  }}>🗑️ Supprimer</button>
                </>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty"><div style={{fontSize:40}}>📭</div><p>Aucune commande trouvée.</p></div>
            ) : filteredOrders.map(o => {
              const items = (() => { try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items||[]) } catch { return [] } })()
              const isOpen = expanded === o.id
              const sc = STATUT_COLORS[o.statut] || { bg:'#2a2a2a', color:'#aaa', label: o.statut }
              const modeLiv = o.mode_livraison || 'domicile'

              return (
                <div key={o.id} className="ocard" style={{
                  border: selectedOrders.has(o.id) ? '1px solid rgba(201,168,76,.5)' : undefined,
                  background: selectedOrders.has(o.id) ? 'rgba(201,168,76,.04)' : undefined,
                }}>
                  <div className="ocard-hdr" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Checkbox sélection */}
                    <div
                      onClick={e => { e.stopPropagation(); toggleSelect(o.id) }}
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${selectedOrders.has(o.id) ? '#C9A84C' : 'rgba(255,255,255,.2)'}`,
                        background: selectedOrders.has(o.id) ? '#C9A84C' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 12, color: '#000', fontWeight: 900,
                        transition: 'all .15s',
                      }}
                    >{selectedOrders.has(o.id) ? '✓' : ''}</div>
                  <div style={{ flex: 1 }} onClick={() => setExpanded(isOpen ? null : o.id)}>
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

                        {canTransitionOrderStatus(o.statut, 'confirmed') && o.statut === 'new' && (
                          <button className="act-btn" onClick={() => setStatus(o.id,'confirmed')}>✅ Confirmer</button>
                        )}
                        {canTransitionOrderStatus(o.statut, 'shipped') && (
                          <button className="act-btn" onClick={() => setStatus(o.id,'shipped')}>🚚 Expédier</button>
                        )}
                        {canTransitionOrderStatus(o.statut, 'delivered') && (
                          <button className="act-btn" onClick={() => setStatus(o.id,'delivered')}>📦 Livrer</button>
                        )}
                        {canTransitionOrderStatus(o.statut, 'cancelled') && (
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

        {/* ── CLIENTS TAB (CRM) ── */}
        {tab === 'clients' && <ClientsCRM orders={orders} onToast={onToast} />}

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

        {/* ── BANNIÈRE TAB ── */}
        {tab === 'banner' && (
          <div>
            <h3 style={{ color: 'white', fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
              📢 Messages de la bannière défilante
            </h3>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginBottom: 20 }}>
              Ces messages s'affichent en haut du site en défilement. Active/désactive ou change l'ordre.
            </p>

            {/* Aperçu live */}
            <div style={{
              background: 'linear-gradient(90deg, #0a0a0a 0%, #1a1500 50%, #0a0a0a 100%)',
              border: '1px solid rgba(201,168,76,.2)', borderRadius: 10,
              height: 36, overflow: 'hidden', position: 'relative', marginBottom: 24,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', height: '100%',
                animation: 'bannerScroll 20s linear infinite',
                whiteSpace: 'nowrap',
              }}>
                {[...bannerMsgs.filter(m => m.actif), ...bannerMsgs.filter(m => m.actif)].map((m, i) => (
                  <span key={i} style={{ padding: '0 40px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>
                    {m.message} <span style={{ color: 'rgba(201,168,76,.4)' }}>✦</span>
                  </span>
                ))}
              </div>
              <style>{`@keyframes bannerScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
            </div>

            {/* Ajouter un message */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                style={{
                  flex: 1, background: '#1a1a1a', border: '1px solid #333',
                  borderRadius: 8, padding: '10px 14px', color: 'white',
                  fontSize: '16px', outline: 'none',
                }}
                placeholder="Ex: 🔥 Offre spéciale — livraison gratuite ce weekend !"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMsg()}
              />
              <button
                className="act-btn"
                style={{ background: 'var(--br)', color: '#000', border: 'none', fontWeight: 800, padding: '0 20px', whiteSpace: 'nowrap' }}
                onClick={addMsg}
              >+ Ajouter</button>
            </div>

            {/* Liste des messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bannerMsgs.map((m, idx) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: m.actif ? '#1a1a1a' : '#111',
                  border: `1px solid ${m.actif ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.06)'}`,
                  borderRadius: 10, padding: '10px 14px',
                  opacity: m.actif ? 1 : .5,
                }}>
                  {/* Ordre */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => moveMsg(m.id, 'up')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '2px' }}>▲</button>
                    <button onClick={() => moveMsg(m.id, 'down')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '2px' }}>▼</button>
                  </div>

                  {/* Message */}
                  <span style={{ flex: 1, fontSize: 13, color: m.actif ? 'white' : '#666' }}>{m.message}</span>

                  {/* Actions */}
                  <button
                    onClick={() => toggleMsg(m.id, !m.actif)}
                    style={{
                      background: m.actif ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.05)',
                      border: `1px solid ${m.actif ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.1)'}`,
                      borderRadius: 6, padding: '4px 10px',
                      color: m.actif ? '#86efac' : '#555',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >{m.actif ? '✅ Actif' : '⏸ Inactif'}</button>

                  <button
                    onClick={() => deleteMsg(m.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                  >🗑</button>
                </div>
              ))}
            </div>

            {bannerMsgs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
                Aucun message — ajoute-en un ci-dessus !
              </div>
            )}
          </div>
        )}


        {/* ── IMAGES TAB ── */}
        {tab === 'images' && (
          <ImageOptimizer products={products} supabase={supabase} />
        )}


        {/* ── LIVRAISON TAB ── */}
        {tab === 'livraison' && <LivraisonManager orders={orders} onToast={onToast} />}

        {/* ── THEME TAB ── */}
        {tab === 'theme' && <ThemeEditor onToast={onToast} />}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <AdminSettings onLogout={onLogout} onToast={onToast} />
        )}

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
