import { useState } from 'react'
import { MonthYearPicker } from '../../ui/MonthYearPicker'
import { Button } from '../../ui/Button'
import { Tooltip } from '../../ui/Tooltip'

const FORM_VAZIO = { inicio_mes: 3, inicio_ano: 2018, fim_mes: 8, fim_ano: 2018 }

export function SecaoIncapacidade({ incapacidades, onAdicionar, onRemover }) {
  const [form, setForm] = useState(FORM_VAZIO)

  async function handleAdicionar(e) {
    e.preventDefault()
    await onAdicionar(form)
    setForm(FORM_VAZIO)
  }

  const labelStyle = { color: 'rgba(255,255,255,0.8)', fontSize: '13px' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Tooltip texto="Aqui você informará se o seu cliente já recebeu no passado algum auxílio-doença rural ou aposentadoria por invalidez rural. Esse período de gozo contará como carência. ATENÇÃO! Se o seu cliente recebeu auxílio-doença urbano ou aposentadoria por invalidez urbana você deve acrescentar esse período na linha do tempo como se fosse um vínculo urbano." />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>O que é Benefício por Incapacidade?</span>
      </div>

      <form onSubmit={handleAdicionar}>
        <MonthYearPicker
          label={<span style={labelStyle}>Data de Início</span>}
          mes={form.inicio_mes} ano={form.inicio_ano}
          onChange={(mes, ano) => setForm(f => ({ ...f, inicio_mes: mes, inicio_ano: ano }))}
        />
        <MonthYearPicker
          label={<span style={labelStyle}>Data de Fim</span>}
          mes={form.fim_mes} ano={form.fim_ano}
          onChange={(mes, ano) => setForm(f => ({ ...f, fim_mes: mes, fim_ano: ano }))}
        />
        <Button type="submit" style={{ width: '100%', fontSize: '13px', padding: '6px', marginTop: '8px' }}>
          Adicionar Incapacidade
        </Button>
      </form>

      <div style={{ marginTop: '12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Incapacidades Cadastradas:</span>
        {incapacidades.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>Nenhum item</p>
        ) : incapacidades.map(inc => (
          <div key={inc.id} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px 10px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #f39c12' }}>
            <span style={{ color: 'white', fontSize: '13px' }}>
              {String(inc.inicio_mes).padStart(2,'0')}/{inc.inicio_ano} → {String(inc.fim_mes).padStart(2,'0')}/{inc.fim_ano}
            </span>
            <button onClick={() => onRemover(inc.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
