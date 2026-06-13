const ITENS = [
  { cor: '#e67e22', label: 'Carência (janelas de 90 meses)' },
  { cor: '#27ae60', label: 'Instrumentos Ratificadores (IR)' },
  { cor: '#3498db', label: 'Vínculo Urbano' },
  { cor: '#e74c3c', label: 'Prova de Retorno' },
  { cor: '#f1c40f', label: 'Gozo de Benefício por Incapacidade' },
]

export function Legenda() {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '16px',
      padding: '12px 0', marginTop: '12px',
      borderTop: '1px solid #eee',
    }}>
      {ITENS.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '14px', height: '14px',
            background: item.cor, borderRadius: '2px', flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', color: '#555' }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
