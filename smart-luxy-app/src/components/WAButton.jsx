import { useState, useEffect } from 'react'
import CONFIG from '../config'

export default function WAButton() {
  const [visible, setVisible] = useState(false)
  const [tooltip, setTooltip] = useState(true)
  const [pulse, setPulse] = useState(true)
  const [phone, setPhone] = useState('213556688810')

  useEffect(() => {
    // Numéro depuis config
    setPhone(CONFIG.whatsapp || '213556688810')
    const t1 = setTimeout(() => setVisible(true), 3000)
    const t2 = setTimeout(() => setTooltip(false), 9000)
    const t3 = setTimeout(() => setPulse(false), 12000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  if (!visible) return null

  const msg = encodeURIComponent("Bonjour Smart Luxy 👋 J'aimerais avoir plus d'informations sur vos produits.")

  return (
    <div style={{
      position: 'fixed', top: 70, right: 12,
      zIndex: 999, display: 'flex', flexDirection: 'column',
      alignItems: 'flex-end', gap: 8,
    }}>
      {tooltip && (
        <div style={{
          background: 'white', color: '#111',
          borderRadius: '12px 12px 2px 12px',
          padding: '10px 14px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,.3)',
          maxWidth: 200, lineHeight: 1.4,
          animation: 'tooltipIn .4s ease',
          position: 'relative',
        }}>
          <button onClick={() => setTooltip(false)} style={{
            position: 'absolute', top: 4, right: 6,
            background: 'none', border: 'none',
            fontSize: 12, color: '#aaa', cursor: 'pointer',
          }}>✕</button>
          💬 Une question ? On est là sur WhatsApp !
        </div>
      )}

      <a
        href={`https://wa.me/${phone}?text=${msg}`}
        target="_blank" rel="noreferrer"
        onClick={() => { setTooltip(false); setPulse(false) }}
        style={{
          width: 58, height: 58, background: '#25D366', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,.5)',
          textDecoration: 'none', transition: 'transform .2s, box-shadow .2s',
          position: 'relative',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(37,211,102,.7)' }}
        onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(37,211,102,.5)' }}
      >
        {pulse && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: '2px solid rgba(37,211,102,.5)',
            animation: 'waPulse 1.5s ease-out infinite',
          }} />
        )}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882a.5.5 0 00.61.61l6.098-1.474A11.927 11.927 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-4.994-1.367l-.357-.212-3.718.899.929-3.628-.232-.372A9.796 9.796 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
        </svg>
      </a>
      <style>{`
        @keyframes waPulse { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(1.6);opacity:0} }
        @keyframes tooltipIn { from{opacity:0;transform:translateY(8px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  )
}
