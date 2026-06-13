import { useState } from 'react'
import { MonthYearPicker } from '../../ui/MonthYearPicker'
import { Button } from '../../ui/Button'
import { Tooltip } from '../../ui/Tooltip'

export function SecaoIRs({ irs, onAdicionar, onRemover }) {
  const [mes, setMes] = useState(1)
  const [ano, setAno] = useState(2013)

  async function handleAdicionar(e) {
    e.preventDefault()
    await onAdicionar({ data_mes: mes, data_ano: ano })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Tooltip texto="Instrumentos ratificadores são provas rurais. Esse é o nome oficial trazido pela IN 128/2022." />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>O que é um IR?</span>
      </div>

      <form onSubmit={handleAdicionar}>
        <MonthYearPicker
          label={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Defina uma data</span>}
          helpText="Data dentro do intervalo da Atividade Rural."
          mes={mes} ano={ano}
          onChange={(m, a) => { setMes(m); setAno(a) }}
        />
        <Button type="submit" style={{ width: '100%', fontSize: '13px', padding: '6px', marginTop: '8px' }}>
          Adicionar IR
        </Button>
      </form>

      <div style={{ marginTop: '12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>IRs Cadastrados:</span>
        {irs.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>Nenhum IR</p>
        ) : irs.map(ir => (
          <div key={ir.id} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px 10px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #27ae60' }}>
            <span style={{ color: 'white', fontSize: '13px' }}>
              {String(ir.data_mes).padStart(2,'0')}/{ir.data_ano}
            </span>
            <button onClick={() => onRemover(ir.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
