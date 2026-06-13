import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTimelines } from '../hooks/useTimeline'
import { Button } from '../components/ui/Button'
import { MonthYearPicker } from '../components/ui/MonthYearPicker'

const TIPOS = [
  { value: 'aposentadoria_rural', label: 'Aposentadoria Rural' },
  { value: 'hibrida', label: 'Aposentadoria Hibrida / Tempo de Contribuicao' },
  { value: 'demais_rurais', label: 'Demais Beneficios Rurais' },
]

const mesAtual = new Date().getMonth() + 1
const anoAtual = new Date().getFullYear()

const FORM_INICIAL = {
  nome_cliente: '',
  tipo_beneficio: 'aposentadoria_rural',
  inicio_mes: 1,
  inicio_ano: 2011,
  der_mes: mesAtual,
  der_ano: anoAtual,
}

export function ListagemPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { timelines, carregando, criar, excluir } = useTimelines(user?.id)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [alerta, setAlerta] = useState(null)

  async function handleCriar(e) {
    e.preventDefault()
    if (!form.nome_cliente.trim()) return
    setSalvando(true)
    try {
      const nova = await criar(form)
      setForm(FORM_INICIAL)
      setAlerta({ tipo: 'sucesso', msg: 'Linha do Tempo criada!' })
      setTimeout(() => setAlerta(null), 3000)
      navigate(`/editor/${nova.id}`)
    } catch (err) {
      setAlerta({ tipo: 'erro', msg: err.message })
    }
    setSalvando(false)
  }

  async function handleExcluir(id, nome) {
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"?`)) return
    try {
      await excluir(id)
      setAlerta({ tipo: 'sucesso', msg: 'Linha do Tempo excluida!' })
      setTimeout(() => setAlerta(null), 3000)
    } catch (err) {
      setAlerta({ tipo: 'erro', msg: err.message })
    }
  }

  const nomeUsuario = user?.email?.split('@')[0] || 'Usuario'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--navy)', color: 'white',
        padding: '0 32px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'var(--gold)', fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: '18px' }}>
          Linha do Tempo Perfeita
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--navy-tint)' }}>{user?.email}</span>
          <Button variant="secondary" onClick={logout} style={{ padding: '4px 12px', fontSize: '13px' }}>
            Sair
          </Button>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Saudacao */}
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>
          Ola, <span style={{ color: 'var(--gold)' }}>{nomeUsuario}</span>!
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          Crie e edite suas Linhas do Tempo a seguir.
        </p>

        {/* Alerta */}
        {alerta && (
          <div style={{
            padding: '12px 16px', borderRadius: '4px', marginBottom: '20px',
            background: alerta.tipo === 'sucesso' ? '#d4edda' : '#fdecea',
            color: alerta.tipo === 'sucesso' ? '#155724' : '#721c24',
            border: `1px solid ${alerta.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>
            {alerta.msg}
          </div>
        )}

        {/* Form Nova Timeline */}
        <section style={{
          background: 'white', borderRadius: '8px',
          padding: '24px', marginBottom: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderTop: '3px solid var(--gold)',
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Nova Linha do Tempo</h2>
          <form onSubmit={handleCriar}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="nome">Nome do Cliente</label>
              <input
                id="nome"
                type="text"
                value={form.nome_cliente}
                onChange={e => setForm(f => ({ ...f, nome_cliente: e.target.value }))}
                placeholder="Ex.: Roberto Santos"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="tipo">Tipo de Beneficio</label>
              <select
                id="tipo"
                value={form.tipo_beneficio}
                onChange={e => setForm(f => ({ ...f, tipo_beneficio: e.target.value }))}
              >
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <MonthYearPicker
                label="Inicio da Atividade Rural"
                helpText="Inicio da contagem da carencia rural."
                mes={form.inicio_mes}
                ano={form.inicio_ano}
                onChange={(mes, ano) => setForm(f => ({ ...f, inicio_mes: mes, inicio_ano: ano }))}
              />
              <MonthYearPicker
                label="DER ou Fato Gerador"
                helpText="Data da DER ou do fato gerador."
                mes={form.der_mes}
                ano={form.der_ano}
                onChange={(mes, ano) => setForm(f => ({ ...f, der_mes: mes, der_ano: ano }))}
              />
            </div>

            <Button type="submit" disabled={salvando || !form.nome_cliente.trim()}>
              {salvando ? 'Criando...' : 'Criar!'}
            </Button>
          </form>
        </section>

        {/* Lista de Timelines */}
        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Suas Linhas do Tempo</h2>

          {carregando ? (
            <p style={{ color: '#666' }}>Carregando...</p>
          ) : timelines.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              Nenhuma Linha do Tempo cadastrada ainda.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {timelines.map(t => (
                <div key={t.id} style={{
                  background: 'white', borderRadius: '8px',
                  padding: '16px 20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderLeft: '4px solid var(--gold)',
                }}>
                  <div>
                    <strong style={{ fontSize: '16px', color: 'var(--navy)' }}>{t.nome_cliente}</strong>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                      {TIPOS.find(tp => tp.value === t.tipo_beneficio)?.label} •{' '}
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button onClick={() => navigate(`/editor/${t.id}`)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleExcluir(t.id, t.nome_cliente)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
