import { useState } from 'react'

export default function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState('')

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ fontSize: 48 }}>🔐</div>
        <h1>Smart <span style={{ color: '#C9A84C' }}>Luxy</span></h1>
        <p>Panneau d'administration</p>
        <input
          type="password"
          placeholder="Mot de passe"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin(pw)}
          autoFocus
        />
        <button onClick={() => onLogin(pw)}>Connexion →</button>
      </div>
    </div>
  )
}
