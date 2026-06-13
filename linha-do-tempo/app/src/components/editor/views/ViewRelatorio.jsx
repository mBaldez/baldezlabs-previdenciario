import { Button } from '../../ui/Button'

const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatarMesAno(mes, ano) {
  return `${MESES_NOME[mes - 1]}/${ano}`
}

function calcularDuracao(iM, iA, fM, fA) {
  return (fA - iA) * 12 + (fM - iM)
}

export function ViewRelatorio({ timeline, vinculos, provas, irs }) {
  if (!timeline) return null

  const totalVinculos = vinculos.reduce(
    (acc, v) => acc + calcularDuracao(v.inicio_mes, v.inicio_ano, v.fim_mes, v.fim_ano),
    0
  )

  function handleExportarRelatorio() {
    const linhas = [
      `RELATÓRIO DE TEMPO DE CONTRIBUIÇÃO`,
      `Cliente: ${timeline.nome_cliente}`,
      `Tipo de Benefício: ${timeline.tipo_beneficio}`,
      ``,
      `VÍNCULOS URBANOS:`,
      ...vinculos.map(v =>
        `${v.origem} | ${formatarMesAno(v.inicio_mes, v.inicio_ano)} – ${formatarMesAno(v.fim_mes, v.fim_ano)} | ${calcularDuracao(v.inicio_mes, v.inicio_ano, v.fim_mes, v.fim_ano)} meses`
      ),
      `Total vínculos: ${totalVinculos} meses`,
    ]
    const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${timeline.nome_cliente.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#0B1F3A' }}>
          Relatório de Tempo de Contribuição
        </h3>
        <Button onClick={handleExportarRelatorio} style={{ fontSize: '13px', padding: '6px 14px' }}>
          Exportar relatório
        </Button>
      </div>

      {/* Tabela de Vínculos */}
      <h4 style={{ fontSize: '13px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Vínculos Urbanos
      </h4>
      {vinculos.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic', fontSize: '13px' }}>Nenhum vínculo cadastrado.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              {['Origem do Vínculo', 'Data Início', 'Data Fim', 'Contribuição'].map(h => (
                <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: 'bold' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vinculos.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px', fontSize: '13px' }}>{v.origem}</td>
                <td style={{ padding: '8px', fontSize: '13px' }}>{formatarMesAno(v.inicio_mes, v.inicio_ano)}</td>
                <td style={{ padding: '8px', fontSize: '13px' }}>{formatarMesAno(v.fim_mes, v.fim_ano)}</td>
                <td style={{ padding: '8px', fontSize: '13px' }}>{calcularDuracao(v.inicio_mes, v.inicio_ano, v.fim_mes, v.fim_ano)} meses</td>
              </tr>
            ))}
            <tr style={{ background: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #dee2e6' }}>
              <td colSpan={3} style={{ padding: '8px', fontSize: '13px' }}>Total:</td>
              <td style={{ padding: '8px', fontSize: '13px' }}>{totalVinculos} meses</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* IRs e Provas */}
      <h4 style={{ fontSize: '13px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Instrumentos Ratificadores e Provas de Retorno
      </h4>
      {irs.length === 0 && provas.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic', fontSize: '13px' }}>Nenhum IR ou PR cadastrado.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              {['Tipo', 'Data'].map(h => (
                <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: 'bold' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {irs.map(ir => (
              <tr key={ir.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px', fontSize: '13px', color: '#27ae60', fontWeight: 'bold' }}>IR</td>
                <td style={{ padding: '8px', fontSize: '13px' }}>{formatarMesAno(ir.data_mes, ir.data_ano)}</td>
              </tr>
            ))}
            {provas.map(pr => (
              <tr key={pr.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px', fontSize: '13px', color: '#e74c3c', fontWeight: 'bold' }}>PR</td>
                <td style={{ padding: '8px', fontSize: '13px' }}>{formatarMesAno(pr.data_mes, pr.data_ano)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
