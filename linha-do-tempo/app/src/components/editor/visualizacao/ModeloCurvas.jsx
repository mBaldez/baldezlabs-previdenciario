import { prepararDadosEixo } from '../../../lib/eixo'
import { EixoLinhaDoTempo, larguraAnos } from './EixoLinhaDoTempo'

const ANOS_POR_FILEIRA = 8
const COR_SETA = '#0B1F3A'

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
    // Fix responsivo: overflow-x auto com padding lateral para acomodar as curvas boustrophedon
    <div id="area-timeline" style={{ background: 'white', borderRadius: '8px', padding: '12px 50px', overflowX: 'auto' }}>
      <div style={{ marginBottom: '12px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#0B1F3A', fontSize: '14px' }}>
        Linha do Tempo
      </div>

      {fileiras.map((fileira, idx) => {
        // Boustrophedon: fileiras ímpares (1, 3, 5...) com anos decrescentes (maiores à esquerda)
        const reversed = idx % 2 !== 0
        const largura = larguraAnos(fileira.anoInicio, fileira.anoFim)
        const irsFileira = irsNumerados.filter(ir => ir.ano >= fileira.anoInicio && ir.ano <= fileira.anoFim)
        const provasFileira = provasConvertidas.filter(p => p.ano >= fileira.anoInicio && p.ano <= fileira.anoFim)
        const temProximaFileira = idx < fileiras.length - 1

        return (
          <div key={idx} style={{ marginBottom: temProximaFileira ? '0' : '8px' }}>
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
              <svg
                width={largura}
                height={60}
                overflow="visible"
                style={{ display: 'block', overflow: 'visible' }}
              >
                <defs>
                  <marker id={`seta-curva-${idx}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill={COR_SETA} />
                  </marker>
                </defs>
                {!reversed ? (
                  // Após fileira par (→): curva em C no lado DIREITO, aponta para início da fileira ímpar (direita)
                  <path
                    d={`M ${largura} 4 C ${largura + 40} 4, ${largura + 40} 56, ${largura} 56`}
                    fill="none" stroke={COR_SETA} strokeWidth={2}
                    markerEnd={`url(#seta-curva-${idx})`}
                  />
                ) : (
                  // Após fileira ímpar (←): curva em C no lado ESQUERDO, aponta para início da fileira par (esquerda)
                  <path
                    d={`M 0 4 C -40 4, -40 56, 0 56`}
                    fill="none" stroke={COR_SETA} strokeWidth={2}
                    markerEnd={`url(#seta-curva-${idx})`}
                  />
                )}
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}
