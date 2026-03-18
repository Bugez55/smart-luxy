// ══════════════════════════════════════════════
//  PAGE 404 — Smart Luxy
// ══════════════════════════════════════════════
export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', textAlign: 'center',
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Halo décoratif */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 300,
        background: 'radial-gradient(ellipse, rgba(201,168,76,.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Numéro 404 */}
      <div style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: 'clamp(80px, 20vw, 140px)',
        fontWeight: 900, lineHeight: 1,
        background: 'linear-gradient(135deg, #E9C46A, #C9A84C, #a8872e)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: 8,
        animation: 'fadeUp .6s ease both',
      }}>404</div>

      {/* Icône */}
      <div style={{
        fontSize: 48, marginBottom: 20,
        animation: 'fadeUp .6s .1s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>🔍</div>

      {/* Texte */}
      <h1 style={{
        fontSize: 'clamp(18px, 5vw, 26px)', fontWeight: 900,
        color: 'white', marginBottom: 12,
        animation: 'fadeUp .6s .15s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>Page introuvable</h1>

      <p style={{
        fontSize: 14, color: 'rgba(255,255,255,.45)',
        maxWidth: 320, lineHeight: 1.7, marginBottom: 32,
        animation: 'fadeUp .6s .2s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>
        Cette page n'existe pas ou a été déplacée.<br/>
        Retourne à la boutique pour découvrir nos produits.
      </p>

      {/* Boutons */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
        animation: 'fadeUp .6s .25s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>
        <a href="/" style={{
          background: 'linear-gradient(135deg, #C9A84C, #E9C46A)',
          border: 'none', borderRadius: 12,
          padding: '13px 28px', color: '#000',
          fontSize: 14, fontWeight: 800,
          textDecoration: 'none', cursor: 'pointer',
          transition: 'transform .2s, box-shadow .2s',
          display: 'inline-block',
        }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 24px rgba(201,168,76,.35)' }}
          onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '' }}
        >🛍️ Retour à la boutique</a>

        <a href={`https://wa.me/${import.meta.env.VITE_WA_NUMBER || '213556688810'}`}
          target="_blank" rel="noreferrer"
          style={{
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 12, padding: '13px 24px',
            color: 'rgba(255,255,255,.7)',
            fontSize: 14, fontWeight: 700,
            textDecoration: 'none', display: 'inline-block',
          }}
        >💬 Nous contacter</a>
      </div>

      {/* Logo en bas */}
      <div style={{
        marginTop: 48, fontSize: 12,
        color: 'rgba(255,255,255,.15)',
        fontFamily: "'Fraunces', serif",
        letterSpacing: '.1em',
        animation: 'fadeUp .6s .3s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>SMART LUXY · ALGÉRIE</div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
