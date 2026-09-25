// ═══════════════════════════════════════════════════
//  COMPTE À REBOURS PROMO — Smart Luxy
//  S'affiche sur les produits avec badge Promo
// ═══════════════════════════════════════════════════
import { useState, useEffect } from 'react'

export default function CountdownTimer({ endHour = 23, endMin = 59 }) {
  const [time, setTime] = useState(null)

  useEffect(() => {
    function calc() {
      const now = new Date()
      const end = new Date()
      end.setHours(endHour, endMin, 59, 0)

      // Si l'heure de fin est passée → demain
      if (end <= now) end.setDate(end.getDate() + 1)

      const diff = Math.floor((end - now) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setTime({ h, m, s })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endHour, endMin])

  if (!time) return null

  const pad = n => String(n).padStart(2, '0')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(201,168,76,.07)',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 10, padding: '8px 12px',
      marginBottom: 14,
    }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, letterSpacing: '.04em' }}>
        OFFRE EXPIRE DANS
      </span>
      <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
        {[
          { val: pad(time.h), label: 'h' },
          { val: pad(time.m), label: 'm' },
          { val: pad(time.s), label: 's' },
        ].map(({ val, label }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{
              background: '#C9A84C',
              color: '#000',
              fontWeight: 900,
              fontSize: 15,
              borderRadius: 6,
              padding: '2px 7px',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 30,
              textAlign: 'center',
              letterSpacing: '-.02em',
            }}>{val}</div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontWeight: 700 }}>{label}</span>
            {i < 2 && <span style={{ color: '#C9A84C', fontWeight: 900, fontSize: 14, marginLeft: 1 }}>:</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
