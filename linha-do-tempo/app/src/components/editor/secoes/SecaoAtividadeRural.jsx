import { MonthYearPicker } from '../../ui/MonthYearPicker'
import { Button } from '../../ui/Button'

const TIPOS = [
  { value: 'aposentadoria_rural', label: 'Aposentadoria Rural' },
  { value: 'hibrida', label: 'Aposentadoria Híbrida / Tempo de Contribuição' },
  { value: 'demais_rurais', label: 'Demais Benefícios Rurais' },
]

export function SecaoAtividadeRural({ timeline, onAtualizar, onGerar }) {
  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
          Tipo de Benefício
        </label>
        <select
          value={timeline.tipo_beneficio}
          onChange={e => onAtualizar({ tipo_beneficio: e.target.value })}
          className="select-on-dark"
          style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '6px' }}
        >
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <MonthYearPicker
        label={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>DER ou Fato Gerador</span>}
        helpText="Data da DER ou do fato gerador."
        mes={timeline.der_mes}
        ano={timeline.der_ano}
        onChange={(mes, ano) => onAtualizar({ der_mes: mes, der_ano: ano })}
      />

      <MonthYearPicker
        label={<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Início da Atividade Rural</span>}
        helpText="Início da contagem da carência rural."
        mes={timeline.inicio_mes}
        ano={timeline.inicio_ano}
        onChange={(mes, ano) => onAtualizar({ inicio_mes: mes, inicio_ano: ano })}
      />

      <Button variant="primary" onClick={onGerar} style={{ width: '100%', marginTop: '12px' }}>
        Gerar Linha do Tempo
      </Button>
    </div>
  )
}
