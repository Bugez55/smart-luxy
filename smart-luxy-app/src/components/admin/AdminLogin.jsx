import { useState } from 'react'

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!email || !pw) return
    setLoading(true)
    setError('')
    const ok = await onLogin(email, pw)
    if (!ok) setError('Identifiants incorrects')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bk)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: 360,
        background: 'var(--card)', border: '1px solid rgba(201,168,76,.2)',
        borderRadius: 18, padding: '32px 26px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 800, color: 'var(--br)' }}>
            Admin
          </div>
          <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 4 }}>Connexion sécurisée</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--g4)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--card2)', border: '1px solid rgba(128,128,128,.3)',
              borderRadius: 10, padding: '12px 14px', color: 'var(--g3)',
              fontSize: 16, outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--g4)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoComplete="current-password"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--card2)', border: '1px solid rgba(128,128,128,.3)',
              borderRadius: 10, padding: '12px 14px', color: 'var(--g3)',
              fontSize: 16, outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !pw}
          style={{
            width: '100%', padding: 13,
            background: (!loading && email && pw) ? 'linear-gradient(135deg,#C9A84C,#E9C46A)' : '#333',
            border: 'none', borderRadius: 12,
            color: (!loading && email && pw) ? '#000' : '#777',
            fontSize: 14, fontWeight: 800,
            cursor: (!loading && email && pw) ? 'pointer' : 'default',
          }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
