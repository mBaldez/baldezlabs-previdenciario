import { prepararDadosEixo } from '../../../lib/eixo'
import { mesParaAbsoluto } from '../../../lib/calculo'
import { EixoContent, larguraAnos, SVG_HEIGHT, BASE_Y } from './EixoLinhaDoTempo'

const ANOS_POR_FILEIRA = 8
const COR_SETA = '#0B1F3A'
// Lateral space reserved for C-curves to extend beyond the SVG viewport
const CURVA_OFFSET = 55
// Small vertical gap between row slots (purely cosmetic breathing room)
const ROW_GAP = 8

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

  const maxLargura = fileiras.reduce((max, f) => Math.max(max, larguraAnos(f.anoInicio, f.anoFim)), 0)
  const ROW_SLOT = SVG_HEIGHT + ROW_GAP
  const totalSVGHeight = fileiras.length * SVG_HEIGHT + Math.max(0, fileiras.length - 1) * ROW_GAP

  const derMesAbs = mesParaAbsoluto(der)
  const inicioMesAbs = mesParaAbsoluto(inicioAtividade)

  return (
    <div id="area-timeline" style={{ background: 'white', borderRadius: '8px', padding: `12px ${CURVA_OFFSET}px`, overflowX: 'auto' }}>
      <div style={{ marginBottom: '12px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#0B1F3A', fontSize: '14px' }}>
        Linha do Tempo
      </div>

      {/*
        Single SVG for all rows + C-curve connectors.
        overflow="visible" lets C-curves extend CURVA_OFFSET px beyond the SVG bounds
        into the container's padding area — no clipping issues.
      */}
      <svg
        width={maxLargura}
        height={totalSVGHeight}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Arrow for right-side C-curve (tip points left — into reversed row) */}
          <marker id="seta-dir" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M8,0 L0,4 L8,8 Z" fill={COR_SETA} />
          </marker>
          {/* Arrow for left-side C-curve (tip points right — into forward row) */}
          <marker id="seta-esq" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={COR_SETA} />
          </marker>
        </defs>

        {fileiras.map((fileira, idx) => {
          const yOffset = idx * ROW_SLOT
          const reversed = idx % 2 !== 0
          const largura = larguraAnos(fileira.anoInicio, fileira.anoFim)
          const irsFileira = irsNumerados.filter(ir => ir.ano >= fileira.anoInicio && ir.ano <= fileira.anoFim)
          const provasFileira = provasConvertidas.filter(p => p.ano >= fileira.anoInicio && p.ano <= fileira.anoFim)
          const temProximaFileira = idx < fileiras.length - 1

          // Restrict bar to exact user-specified bounds on first and last rows
          const mesInicioOverride = idx === 0 && inicioMesAbs ? inicioMesAbs : undefined
          const mesFimOverride = idx === fileiras.length - 1 && derMesAbs ? derMesAbs : undefined

          // Absolute y of bar center within the big SVG — used to anchor C-curves exactly
          const barY = yOffset + BASE_Y
          const nextBarY = (idx + 1) * ROW_SLOT + BASE_Y

          return (
            <g key={idx}>
              <g transform={`translate(0, ${yOffset})`}>
                <EixoContent
                  anoInicio={fileira.anoInicio}
                  anoFim={fileira.anoFim}
                  categoriaPorMes={categoriaPorMes}
                  irs={irsFileira}
                  provas={provasFileira}
                  der={der}
                  inicio={inicioAtividade}
                  reversed={reversed}
                  mesInicioOverride={mesInicioOverride}
                  mesFimOverride={mesFimOverride}
                />
              </g>

              {temProximaFileira && (() => {
                if (!reversed) {
                  // Right C-curve: connects right end of → row to right end of next ← row
                  const cx = largura + CURVA_OFFSET - 8
                  return (
                    <path
                      d={`M ${largura} ${barY} C ${cx} ${barY}, ${cx} ${nextBarY}, ${largura} ${nextBarY}`}
                      fill="none" stroke={COR_SETA} strokeWidth={2}
                      markerEnd="url(#seta-dir)"
                    />
                  )
                } else {
                  // Left C-curve: connects left end of ← row to left end of next → row
                  const cx = -(CURVA_OFFSET - 8)
                  return (
                    <path
                      d={`M 0 ${barY} C ${cx} ${barY}, ${cx} ${nextBarY}, 0 ${nextBarY}`}
                      fill="none" stroke={COR_SETA} strokeWidth={2}
                      markerEnd="url(#seta-esq)"
                    />
                  )
                }
              })()}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
