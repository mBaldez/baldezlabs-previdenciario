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
  test('converte dados do banco: intervalo total, categoriaPorMes, IRs numerados', () => {
    const timeline = { inicio_mes: 1, inicio_ano: 2011, der_mes: 6, der_ano: 2020 }
    const vinculos = [{ inicio_mes: 1, inicio_ano: 2015, fim_mes: 12, fim_ano: 2015 }]
    const provas = []
    const irs = [{ data_mes: 1, data_ano: 2013 }]
    const incapacidades = []

    const dados = prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades })

    expect(dados.anoInicio).toBe(2011)
    expect(dados.anoFim).toBe(2020)
    expect(dados.irsNumerados).toEqual([{ mes: 1, ano: 2013, numero: 1 }])
    expect(dados.categoriaPorMes(mesParaAbsoluto(MY(6, 2015)))).toBe('vinculo')
    expect(dados.categoriaPorMes(mesParaAbsoluto(MY(6, 2011)))).toBe('carencia')
  })
})
