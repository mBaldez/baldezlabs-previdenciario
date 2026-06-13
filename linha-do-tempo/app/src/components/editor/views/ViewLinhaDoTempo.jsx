import { calcularCarencia } from '../../../lib/calculo'
import { ModeloHorizontal } from '../visualizacao/ModeloHorizontal'
import { ModeloCurvas } from '../visualizacao/ModeloCurvas'
import { Legenda } from '../visualizacao/Legenda'

const TIPO_LABELS = {
  aposentadoria_rural: 'Aposentadoria Rural',
  hibrida: 'Aposentadoria Híbrida',
  demais_rurais: 'Demais Benefícios Rurais',
}

export function ViewLinhaDoTempo({ timeline, vinculos, provas, irs, incapacidades, modeloVisual }) {
  if (!timeline) return null

  const carencia = calcularCarencia({
    tipoBeneficio: timeline.tipo_beneficio,
    inicioAtividade: { mes: timeline.inicio_mes, ano: timeline.inicio_ano },
    der: { mes: timeline.der_mes, ano: timeline.der_ano },
    vinculosUrbanos: vinculos.map(v => ({
      origem: v.origem,
      inicio: { mes: v.inicio_mes, ano: v.inicio_ano },
      fim: { mes: v.fim_mes, ano: v.fim_ano },
    })),
    provasRetorno: provas.map(p => ({ mes: p.data_mes, ano: p.data_ano })),
    instrumentosRatificadores: irs.map(ir => ({ mes: ir.data_mes, ano: ir.data_ano })),
    beneficiosIncapacidade: incapacidades.map(inc => ({
      inicio: { mes: inc.inicio_mes, ano: inc.inicio_ano },
      fim: { mes: inc.fim_mes, ano: inc.fim_ano },
    })),
  })

  return (
    <div>
      {/* Visualização */}
      {modeloVisual === 'horizontal' ? (
        <ModeloHorizontal
          timeline={timeline}
          vinculos={vinculos}
          provas={provas}
          irs={irs}
          incapacidades={incapacidades}
        />
      ) : (
        <ModeloCurvas
          timeline={timeline}
          vinculos={vinculos}
          provas={provas}
          irs={irs}
          incapacidades={incapacidades}
        />
      )}

      {/* Legenda */}
      <Legenda />

      {/* Tabela de Carência */}
      <div style={{
        marginTop: '16px', background: '#f8f9fa',
        borderRadius: '6px', padding: '16px',
        border: '1px solid #e9ecef',
      }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#0B1F3A' }}>
          Carência — {TIPO_LABELS[timeline.tipo_beneficio]}
          {irs.length === 0 && (
            <span style={{ color: '#e74c3c', fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' }}>
              (Adicione pelo menos 1 IR para calcular)
            </span>
          )}
        </h3>

        {timeline.tipo_beneficio === 'hibrida' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Rural', valor: carencia.rural },
                { label: 'Urbano', valor: carencia.urbano },
                { label: 'Total', valor: carencia.total, destaque: true },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px 4px', color: '#555', fontSize: '14px' }}>{row.label}</td>
                  <td style={{
                    padding: '8px 4px', textAlign: 'right',
                    fontWeight: row.destaque ? 'bold' : 'normal',
                    color: row.destaque ? '#0B1F3A' : '#333',
                    fontSize: row.destaque ? '16px' : '14px',
                  }}>
                    {row.valor} meses
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 4px', color: '#555', fontSize: '14px' }}>Total</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', color: '#0B1F3A', fontSize: '16px' }}>
                  {carencia.total} meses
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
          Calculo estimado — IR expandindo o tempo rural nao esta formalmente derivado.
        </p>
      </div>
    </div>
  )
}
