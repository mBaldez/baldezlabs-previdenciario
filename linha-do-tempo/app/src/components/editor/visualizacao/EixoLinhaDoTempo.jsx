import { mesParaAbsoluto } from '../../../lib/calculo'

export const ANO_WIDTH = 80
export const MES_WIDTH = ANO_WIDTH / 12
export const SVG_HEIGHT = 220
export const BASE_Y = 120
export const TICK_H = 20

export const COR = {
  vinculo: '#3498db',
  incapacidade: '#f1c40f',
  carencia: '#e67e22',
  semCobertura: '#BDC3C7',
  ir: '#27ae60',
  provaRetorno: '#e74c3c',
  der: '#e74c3c',
  navy: '#0B1F3A',
  navyTint: '#D0D8E0',
}

export function xParaMes(mesAbs, anoInicio) {
  return (mesAbs - anoInicio * 12 - 1) * MES_WIDTH
}

export function larguraAnos(anoInicio, anoFim) {
  return (anoFim - anoInicio + 1) * ANO_WIDTH
}

/**
 * Renderiza uma fileira do eixo da linha do tempo: anos/ticks, barra colorida
 * por categoria de mes, IRs numerados, Provas de Retorno, DER e Inicio.
 * Props ja "prontas" (ver lib/eixo.js prepararDadosEixo): categoriaPorMes e
 * irs sao calculados uma vez pelo wrapper e compartilhados entre fileiras.
 */
export function EixoLinhaDoTempo({ anoInicio, anoFim, categoriaPorMes, irs, provas, der, inicio }) {
  const totalWidth = larguraAnos(anoInicio, anoFim)
  const anos = Array.from({ length: anoFim - anoInicio + 1 }, (_, i) => anoInicio + i)

  const mesInicial = anoInicio * 12 + 1
  const mesFinal = anoFim * 12 + 12
  const meses = []
  for (let m = mesInicial; m <= mesFinal; m++) meses.push(m)

  const derMesAbs = mesParaAbsoluto(der)
  const inicioMesAbs = mesParaAbsoluto(inicio)
  const mostrarDer = derMesAbs >= mesInicial && derMesAbs <= mesFinal
  const mostrarInicio = inicioMesAbs >= mesInicial && inicioMesAbs <= mesFinal

  return (
    <svg width={totalWidth} height={SVG_HEIGHT} style={{ display: 'block', minWidth: '100%' }}>
      {/* Barra colorida por mes, sobre o eixo */}
      {meses.map(mesAbs => {
        const categoria = categoriaPorMes(mesAbs)
        return (
          <rect
            key={`mes-${mesAbs}`}
            x={xParaMes(mesAbs, anoInicio)} y={BASE_Y - 8}
            width={MES_WIDTH} height={16}
            fill={COR[categoria === 'sem_cobertura' ? 'semCobertura' : categoria]}
          />
        )
      })}

      {/* Ticks e labels dos anos */}
      {anos.map(ano => {
        const x = (ano - anoInicio) * ANO_WIDTH
        return (
          <g key={`tick-${ano}`}>
            <line x1={x} y1={BASE_Y - TICK_H} x2={x} y2={BASE_Y + TICK_H} stroke={COR.navy} strokeWidth={1} />
            <text x={x + ANO_WIDTH / 2} y={SVG_HEIGHT - 8} textAnchor="middle" fontSize={11} fill={COR.navy} fontFamily="Georgia, serif">
              {ano}
            </text>
          </g>
        )
      })}
      <line x1={totalWidth} y1={BASE_Y - TICK_H} x2={totalWidth} y2={BASE_Y + TICK_H} stroke={COR.navy} strokeWidth={1} />

      {/* IRs numerados */}
      {irs.map(ir => {
        const x = xParaMes(mesParaAbsoluto(ir), anoInicio) + MES_WIDTH / 2
        return (
          <g key={`ir-${ir.numero}`}>
            <line x1={x} y1={BASE_Y - 26} x2={x} y2={BASE_Y + 12} stroke={COR.ir} strokeWidth={2} />
            <circle cx={x} cy={BASE_Y - 34} r={8} fill={COR.ir} />
            <text x={x} y={BASE_Y - 34} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="white" fontWeight="bold">
              {ir.numero}
            </text>
          </g>
        )
      })}

      {/* Provas de Retorno */}
      {provas.map((pr, i) => {
        const x = xParaMes(mesParaAbsoluto(pr), anoInicio) + MES_WIDTH / 2
        return (
          <circle key={`pr-${i}`} cx={x} cy={BASE_Y} r={5} fill={COR.provaRetorno} stroke="white" strokeWidth={1.5} />
        )
      })}

      {/* DER */}
      {mostrarDer && (() => {
        const x = xParaMes(derMesAbs, anoInicio) + MES_WIDTH / 2
        return (
          <g>
            <line x1={x} y1={BASE_Y - 18} x2={x} y2={BASE_Y + 18} stroke={COR.der} strokeWidth={2} />
            <text x={x + 4} y={BASE_Y + 32} fontSize={10} fill={COR.der} fontWeight="bold">DER</text>
          </g>
        )
      })()}

      {/* Inicio da Atividade Rural */}
      {mostrarInicio && (() => {
        const x = xParaMes(inicioMesAbs, anoInicio) + MES_WIDTH / 2
        return (
          <g>
            <line x1={x} y1={BASE_Y - 18} x2={x} y2={BASE_Y + 18} stroke={COR.navy} strokeWidth={2} />
            <text x={x + 4} y={BASE_Y - 24} fontSize={10} fill={COR.navy} fontWeight="bold">Inicio</text>
          </g>
        )
      })()}
    </svg>
  )
}
