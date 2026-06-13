const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

export function MonthYearPicker({ label, helpText, mes, ano, onChange }) {
  const anoAtual = new Date().getFullYear()
  const anos = Array.from({ length: 60 }, (_, i) => anoAtual - i)

  return (
    <div style={{ marginBottom: '12px' }}>
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={mes}
          onChange={e => onChange(Number(e.target.value), ano)}
          style={{ flex: 1 }}
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={ano}
          onChange={e => onChange(mes, Number(e.target.value))}
          style={{ flex: 1 }}
        >
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {helpText && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{helpText}</p>
      )}
    </div>
  )
}
