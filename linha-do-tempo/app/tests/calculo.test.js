import { calcularCarencia, duracaoMeses, mesParaAbsoluto } from '../src/lib/calculo'

// Helper
const MY = (mes, ano) => ({ mes, ano })
const V = (origem, iM, iA, fM, fA) => ({ origem, inicio: MY(iM, iA), fim: MY(fM, fA) })

// --- Helpers ---
describe('duracaoMeses', () => {
  test('mesmo mes e ano = 0', () => {
    expect(duracaoMeses(MY(1, 2011), MY(1, 2011))).toBe(0)
  })
  test('Jan/2011 a Dez/2011 = 11', () => {
    expect(duracaoMeses(MY(1, 2011), MY(12, 2011))).toBe(11)
  })
  test('Jan/2011 a Jan/2012 = 12', () => {
    expect(duracaoMeses(MY(1, 2011), MY(1, 2012))).toBe(12)
  })
  test('Jan/2015 a Dez/2016 = 23', () => {
    expect(duracaoMeses(MY(1, 2015), MY(12, 2016))).toBe(23)
  })
})

describe('mesParaAbsoluto', () => {
  test('Jan/2011 = 24133', () => {
    expect(mesParaAbsoluto(MY(1, 2011))).toBe(2011 * 12 + 1)
  })
  test('Dez/2016 > Jan/2015', () => {
    expect(mesParaAbsoluto(MY(12, 2016))).toBeGreaterThan(mesParaAbsoluto(MY(1, 2015)))
  })
})

// --- Aposentadoria Rural ---
describe('Aposentadoria Rural', () => {
  const base = {
    tipoBeneficio: 'aposentadoria_rural',
    inicioAtividade: MY(1, 2011),
    der: MY(6, 2026),
    vinculosUrbanos: [],
    provasRetorno: [],
    instrumentosRatificadores: [],
    beneficiosIncapacidade: [],
  }

  test('sem IR: rural=0, total=0', () => {
    const r = calcularCarencia(base)
    expect(r.rural).toBe(0)
    expect(r.total).toBe(0)
  })

  test('com 1 IR: rural = intersecao entre periodo declarado e janela de 90 meses do IR', () => {
    const r = calcularCarencia({ ...base, instrumentosRatificadores: [MY(1, 2013)] })
    // Janela do IR (Jan/2013) = [Jul/2005, Jan/2013). Intersecao com [Jan/2011, Jun/2026) = [Jan/2011, Jan/2013).
    expect(r.rural).toBe(duracaoMeses(MY(1, 2011), MY(1, 2013)))
    expect(r.total).toBe(r.rural)
  })

  test('resultado nao tem propriedade "urbano"', () => {
    const r = calcularCarencia(base)
    expect(r).not.toHaveProperty('urbano')
  })
})

// --- Demais Beneficios Rurais ---
describe('Demais Beneficios Rurais', () => {
  test('com vinculo e IR e PR: total = rural (urbano ignorado no total)', () => {
    const r = calcularCarencia({
      tipoBeneficio: 'demais_rurais',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [V('Empresa', 1, 2015, 12, 2016)],
      provasRetorno: [MY(1, 2017)],
      instrumentosRatificadores: [MY(1, 2013)],
      beneficiosIncapacidade: [],
    })
    expect(r.total).toBe(r.rural)
    expect(r).not.toHaveProperty('urbano')
  })
})

// --- Hibrida ---
describe('Aposentadoria Hibrida', () => {
  const base = {
    tipoBeneficio: 'hibrida',
    inicioAtividade: MY(1, 2011),
    der: MY(6, 2026),
  }

  test('sem nada: rural=0, urbano=0, total=0', () => {
    const r = calcularCarencia({
      ...base,
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [],
      beneficiosIncapacidade: [],
    })
    expect(r.rural).toBe(0)
    expect(r.urbano).toBe(0)
    expect(r.total).toBe(0)
  })

  test('com vinculo Jan/2015-Dez/2016 (23 meses), sem PR, sem IR: rural=0, urbano=23, total=23', () => {
    const r = calcularCarencia({
      ...base,
      vinculosUrbanos: [V('Empresa', 1, 2015, 12, 2016)],
      provasRetorno: [],
      instrumentosRatificadores: [],
      beneficiosIncapacidade: [],
    })
    expect(r.urbano).toBe(23)
    expect(r.rural).toBe(0)
    expect(r.total).toBe(23)
  })

  test('com vinculo + PR + IR: rural > 0, total = rural + urbano', () => {
    const r = calcularCarencia({
      ...base,
      vinculosUrbanos: [V('Empresa', 1, 2015, 12, 2016)],
      provasRetorno: [MY(1, 2017)],
      instrumentosRatificadores: [MY(1, 2013)],
      beneficiosIncapacidade: [],
    })
    expect(r.rural).toBeGreaterThan(0)
    expect(r.urbano).toBe(23)
    expect(r.total).toBe(r.rural + r.urbano)
  })

  test('resultado tem propriedades rural, urbano, total', () => {
    const r = calcularCarencia({
      ...base,
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [],
      beneficiosIncapacidade: [],
    })
    expect(r).toHaveProperty('rural')
    expect(r).toHaveProperty('urbano')
    expect(r).toHaveProperty('total')
  })
})

// --- Beneficio por Incapacidade ---
describe('Beneficio por Incapacidade', () => {
  test('adicionar incapacidade nao altera o total de carencia', () => {
    const sem = calcularCarencia({
      tipoBeneficio: 'hibrida',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [V('Empresa', 1, 2015, 12, 2016)],
      provasRetorno: [MY(1, 2017)],
      instrumentosRatificadores: [MY(1, 2013)],
      beneficiosIncapacidade: [],
    })
    const com = calcularCarencia({
      tipoBeneficio: 'hibrida',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [V('Empresa', 1, 2015, 12, 2016)],
      provasRetorno: [MY(1, 2017)],
      instrumentosRatificadores: [MY(1, 2013)],
      beneficiosIncapacidade: [{ inicio: MY(3, 2018), fim: MY(8, 2018) }],
    })
    expect(com.total).toBe(sem.total)
    expect(com.rural).toBe(sem.rural)
  })
})

// --- Janela de 90 meses do instrumento ratificador (Oficio-Circular 46/DIRBEN/INSS) ---
describe('Janela de 90 meses do instrumento ratificador (oficio 46)', () => {
  test('IR muito recente, periodo declarado muito antigo: janela nao alcanca -> rural=0', () => {
    const r = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2000),
      der: MY(12, 2001),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(1, 2020)],
      beneficiosIncapacidade: [],
    })
    expect(r.rural).toBe(0)
  })

  test('periodo declarado > 90 meses: janela do IR limita reconhecimento a 90 meses', () => {
    const r = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2000),
      der: MY(12, 2020),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(12, 2020)],
      beneficiosIncapacidade: [],
    })
    expect(r.rural).toBe(90)
  })

  test('multiplos IRs com janelas sobrepostas: uniao sem duplicar overlap', () => {
    const r = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2010),
      der: MY(6, 2026),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(1, 2013), MY(1, 2014)],
      beneficiosIncapacidade: [],
    })
    // Janela IR1 (Jan/2013) = [Jul/2005, Jan/2013) -> intersecao = [Jan/2010, Jan/2013) = 36 meses
    // Janela IR2 (Jan/2014) = [Jul/2006, Jan/2014) -> intersecao = [Jan/2010, Jan/2014) = 48 meses
    // Uniao dos dois (o 2o contem o 1o) = 48, NAO 36+48=84
    expect(r.rural).toBe(48)
  })
})
