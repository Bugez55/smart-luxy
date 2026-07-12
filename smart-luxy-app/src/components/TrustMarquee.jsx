// ══════════════════════════════════════════════
//  BANDE DE CONFIANCE DÉFILANTE
// ══════════════════════════════════════════════
export default function TrustMarquee() {
  const items = ['🚚 Livraison 69 wilayas', '✨', '💵 Paiement à la livraison', '✨', '✅ Produits vérifiés', '✨', '💬 Support 7j/7', '✨']

  return (
    <div style={{
      overflow: 'hidden',
      borderTop: '1px solid rgba(255,255,255,.08)',
      borderBottom: '1px solid rgba(255,255,255,.08)',
      background: '#0f0e0c',
      padding: '18px 0',
    }}>
      <div style={{
        display: 'flex', width: 'max-content',
        gap: 40, whiteSpace: 'nowrap',
        animation: 'marqueeScroll 22s linear infinite',
        fontSize: 10, fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,.5)',
      }}>
        {[0, 1].map(group => (
          <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {items.map((it, i) => <span key={i} style={{ color: it === '✨' ? '#C9A84C' : undefined }}>{it}</span>)}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
