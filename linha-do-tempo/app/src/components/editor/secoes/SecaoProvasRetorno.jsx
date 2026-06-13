import { useState } from 'react'
import { MonthYearPicker } from '../../ui/MonthYearPicker'
import { Button } from '../../ui/Button'
import { Tooltip } from '../../ui/Tooltip'

export function SecaoProvasRetorno({ provas, onAdicionar, onRemover }) {
  const [mes, setMes] = useState(1)
  const [ano, setAno] = useState(2017)

  async function handleAdicionar(e) {
    e.preventDefault()
    await onAdicionar({ data_mes: mes, data_ano: ano })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Tooltip texto="Prova de retorno é qualquer prova rural posterior a cessação de um vínculo urbano maior de 120 dias no ano. Ela não retroage e reconhecerá o tempo rural somente a partir dela. Se você não coloca a prova de retorno após o vínculo urbano os Instrumentos Ratificadores não validarão o período rural corretamente." />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>O que é uma Prova de Retorno?</span>
      </div>

      <form onSubmit={handleAdicionar}>
        <MonthYearPicker
          label={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Data do Retorno</span>}
          mes={mes} ano={ano}
          onChange={(m, a) => { setMes(m); setAno(a) }}
        />
        <Button type="submit" style={{ width: '100%', fontSize: '13px', padding: '6px', marginTop: '8px' }}>
          Adicionar Prova de Retorno
        </Button>
      </form>

      <div style={{ marginTop: '12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Retornos Cadastrados:</span>
        {provas.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>Nenhum Retorno</p>
        ) : provas.map(p => (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px 10px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #e74c3c' }}>
            <span style={{ color: 'white', fontSize: '13px' }}>
              {String(p.data_mes).padStart(2,'0')}/{p.data_ano}
            </span>
            <button onClick={() => onRemover(p.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
