import { useState, useEffect } from 'react'

// ══════════════════════════════════════════════
//  LOGO 1 — Couronne + Particules + Reveal
// ══════════════════════════════════════════════
function LogoCouronne() {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    tx: (Math.random() - .5) * 16,
    ty: (Math.random() - .5) * 16,
    dur: 2 + Math.random() * 2,
    delay: Math.random() * 2,
    opa: .25 + Math.random() * .5,
    size: 1.5 + Math.random() * 1.5,
  }))

  return (
    <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, lineHeight: 1 }}>
        {/* Particules */}
        <div style={{ position: 'absolute', inset: -8, pointerEvents: 'none' }}>
          {particles.map(p => (
            <div key={p.id} style={{
              position: 'absolute',
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              borderRadius: '50%',
              background: '#C9A84C',
              boxShadow: `0 0 ${p.size * 2}px rgba(201,168,76,${p.opa})`,
              animation: `particleFloat ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
              '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--opa': p.opa,
            }} />
          ))}
        </div>

        {/* Couronne */}
        <span style={{
          fontSize: 11, lineHeight: 1, marginBottom: 1,
          filter: 'drop-shadow(0 0 6px rgba(201,168,76,.7))',
          animation: 'crownFloat 3s ease-in-out infinite',
          color: '#C9A84C',
        }}>♛</span>

        {/* SMART */}
        <span style={{
          fontFamily: "'Cinzel', 'Fraunces', Georgia, serif",
          fontSize: 16, fontWeight: 900,
          letterSpacing: '4px',
          color: 'white',
          textShadow: '0 0 20px rgba(201,168,76,.12)',
          animation: 'smartReveal 1.2s cubic-bezier(.22,1,.36,1) both',
        }}>SMART</span>

        {/* Ligne dorée */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
          animation: 'lineExpand 1s .6s ease both',
          width: 0,
          animationFillMode: 'forwards',
        }} />

        {/* LUXY */}
        <span style={{
          fontFamily: "'Cormorant Garamond', 'Fraunces', Georgia, serif",
          fontSize: 12, fontWeight: 300,
          fontStyle: 'italic',
          letterSpacing: '6px',
          color: '#C9A84C',
          filter: 'drop-shadow(0 0 8px rgba(201,168,76,.4))',
          animation: 'luxyReveal 1s .9s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}>Luxy</span>
      </div>

      <style>{`
        @keyframes particleFloat {
          0%   { transform: translate(0,0) scale(1); opacity: var(--opa); }
          100% { transform: translate(var(--tx), var(--ty)) scale(1.6); opacity: calc(var(--opa) * 0.2); }
        }
        @keyframes crownFloat {
          0%,100% { transform: translateY(0) scale(1); }
          50%     { transform: translateY(-3px) scale(1.08); }
        }
        @keyframes smartReveal {
          from { opacity:0; letter-spacing:10px; }
          to   { opacity:1; letter-spacing:4px; }
        }
        @keyframes lineExpand { to { width: 58px; } }
        @keyframes luxyReveal {
          from { opacity:0; transform:translateY(4px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </a>
  )
}

// ══════════════════════════════════════════════
//  LOGO 2 — Cercle rotatif + Monogramme S
// ══════════════════════════════════════════════
function LogoCercle() {
  return (
    <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>

        {/* Halo */}
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,.15) 0%, transparent 70%)',
          animation: 'haloPulse 2.5s ease-in-out infinite',
        }} />

        {/* Anneau extérieur rotatif */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'rotateCW 5s linear infinite' }} viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="24" fill="none" stroke="url(#goldRing)" strokeWidth="1" strokeDasharray="12 6" opacity="0.7"/>
          <defs>
            <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E9C46A"/>
              <stop offset="50%" stopColor="#C9A84C"/>
              <stop offset="100%" stopColor="#a8872e"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Anneau intérieur contre-rotatif */}
        <svg style={{ position: 'absolute', inset: 5, width: 'calc(100% - 10px)', height: 'calc(100% - 10px)', animation: 'rotateCCW 8s linear infinite' }} viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="19" fill="none" stroke="rgba(201,168,76,.25)" strokeWidth="0.5"/>
          <circle cx="21" cy="1"  r="1.5" fill="#C9A84C" opacity="0.8"/>
        </svg>

        {/* Monogramme S */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel', 'Fraunces', Georgia, serif",
          fontSize: 26, fontWeight: 900,
          background: 'linear-gradient(135deg, #E9C46A, #C9A84C, #a8872e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'sPulse 3s ease-in-out infinite',
          zIndex: 2,
        }}>S</div>
      </div>

      {/* Texte à droite */}
      <div style={{ marginLeft: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontFamily: "'Cinzel', 'Fraunces', Georgia, serif",
          fontSize: 15, fontWeight: 900,
          letterSpacing: '3px',
          color: 'white',
          lineHeight: 1,
        }}>SMART</span>
        <div style={{ height: '0.5px', background: 'linear-gradient(90deg, #C9A84C, transparent)', width: 52 }} />
        <span style={{
          fontFamily: "'Cormorant Garamond', 'Fraunces', Georgia, serif",
          fontSize: 11, fontWeight: 300, fontStyle: 'italic',
          letterSpacing: '5px',
          color: '#C9A84C',
          lineHeight: 1,
          filter: 'drop-shadow(0 0 6px rgba(201,168,76,.35))',
        }}>Luxy</span>
      </div>

      <style>{`
        @keyframes rotateCW  { to { transform: rotate(360deg); } }
        @keyframes rotateCCW { to { transform: rotate(-360deg); } }
        @keyframes haloPulse {
          0%,100% { transform: scale(1); opacity: .6; }
          50%     { transform: scale(1.15); opacity: 1; }
        }
        @keyframes sPulse {
          0%,100% { filter: drop-shadow(0 0 6px rgba(201,168,76,.4)); }
          50%     { filter: drop-shadow(0 0 14px rgba(201,168,76,.8)); }
        }
      `}</style>
    </a>
  )
}

// ══════════════════════════════════════════════
//  HEADER PRINCIPAL
//  Change LOGO_CHOICE entre 1 et 2
// ══════════════════════════════════════════════
const LOGO_CHOICE = 2  // ← 1 = Couronne  |  2 = Cercle

export default function Header({ cartCount, onCartOpen, search, onSearch }) {
  return (
    <header className="hdr">
      <div className="hdr-inner">

        {LOGO_CHOICE === 1 ? <LogoCouronne /> : <LogoCercle />}

        <div className="hdr-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Rechercher..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        <button className="cart-btn" onClick={onCartOpen}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Panier
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>

      </div>
    </header>
  )
}
