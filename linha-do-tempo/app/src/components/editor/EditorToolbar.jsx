import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

const VIEWS = [
  { id: 'timeline', label: 'Linha do Tempo' },
  { id: 'irs', label: 'Descrever IRs e PRs' },
  { id: 'vinculos', label: 'Descrever Vinculos Urbanos' },
  { id: 'relatorio', label: 'Relatorio' },
]

const MODELOS = [
  { id: 'horizontal', label: 'Modelo horizontal' },
  { id: 'curvas', label: 'Modelo em curvas' },
]

export function EditorToolbar({
  nomeCliente,
  salvando,
  viewAtiva,
  onChangeView,
  modeloVisual,
  onChangeModelo,
  onExportar,
}) {
  const navigate = useNavigate()

  return (
    <div style={{
      background: 'var(--navy)',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      height: '52px',
      flexShrink: 0,
    }}>
      {/* Voltar */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none', border: 'none',
          color: 'var(--navy-tint)', cursor: 'pointer',
          fontSize: '18px', padding: '4px',
        }}
        title="Voltar a listagem"
      >
        &larr;
      </button>

      {/* Titulo */}
      <span style={{
        color: 'white', fontFamily: 'Georgia, serif',
        fontWeight: 'bold', fontSize: '15px', flex: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        Linha do Tempo &mdash; <span style={{ color: 'var(--gold)' }}>{nomeCliente}</span>
      </span>

      {/* Indicador de salvamento */}
      <span style={{ fontSize: '12px', color: salvando ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }}>
        {salvando ? 'Salvando...' : 'Salvo'}
      </span>

      {/* Dropdown Views */}
      <select
        value={viewAtiva}
        onChange={e => onChangeView(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.1)', color: 'white',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px',
          padding: '4px 8px', fontSize: '13px', cursor: 'pointer',
        }}
      >
        {VIEWS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>

      {/* Dropdown Modelos */}
      <select
        value={modeloVisual}
        onChange={e => onChangeModelo(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.1)', color: 'white',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px',
          padding: '4px 8px', fontSize: '13px', cursor: 'pointer',
        }}
      >
        {MODELOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>

      {/* Exportar */}
      <Button
        onClick={onExportar}
        style={{ background: '#27ae60', color: 'white', padding: '6px 14px', fontSize: '13px' }}
      >
        Exportar
      </Button>
    </div>
  )
}
