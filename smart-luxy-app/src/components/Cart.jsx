import { useState } from 'react'
import { supabase } from '../supabase'

function fmt(n) { return Number(n || 0).toLocaleString('fr-DZ') + ' DA' }

export default function Cart({ open, items, total, onClose, onRemove, onChangeQty, onOrder }) {
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const reduction = promoData ? Math.round(total * promoData.reduction / 100) : 0
  const totalFinal = total - reduction

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    setPromoLoading(true); setPromoError(''); setPromoData(null)
    const { data } = await supabase.from('promos').select('*').eq('code', code).eq('actif', true).single()
    setPromoLoading(false)
    if (!data) { setPromoError('Code invalide ou expiré.'); return }
    if (data.max_uses && data.uses >= data.max_uses) { setPromoError("Ce code a atteint sa limite d'utilisation."); return }
    setPromoData({ code: data.code, reduction: data.reduction })
    await supabase.from('promos').update({ uses: (data.uses || 0) + 1 }).eq('id', data.id)
  }

  function removePromo() { setPromoData(null); setPromoCode(''); setPromoError('') }

  return (
    <div className={`cart-drawer ${open ? 'on' : ''}`}>

      {/* Header */}
      <div className="cart-hdr">
        <h2>🛒 Mon panier {items.length > 0 && `(${items.reduce((s,i) => s+i.qty, 0)})`}</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <div style={{ fontSize: 52 }}>🛍️</div>
          <p style={{ color: 'rgba(255,255,255,.4)', marginBottom: 20 }}>Votre panier est vide</p>
          <button onClick={onClose} style={{
            background: 'linear-gradient(135deg,#C9A84C,#E9C46A)',
            border: 'none', borderRadius: 12, padding: '11px 24px',
            color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>🛍️ Découvrir nos produits</button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map(item => {
              const imgs = (() => { try { return typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []) } catch { return [] } })()
              const mainImg = imgs[0]?.url || item.img
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    {mainImg ? <img src={mainImg} alt={item.nom} /> : item.emoji || '📦'}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.nom}</div>
                    <div className="cart-item-price">{fmt(Number(item.prix) * item.qty)}</div>
                    <div className="cart-item-ctrl">
                      <button onClick={() => onChangeQty(item.id, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => onChangeQty(item.id, +1)}>+</button>
                    </div>
                  </div>
                  <button className="cart-del" onClick={() => onRemove(item.id)}>🗑</button>
                </div>
              )
            })}
          </div>

          <div className="cart-footer">

            {/* ── Badges de confiance ── */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 16,
              marginBottom: 14, padding: '10px 0',
              borderTop: '1px solid rgba(255,255,255,.05)',
              borderBottom: '1px solid rgba(255,255,255,.05)',
            }}>
              {[
                { icon: '🔒', text: 'Paiement sécurisé' },
                { icon: '🚚', text: 'Livraison rapide' },
                { icon: '↩️', text: 'Retour facile' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 16 }}>{b.icon}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', fontWeight: 700, letterSpacing: '.03em', textAlign: 'center' }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* ── Code promo ── */}
            <div style={{ marginBottom: 14 }}>
              {!promoData ? (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      placeholder="🎟️ Code promo"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }}
                      onKeyDown={e => e.key === 'Enter' && applyPromo()}
                      style={{
                        flex: 1, background: 'rgba(255,255,255,.05)',
                        border: '1px solid rgba(255,255,255,.1)',
                        borderRadius: 9, padding: '9px 12px',
                        color: 'white', fontSize: '16px', outline: 'none',
                        fontFamily: 'monospace', letterSpacing: '.05em',
                      }}
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      style={{
                        background: promoCode.trim() ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.04)',
                        border: '1px solid rgba(201,168,76,.3)',
                        borderRadius: 9, padding: '9px 14px',
                        color: promoCode.trim() ? '#C9A84C' : '#444',
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                      }}
                    >{promoLoading ? '…' : 'Appliquer'}</button>
                  </div>
                  {promoError && <div style={{ fontSize: 12, color: '#fca5a5', padding: '4px 2px' }}>❌ {promoError}</div>}
                </>
              ) : (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)',
                  borderRadius: 9, padding: '9px 12px',
                }}>
                  <span style={{ fontSize: 13, color: '#86efac', fontWeight: 700 }}>
                    🎟️ {promoData.code} — -{promoData.reduction}%
                  </span>
                  <button onClick={removePromo} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              )}
            </div>

            {/* ── Récap prix ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              <div className="cart-total">
                <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Sous-total</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>{fmt(total)}</span>
              </div>
              {promoData && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#86efac' }}>Réduction ({promoData.reduction}%)</span>
                  <span style={{ fontSize: 13, color: '#86efac', fontWeight: 800 }}>-{fmt(reduction)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <strong style={{ fontSize: 16, color: 'white' }}>Total</strong>
                <strong style={{ fontSize: 22, color: '#C9A84C' }}>{fmt(totalFinal)}</strong>
              </div>
            </div>

            {/* ── CTA ── */}
            <button className="btn-confirm" onClick={() => onOrder(promoData, totalFinal)} style={{
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ position: 'relative', zIndex: 1 }}>
                Commander maintenant →
              </span>
            </button>

            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              🔒 Paiement à la livraison — 100% sécurisé
            </div>
          </div>
        </>
      )}
    </div>
  )
}
