const MESES_POR_LINHA = 30
const CELL_W = 16
const CELL_H = 20
const GAP = 2

const COR = {
  vinculo: '#3498db',
  incapacidade: '#f1c40f',
  ir: '#27ae60',
  provaRetorno: '#e74c3c',
}

function mesAbsoluto(mes, ano) {
  return ano * 12 + mes
}

function classificarMes(mesAbs, vinculos, provas, irs, incapacidades) {
  if (vinculos.some(v =>
    mesAbs >= mesAbsoluto(v.inicio_mes, v.inicio_ano) &&
    mesAbs < mesAbsoluto(v.fim_mes, v.fim_ano)
  )) return COR.vinculo

  if (incapacidades.some(inc =>
    mesAbs >= mesAbsoluto(inc.inicio_mes, inc.inicio_ano) &&
    mesAbs < mesAbsoluto(inc.fim_mes, inc.fim_ano)
  )) return COR.incapacidade

  if (irs.some(ir => mesAbsoluto(ir.data_mes, ir.data_ano) === mesAbs))
    return COR.ir

  if (provas.some(pr => mesAbsoluto(pr.data_mes, pr.data_ano) === mesAbs))
    return COR.provaRetorno

  return null
}

export function ModeloCurvas({ timeline, vinculos, provas, irs, incapacidades }) {
  if (!timeline) return null

  const derAbs = mesAbsoluto(timeline.der_mes, timeline.der_ano)
  const inicioAbs = mesAbsoluto(timeline.inicio_mes, timeline.inicio_ano)

  const totalMeses = derAbs - inicioAbs
  if (totalMeses <= 0) return <p style={{ color: '#999' }}>Periodo invalido.</p>

  // Dividir em janelas de 90 meses, da DER para tras
  const janelas = []
  let fim = derAbs
  while (fim > inicioAbs) {
    const inicio = Math.max(fim - 90, inicioAbs)
    janelas.push({ inicio, fim })
    fim = inicio
  }
  // Janela mais recente primeiro (reverter porque construimos de tras pra frente)
  janelas.reverse()

  return (
    <div id="area-timeline" style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', padding: '12px' }}>
      {/* Titulo */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#0B1F3A', fontSize: '14px' }}>
          Periodos de 90 meses
        </span>
        <span style={{ fontSize: '12px', color: '#999' }}>
          (oficio-circular 46/2019)
        </span>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { cor: COR.vinculo, label: 'Vinculo Urbano' },
          { cor: COR.incapacidade, label: 'Incapacidade' },
          { cor: COR.ir, label: 'IR' },
          { cor: COR.provaRetorno, label: 'Prova de Retorno' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 12, height: 12, background: item.cor, borderRadius: 2 }} />
            <span style={{ fontSize: '11px', color: '#666' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {janelas.map((janela, jIdx) => {
        const mesesDaJanela = []
        for (let m = janela.inicio; m < janela.fim; m++) {
          mesesDaJanela.push(m)
        }
        // Preencher ate 90 se necessario (meses antes do inicio como null)
        while (mesesDaJanela.length < 90) {
          mesesDaJanela.unshift(null)
        }

        // Dividir em linhas de MESES_POR_LINHA (30)
        const linhas = []
        for (let i = 0; i < mesesDaJanela.length; i += MESES_POR_LINHA) {
          linhas.push(mesesDaJanela.slice(i, i + MESES_POR_LINHA))
        }

        const labelJanela = janela.fim === derAbs
          ? `Janela ate DER (${String(timeline.der_mes).padStart(2, '0')}/${timeline.der_ano})`
          : `Janela ${jIdx + 1}`

        return (
          <div key={jIdx} style={{ marginBottom: '20px' }}>
            {/* Label da janela */}
            <div style={{
              fontSize: '11px', color: '#e67e22', fontWeight: 'bold',
              marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {labelJanela} &mdash; {mesesDaJanela.filter(m => m !== null).length} meses
            </div>

            {/* 3 linhas em serpentina */}
            {linhas.map((linha, lIdx) => {
              const linhaOrdenada = lIdx % 2 === 0 ? linha : [...linha].reverse()
              return (
                <div
                  key={lIdx}
                  style={{
                    display: 'flex',
                    flexDirection: lIdx % 2 === 0 ? 'row' : 'row-reverse',
                    gap: `${GAP}px`,
                    marginBottom: `${GAP}px`,
                  }}
                >
                  {linhaOrdenada.map((mesAbs, cIdx) => {
                    if (mesAbs === null) {
                      return (
                        <div
                          key={cIdx}
                          style={{
                            width: CELL_W, height: CELL_H,
                            background: '#fafafa',
                            border: '1px solid #e0e0e0',
                            borderRadius: 2,
                            opacity: 0.3,
                          }}
                        />
                      )
                    }

                    const cor = classificarMes(mesAbs, vinculos, provas, irs, incapacidades)
                    const mesNum = mesAbs % 12 || 12
                    const anoNum = Math.floor((mesAbs - 1) / 12)
                    const isJan = mesNum === 1
                    const isDer = mesAbs === derAbs - 1

                    return (
                      <div
                        key={cIdx}
                        title={`${String(mesNum).padStart(2, '0')}/${anoNum}`}
                        style={{
                          width: CELL_W, height: CELL_H,
                          background: cor || (isJan ? 'rgba(11,31,58,0.08)' : '#f0f0f0'),
                          border: isDer
                            ? '2px solid #e74c3c'
                            : isJan
                              ? '1px solid #0B1F3A'
                              : `1px solid ${cor ? cor + '88' : '#e0e0e0'}`,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 7,
                          color: cor ? 'white' : (isJan ? '#0B1F3A' : 'transparent'),
                          fontWeight: 'bold',
                          cursor: 'default',
                        }}
                      >
                        {isJan ? String(anoNum).slice(2) : ''}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
