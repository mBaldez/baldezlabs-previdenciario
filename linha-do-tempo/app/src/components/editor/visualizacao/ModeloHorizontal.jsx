const COR = {
  vinculo: '#3498db',
  incapacidade: '#f1c40f',
  ir: '#27ae60',
  provaRetorno: '#e74c3c',
  der: '#e74c3c',
  navy: '#0B1F3A',
  navyTint: '#D0D8E0',
}

const ANO_WIDTH = 80
const SVG_HEIGHT = 220
const BASE_Y = 120
const TICK_H = 20
const FAIXA_TOP = 10

function xParaMes(mes, ano, inicioAno) {
  return ((ano - inicioAno) * 12 + (mes - 1)) * (ANO_WIDTH / 12)
}

function larguraMeses(inicioMes, inicioAno, fimMes, fimAno) {
  const meses = (fimAno - inicioAno) * 12 + (fimMes - inicioMes)
  return Math.max(meses * (ANO_WIDTH / 12), 4)
}

export function ModeloHorizontal({ timeline, vinculos, provas, irs, incapacidades }) {
  if (!timeline) return null

  const inicioAno = timeline.inicio_ano
  const fimAno = timeline.der_ano + 1
  const numAnos = fimAno - inicioAno + 1
  const totalWidth = numAnos * ANO_WIDTH

  const anos = Array.from({ length: numAnos }, (_, i) => inicioAno + i)

  return (
    <div
      id="area-timeline"
      style={{
        overflowX: 'auto',
        background: 'white',
        borderRadius: '8px',
        padding: '8px',
      }}
    >
      <svg
        width={totalWidth}
        height={SVG_HEIGHT}
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* Fundo zebrado alternado */}
        {anos.map(ano => {
          const x = (ano - inicioAno) * ANO_WIDTH
          return (
            <rect
              key={`bg-${ano}`}
              x={x} y={0}
              width={ANO_WIDTH} height={SVG_HEIGHT - 25}
              fill={ano % 2 === 0 ? 'rgba(11,31,58,0.03)' : 'transparent'}
            />
          )
        })}

        {/* Vinculos Urbanos (faixa topo, Y=FAIXA_TOP a FAIXA_TOP+30) */}
        {vinculos.map(v => {
          const x = xParaMes(v.inicio_mes, v.inicio_ano, inicioAno)
          const w = larguraMeses(v.inicio_mes, v.inicio_ano, v.fim_mes, v.fim_ano)
          const label = v.origem
            ? (v.origem.length > 12 ? v.origem.slice(0, 12) + '\u2026' : v.origem)
            : ''
          return (
            <g key={`vinc-${v.id}`}>
              <rect
                x={x} y={FAIXA_TOP}
                width={w} height={30}
                fill={COR.vinculo} opacity={0.7}
                rx={3}
              />
              <text
                x={x + w / 2} y={FAIXA_TOP + 19}
                textAnchor="middle" fontSize={10} fill="white" fontWeight="bold"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Beneficios por Incapacidade (Y=50 a 78) */}
        {incapacidades.map(inc => {
          const x = xParaMes(inc.inicio_mes, inc.inicio_ano, inicioAno)
          const w = larguraMeses(inc.inicio_mes, inc.inicio_ano, inc.fim_mes, inc.fim_ano)
          return (
            <rect
              key={`inc-${inc.id}`}
              x={x} y={50}
              width={w} height={28}
              fill={COR.incapacidade} opacity={0.7}
              rx={3}
            />
          )
        })}

        {/* Linha base */}
        <line
          x1={0} y1={BASE_Y}
          x2={totalWidth} y2={BASE_Y}
          stroke={COR.navy} strokeWidth={2}
        />

        {/* Ticks e labels dos anos */}
        {anos.map(ano => {
          const x = (ano - inicioAno) * ANO_WIDTH
          return (
            <g key={`tick-${ano}`}>
              <line
                x1={x} y1={BASE_Y - TICK_H}
                x2={x} y2={BASE_Y + TICK_H}
                stroke={COR.navyTint} strokeWidth={1}
              />
              <text
                x={x + ANO_WIDTH / 2} y={SVG_HEIGHT - 8}
                textAnchor="middle"
                fontSize={11} fill={COR.navy}
                fontFamily="Georgia, serif"
              >
                {ano}
              </text>
            </g>
          )
        })}

        {/* IRs (linhas verticais verdes) */}
        {irs.map(ir => {
          const x = xParaMes(ir.data_mes, ir.data_ano, inicioAno)
          return (
            <g key={`ir-${ir.id}`}>
              <line
                x1={x} y1={BASE_Y - 35}
                x2={x} y2={BASE_Y + 35}
                stroke={COR.ir} strokeWidth={2.5}
              />
              <circle cx={x} cy={BASE_Y - 38} r={4} fill={COR.ir} />
              <text
                x={x} y={BASE_Y - 45}
                textAnchor="middle" fontSize={9}
                fill={COR.ir} fontWeight="bold"
              >
                IR
              </text>
            </g>
          )
        })}

        {/* Provas de Retorno (linhas verticais vermelhas) */}
        {provas.map(pr => {
          const x = xParaMes(pr.data_mes, pr.data_ano, inicioAno)
          return (
            <g key={`pr-${pr.id}`}>
              <line
                x1={x} y1={BASE_Y - 30}
                x2={x} y2={BASE_Y + 30}
                stroke={COR.provaRetorno} strokeWidth={2.5}
                strokeDasharray="4 3"
              />
              <text
                x={x} y={BASE_Y - 35}
                textAnchor="middle" fontSize={9}
                fill={COR.provaRetorno} fontWeight="bold"
              >
                PR
              </text>
            </g>
          )
        })}

        {/* Marcador DER */}
        <line
          x1={xParaMes(timeline.der_mes, timeline.der_ano, inicioAno)}
          y1={FAIXA_TOP}
          x2={xParaMes(timeline.der_mes, timeline.der_ano, inicioAno)}
          y2={SVG_HEIGHT - 25}
          stroke={COR.der} strokeWidth={2}
          strokeDasharray="6 3"
        />
        <text
          x={xParaMes(timeline.der_mes, timeline.der_ano, inicioAno) + 4}
          y={BASE_Y + 50}
          fontSize={11} fill={COR.der}
          fontWeight="bold"
        >
          DER
        </text>

        {/* Marcador Inicio da Atividade Rural */}
        <line
          x1={xParaMes(timeline.inicio_mes, timeline.inicio_ano, inicioAno)}
          y1={BASE_Y - 15}
          x2={xParaMes(timeline.inicio_mes, timeline.inicio_ano, inicioAno)}
          y2={BASE_Y + 15}
          stroke={COR.navy} strokeWidth={3}
        />
        <text
          x={xParaMes(timeline.inicio_mes, timeline.inicio_ano, inicioAno) + 4}
          y={BASE_Y - 20}
          fontSize={9} fill={COR.navy}
        >
          Inicio
        </text>
      </svg>
    </div>
  )
}
