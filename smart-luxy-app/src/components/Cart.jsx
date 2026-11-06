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
    setPromoLoading(true)
    setPromoError('')
    setPromoData(null)

    const { data, error } = await supabase.rpc('validate_promo', {
      p_code: code,
      p_subtotal: total,
    })

    setPromoLoading(false)

    if (error || !data) {
      setPromoError('Code invalide ou expiré.')
      return
    }

    setPromoData({
      code: data.code,
      reduction: Number(data.reduction),
    })
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
          <p style={{ color: 'var(--g3)', marginBottom: 20 }}>Votre panier est vide</p>
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
              const mainImg = item.model_image || item.color_image || imgs[0]?.url || item.img
              const lineKey = String(item.cartKey || item.id)
              const variantLabel = item.model || item.modele
                ? `Modèle : ${item.model || item.modele}`
                : item.color || item.couleur
                  ? `Couleur : ${item.color || item.couleur}`
                  : ''
              return (
                <div key={lineKey} className="cart-item">
                  <div className="cart-item-img">
                    {mainImg ? <img src={mainImg} alt={item.nom} /> : item.emoji || '📦'}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.nom}</div>
                    {variantLabel && <div style={{ fontSize:11, color:'var(--g4)', marginTop:2 }}>{variantLabel}</div>}
                    <div className="cart-item-price">{fmt(Number(item.prix) * item.qty)}</div>
                    <div className="cart-item-ctrl">
                      <button onClick={() => onChangeQty(lineKey, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => onChangeQty(lineKey, +1)}>+</button>
                    </div>
                  </div>
                  <button className="cart-del" onClick={() => onRemove(lineKey)}>🗑</button>
                </div>
              )
            })}
          </div>

          <div className="cart-footer">

            {/* ── Badges de confiance ── */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 16,
              marginBottom: 14, padding: '10px 0',
              borderTop: '1px solid var(--g3)',
              borderBottom: '1px solid var(--g3)',
            }}>
              {[
                { icon: '🔒', text: 'Paiement sécurisé' },
                { icon: '🚚', text: 'Livraison rapide' },
                { icon: '↩️', text: 'Retour facile' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 16 }}>{b.icon}</span>
                  <span style={{ fontSize: 9, color: 'var(--g3)', fontWeight: 700, letterSpacing: '.03em', textAlign: 'center' }}>{b.text}</span>
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
                        flex: 1, background: 'var(--card2)',
                        border: '1px solid rgba(128,128,128,.3)',
                        borderRadius: 9, padding: '9px 12px',
                        color:'var(--g3)', fontSize: '16px', outline: 'none',
                        fontFamily: 'monospace', letterSpacing: '.05em',
                      }}
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      style={{
                        background: promoCode.trim() ? 'rgba(201,168,76,.2)' : 'var(--g3)',
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
                  <button onClick={removePromo} style={{ background: 'none', border: 'none', color: 'var(--g4)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              )}
            </div>

            {/* ── Récap prix ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              <div className="cart-total">
                <span style={{ color: 'var(--g3)', fontSize: 13 }}>Sous-total</span>
                <span style={{ fontSize: 14, color: 'var(--g3)' }}>{fmt(total)}</span>
              </div>
              {promoData && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#86efac' }}>Réduction ({promoData.reduction}%)</span>
                  <span style={{ fontSize: 13, color: '#86efac', fontWeight: 800 }}>-{fmt(reduction)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--g3)' }}>
                <strong style={{ fontSize: 16, color:'var(--g3)' }}>Total</strong>
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

            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--g3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              🔒 Paiement à la livraison — sans paiement en ligne
            </div>
          </div>
        </>
      )}

      <style>{`
        .cart-drawer{
          background:linear-gradient(180deg,#151821 0%,#090b10 100%)!important;
          border-left:1px solid rgba(213,183,112,.22)!important;
          box-shadow:-22px 0 60px rgba(0,0,0,.48)!important;
        }
        .cart-hdr{
          background:rgba(9,11,16,.94)!important;
          border-bottom:1px solid rgba(213,183,112,.18)!important;
          padding:20px 20px!important;
        }
        .cart-hdr h2{
          color:#f7f4ed!important;
          font-family:'Outfit',system-ui,sans-serif!important;
          font-size:20px!important;
          font-weight:800!important;
          letter-spacing:-.025em;
        }
        .cart-hdr .btn-close{
          border-color:rgba(213,183,112,.22)!important;
          border-radius:50%!important;
          background:rgba(255,255,255,.045)!important;
        }
        .cart-items{padding:17px!important;gap:12px!important;}
        .cart-item{
          border-color:rgba(213,183,112,.13)!important;
          border-radius:13px!important;
          background:linear-gradient(145deg,#171a22,#0e1117)!important;
          box-shadow:0 8px 24px rgba(0,0,0,.14);
        }
        .cart-item-img{
          width:76px!important;
          height:76px!important;
          border:1px solid rgba(213,183,112,.13);
          border-radius:10px!important;
          background:#11151e!important;
        }
        .cart-item-img img{
          object-fit:contain!important;
          padding:4px;
        }
        .cart-item-name{color:#f7f4ed!important;font-size:13px!important;}
        .cart-item-price{color:#e0c27d!important;font-size:14px!important;}
        .cart-item-ctrl{
          border-color:rgba(213,183,112,.19)!important;
          border-radius:8px!important;
          background:#0b0e14!important;
        }
        .cart-item-ctrl button{color:#e7d39b!important;}
        .cart-del{color:rgba(247,244,237,.44)!important;}
        .cart-footer{
          padding:16px 18px calc(16px + env(safe-area-inset-bottom))!important;
          border-top:1px solid rgba(213,183,112,.18)!important;
          background:rgba(9,11,16,.97)!important;
        }
        .cart-footer input{
          background:#0c0f15!important;
          border-color:rgba(213,183,112,.20)!important;
          color:#f7f4ed!important;
        }
        .cart-footer input:focus{
          border-color:rgba(213,183,112,.62)!important;
          box-shadow:0 0 0 3px rgba(213,183,112,.07);
        }
        .cart-footer .btn-confirm{
          min-height:49px;
          border:1px solid #e2c582!important;
          border-radius:10px!important;
          background:linear-gradient(135deg,#ead49c 0%,#c6a45f 100%)!important;
          color:#17130b!important;
          box-shadow:0 8px 20px rgba(0,0,0,.20);
        }
        .cart-total strong{color:#e4c77f!important;}
        @media(max-width:480px){
          .cart-drawer{width:100%!important;}
          .cart-items{padding:13px!important;}
          .cart-footer{padding-left:14px!important;padding-right:14px!important;}
          .cart-item-img{width:68px!important;height:68px!important;}
        }
      `}</style>
    </div>
  )
}