import { prepararDadosEixo } from '../../../lib/eixo'
import { EixoLinhaDoTempo } from './EixoLinhaDoTempo'

export function ModeloHorizontal({ timeline, vinculos, provas, irs, incapacidades }) {
  if (!timeline) return null

  const { anoInicio, anoFim, categoriaPorMes, irsNumerados, provasConvertidas, der, inicioAtividade } =
    prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades })

  if (anoFim < anoInicio) return <p style={{ color: '#999' }}>Periodo invalido.</p>

  return (
    <div
      id="area-timeline"
      style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', padding: '8px' }}
    >
      <EixoLinhaDoTempo
        anoInicio={anoInicio}
        anoFim={anoFim}
        categoriaPorMes={categoriaPorMes}
        irs={irsNumerados}
        provas={provasConvertidas}
        der={der}
        inicio={inicioAtividade}
      />
    </div>
  )
}
