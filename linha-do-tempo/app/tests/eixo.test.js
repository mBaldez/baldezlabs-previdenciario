import { classificarMes, numerarIRs, prepararDadosEixo } from '../src/lib/eixo'
import { mesParaAbsoluto } from '../src/lib/calculo'

const MY = (mes, ano) => ({ mes, ano })

describe('classificarMes', () => {
  const segmentos = [{ inicio: mesParaAbsoluto(MY(1, 2011)), fim: mesParaAbsoluto(MY(1, 2013)) }]
  const vinculos = [{ inicio: mesParaAbsoluto(MY(1, 2015)), fim: mesParaAbsoluto(MY(1, 2016)) }]
  const incapacidades = [{ inicio: mesParaAbsoluto(MY(1, 2018)), fim: mesParaAbsoluto(MY(7, 2018)) }]

  test('mes dentro de vinculo urbano -> vinculo', () => {
    expect(classificarMes(mesParaAbsoluto(MY(6, 2015)), { segmentos, vinculos, incapacidades })).toBe('vinculo')
  })

  test('mes dentro de beneficio por incapacidade -> incapacidade', () => {
    expect(classificarMes(mesParaAbsoluto(MY(3, 2018)), { segmentos, vinculos, incapacidades })).toBe('incapacidade')
  })

  test('mes dentro de segmento de carencia -> carencia', () => {
    expect(classificarMes(mesParaAbsoluto(MY(6, 2011)), { segmentos, vinculos, incapacidades })).toBe('carencia')
  })

  test('mes fora de tudo -> sem_cobertura', () => {
    expect(classificarMes(mesParaAbsoluto(MY(6, 2020)), { segmentos, vinculos, incapacidades })).toBe('sem_cobertura')
  })

  test('vinculo tem prioridade sobre carencia em caso de coincidencia', () => {
    const segmentosSobrepostos = [{ inicio: mesParaAbsoluto(MY(1, 2015)), fim: mesParaAbsoluto(MY(1, 2016)) }]
    expect(classificarMes(mesParaAbsoluto(MY(6, 2015)), { segmentos: segmentosSobrepostos, vinculos, incapacidades })).toBe('vinculo')
  })
})

describe('numerarIRs', () => {
  test('numera cronologicamente, mesmo com IRs fora de ordem na entrada', () => {
    const irs = [MY(1, 2020), MY(1, 2013), MY(1, 2014)]
    expect(numerarIRs(irs)).toEqual([
      { mes: 1, ano: 2013, numero: 1 },
      { mes: 1, ano: 2014, numero: 2 },
      { mes: 1, ano: 2020, numero: 3 },
    ])
  })
})

describe('prepararDadosEixo', () => {
  test('converte dados do banco: intervalo total, categoriaPorMes (DER-ancorado), IRs numerados, janelas', () => {
    // der=Jun/2020=24246, inicioAtividade=Jan/2011=24133
    // Block1=[24156,24246]=[Dec/2012,Jun/2020] — IR Jan/2013=24157 IN -> valida Block1
    // Block2=[24066,24156] — fim=24066 < inicioAbs=24133 -> stop (2 blocos)
    const timeline = { inicio_mes: 1, inicio_ano: 2011, der_mes: 6, der_ano: 2020 }
    const vinculos = [{ inicio_mes: 1, inicio_ano: 2015, fim_mes: 12, fim_ano: 2015 }]
    const provas = []
    const irs = [{ data_mes: 1, data_ano: 2013 }]
    const incapacidades = []

    const dados = prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades })

    expect(dados.anoInicio).toBe(2011)
    expect(dados.anoFim).toBe(2020)
    expect(dados.irsNumerados).toEqual([{ mes: 1, ano: 2013, numero: 1 }])
    // Jun/2015 esta dentro do vinculo urbano (prioridade maxima)
    expect(dados.categoriaPorMes(mesParaAbsoluto(MY(6, 2015)))).toBe('vinculo')
    // Jul/2014=24187 esta no Block1 validado [24156,24246] -> carencia
    expect(dados.categoriaPorMes(mesParaAbsoluto(MY(7, 2014)))).toBe('carencia')
    // Jun/2011=24138: Block1 inicia em 24156 > 24138 -> nao esta em carencia -> sem_cobertura
    expect(dados.categoriaPorMes(mesParaAbsoluto(MY(6, 2011)))).toBe('sem_cobertura')
    // janelas expostas para visualizacao dos limites de bloco
    expect(dados.janelas).toHaveLength(2)
    expect(dados.janelas[0]).toEqual({ inicio: 24156, fim: 24246 })
  })
})
