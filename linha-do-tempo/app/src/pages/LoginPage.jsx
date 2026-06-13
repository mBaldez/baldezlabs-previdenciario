import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await login(email, senha)
    if (error) setErro(error.message)
    setCarregando(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Logo/Titulo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'var(--navy)',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.2,
          }}>
            <span style={{ color: 'var(--gold)' }}>Linha do Tempo</span>
            <br />
            <span style={{ fontSize: '16px', color: 'var(--charcoal)', fontWeight: 'normal' }}>
              Perfeita
            </span>
          </div>
          <div style={{
            width: '40px', height: '2px',
            background: 'var(--gold)',
            margin: '12px auto 0',
          }} />
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <p style={{
              color: '#c0392b',
              fontSize: '13px',
              marginBottom: '16px',
              padding: '8px 12px',
              background: '#fdecea',
              borderRadius: '4px',
              border: '1px solid #c0392b',
            }}>
              {erro === 'Invalid login credentials'
                ? 'E-mail ou senha incorretos.'
                : erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: 'var(--navy)',
              border: 'none',
              padding: '12px',
              fontWeight: 'bold',
              fontSize: '15px',
              fontFamily: 'Georgia, serif',
              borderRadius: '4px',
              cursor: carregando ? 'not-allowed' : 'pointer',
              opacity: carregando ? 0.7 : 1,
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
