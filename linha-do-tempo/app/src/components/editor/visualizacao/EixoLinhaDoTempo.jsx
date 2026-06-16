import { janelasDerAncoradas, mesParaAbsoluto } from '../../../lib/calculo'

export const ANO_WIDTH = 80
export const MES_WIDTH = ANO_WIDTH / 12
export const SVG_HEIGHT = 160
export const BASE_Y = 110
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

// Renders row content as <g> — used by ModeloCurvas inside a single SVG
export function EixoContent({
  anoInicio, anoFim, categoriaPorMes, irs, provas, der, inicio,
  reversed = false, mesInicioOverride, mesFimOverride,
}) {
  const totalWidth = larguraAnos(anoInicio, anoFim)
  const anos = Array.from({ length: anoFim - anoInicio + 1 }, (_, i) => anoInicio + i)

  const mesInicial = mesInicioOverride ?? (anoInicio * 12 + 1)
  const mesFinal = mesFimOverride ?? (anoFim * 12 + 12)
  const meses = []
  for (let m = mesInicial; m <= mesFinal; m++) meses.push(m)

  const derMesAbs = mesParaAbsoluto(der)
  const inicioMesAbs = mesParaAbsoluto(inicio)
  const mostrarDer = derMesAbs >= mesInicial && derMesAbs <= mesFinal
  const mostrarInicio = inicioMesAbs >= mesInicial && inicioMesAbs <= mesFinal

  const janelas = (der?.mes && der?.ano && inicio?.mes && inicio?.ano)
    ? janelasDerAncoradas(der, inicio)
    : []
  const limitesBloco = [...new Set(janelas.flatMap(j => [j.inicio, j.fim]))]
    .filter(m => m >= mesInicial && m <= mesFinal)

  const xMes = (mesAbs) =>
    reversed
      ? totalWidth - MES_WIDTH * (mesAbs - anoInicio * 12)
      : xParaMes(mesAbs, anoInicio)

  const xAno = (ano) =>
    reversed
      ? (anoFim - ano) * ANO_WIDTH
      : (ano - anoInicio) * ANO_WIDTH

  const segmentosCor = []
  for (const m of meses) {
    const cat = categoriaPorMes(m)
    const ultimo = segmentosCor[segmentosCor.length - 1]
    if (ultimo && ultimo.cat === cat) {
      ultimo.fim = m
    } else {
      segmentosCor.push({ inicio: m, fim: m, cat })
    }
  }

  return (
    <g>
      {/* Continuous color bar */}
      {segmentosCor.map(seg => {
        const xEsq = reversed ? xMes(seg.fim) : xMes(seg.inicio)
        const larguraSeg = (seg.fim - seg.inicio + 1) * MES_WIDTH
        return (
          <rect
            key={`seg-${seg.inicio}`}
            x={xEsq} y={BASE_Y - 8}
            width={larguraSeg} height={16}
            fill={COR[seg.cat === 'sem_cobertura' ? 'semCobertura' : seg.cat]}
          />
        )
      })}

      {/* Subtle year-boundary dividers within bar */}
      {anos.map(ano => {
        const x = xAno(ano)
        if (x <= 0 || x >= totalWidth) return null
        return (
          <line key={`ydiv-${ano}`}
            x1={x} y1={BASE_Y - 8} x2={x} y2={BASE_Y + 8}
            stroke="rgba(255,255,255,0.5)" strokeWidth={1}
          />
        )
      })}

      {/* 90-month block boundary lines */}
      {limitesBloco.map(m => (
        <line
          key={`bloco-${m}`}
          x1={xMes(m)} y1={BASE_Y - 8}
          x2={xMes(m)} y2={BASE_Y + 20}
          stroke="#5A7A8A" strokeWidth={1.5}
        />
      ))}

      {/* Year ticks and centered labels */}
      {anos.map(ano => {
        const x = xAno(ano)
        return (
          <g key={`tick-${ano}`}>
            <line x1={x} y1={BASE_Y + 8} x2={x} y2={BASE_Y + 18} stroke={COR.navy} strokeWidth={1} />
            <text x={x + ANO_WIDTH / 2} y={BASE_Y + 33} textAnchor="middle" fontSize={11} fill={COR.navy} fontFamily="Georgia, serif">
              {ano}
            </text>
          </g>
        )
      })}
      <line x1={totalWidth} y1={BASE_Y + 8} x2={totalWidth} y2={BASE_Y + 18} stroke={COR.navy} strokeWidth={1} />

      {/* Numbered IRs */}
      {irs.map(ir => {
        const x = xMes(mesParaAbsoluto(ir)) + MES_WIDTH / 2
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
        const x = xMes(mesParaAbsoluto(pr)) + MES_WIDTH / 2
        return (
          <circle key={`pr-${i}`} cx={x} cy={BASE_Y} r={5} fill={COR.provaRetorno} stroke="white" strokeWidth={1.5} />
        )
      })}

      {/* DER marker */}
      {mostrarDer && (() => {
        const x = xMes(derMesAbs) + MES_WIDTH / 2
        return (
          <g>
            <line x1={x} y1={BASE_Y - 20} x2={x} y2={BASE_Y + 8} stroke={COR.der} strokeWidth={2} />
            <text x={x + 4} y={BASE_Y - 22} fontSize={10} fill={COR.der} fontWeight="bold">DER</text>
          </g>
        )
      })()}

      {/* Início da Atividade Rural marker */}
      {mostrarInicio && (() => {
        const x = xMes(inicioMesAbs) + MES_WIDTH / 2
        return (
          <g>
            <line x1={x} y1={BASE_Y - 20} x2={x} y2={BASE_Y + 8} stroke={COR.navy} strokeWidth={2} />
            <text x={x + 4} y={BASE_Y - 22} fontSize={10} fill={COR.navy} fontWeight="bold">Inicio</text>
          </g>
        )
      })()}
    </g>
  )
}

// Standalone SVG wrapper — keeps backward compat with ModeloHorizontal
export function EixoLinhaDoTempo(props) {
  const totalWidth = larguraAnos(props.anoInicio, props.anoFim)
  return (
    <svg width={totalWidth} height={SVG_HEIGHT} style={{ display: 'block' }}>
      <EixoContent {...props} />
    </svg>
  )
}
