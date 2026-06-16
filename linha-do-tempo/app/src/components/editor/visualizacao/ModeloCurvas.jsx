import { prepararDadosEixo } from '../../../lib/eixo'
import { EixoLinhaDoTempo, larguraAnos } from './EixoLinhaDoTempo'

const ANOS_POR_FILEIRA = 8
const COR_SETA = '#0B1F3A'
// Espaço lateral reservado para as curvas C saírem do bounds do SVG da fileira
const CURVA_OFFSET = 55

export function ModeloCurvas({ timeline, vinculos, provas, irs, incapacidades }) {
  if (!timeline) return null

  const { anoInicio, anoFim, categoriaPorMes, irsNumerados, provasConvertidas, der, inicioAtividade } =
    prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades })

  if (anoFim < anoInicio) return <p style={{ color: '#999' }}>Periodo invalido.</p>

  const fileiras = []
  for (let inicio = anoInicio; inicio <= anoFim; inicio += ANOS_POR_FILEIRA) {
    const fim = Math.min(inicio + ANOS_POR_FILEIRA - 1, anoFim)
    fileiras.push({ anoInicio: inicio, anoFim: fim })
  }

  return (
    <div id="area-timeline" style={{ background: 'white', borderRadius: '8px', padding: `12px ${CURVA_OFFSET}px` }}>
      <div style={{ marginBottom: '12px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#0B1F3A', fontSize: '14px' }}>
        Linha do Tempo
      </div>

      {fileiras.map((fileira, idx) => {
        const reversed = idx % 2 !== 0
        const largura = larguraAnos(fileira.anoInicio, fileira.anoFim)
        const irsFileira = irsNumerados.filter(ir => ir.ano >= fileira.anoInicio && ir.ano <= fileira.anoFim)
        const provasFileira = provasConvertidas.filter(p => p.ano >= fileira.anoInicio && p.ano <= fileira.anoFim)
        const temProximaFileira = idx < fileiras.length - 1

        return (
          <div key={idx}>
            <EixoLinhaDoTempo
              anoInicio={fileira.anoInicio}
              anoFim={fileira.anoFim}
              categoriaPorMes={categoriaPorMes}
              irs={irsFileira}
              provas={provasFileira}
              der={der}
              inicio={inicioAtividade}
              reversed={reversed}
            />

            {temProximaFileira && (
              // Wrapper com altura fixa reserva o espaço da curva de conexão
              <div style={{ position: 'relative', height: '60px' }}>
                {!reversed ? (
                  // Depois de fileira par (→): curva C no lado DIREITO
                  // SVG é CURVA_OFFSET px mais largo → curva contida, sem overflow
                  <svg
                    width={largura + CURVA_OFFSET}
                    height={60}
                    style={{ display: 'block' }}
                  >
                    <defs>
                      <marker id={`seta-${idx}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                        <path d="M8,0 L0,4 L8,8 Z" fill={COR_SETA} />
                      </marker>
                    </defs>
                    <path
                      d={`M ${largura} 2 C ${largura + CURVA_OFFSET - 10} 2, ${largura + CURVA_OFFSET - 10} 58, ${largura} 58`}
                      fill="none" stroke={COR_SETA} strokeWidth={2}
                      markerEnd={`url(#seta-${idx})`}
                    />
                  </svg>
                ) : (
                  // Depois de fileira ímpar (←): curva C no lado ESQUERDO
                  // SVG posicionado CURVA_OFFSET px à esquerda, mais largo → curva contida
                  <svg
                    width={largura + CURVA_OFFSET}
                    height={60}
                    style={{ position: 'absolute', top: 0, left: -CURVA_OFFSET }}
                  >
                    <defs>
                      <marker id={`seta-${idx}`} markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={COR_SETA} />
                      </marker>
                    </defs>
                    <path
                      d={`M ${CURVA_OFFSET} 2 C 10 2, 10 58, ${CURVA_OFFSET} 58`}
                      fill="none" stroke={COR_SETA} strokeWidth={2}
                      markerEnd={`url(#seta-${idx})`}
                    />
                  </svg>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
