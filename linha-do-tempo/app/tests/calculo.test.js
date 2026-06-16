import { calcularCarencia, duracaoMeses, janelasDerAncoradas, mesParaAbsoluto, segmentosCarencia } from '../src/lib/calculo'

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

// --- janelasDerAncoradas ---
describe('janelasDerAncoradas', () => {
  test('gera blocos de 90 meses retroativos a partir da DER', () => {
    // der=Dec/2020=24252, inicioAtividade=Jan/2015=24181
    // Block1: [24162,24252], fim=24162 > 24181? NO -> stop after 1 block
    const janelas = janelasDerAncoradas(MY(12, 2020), MY(1, 2015))
    expect(janelas).toHaveLength(1)
    expect(janelas[0]).toEqual({ inicio: 24252 - 90, fim: 24252 })
  })

  test('gera multiplos blocos para periodo longo', () => {
    // der=Dec/2020=24252, inicioAtividade=Jan/2000=24001
    // Block1: [24162,24252], Block2: [24072,24162], Block3: [23982,24072]
    // fim=23982 < 24001 -> stop (3 blocks)
    const janelas = janelasDerAncoradas(MY(12, 2020), MY(1, 2000))
    expect(janelas).toHaveLength(3)
    expect(janelas[0]).toEqual({ inicio: 24162, fim: 24252 })
    expect(janelas[1]).toEqual({ inicio: 24072, fim: 24162 })
    expect(janelas[2]).toEqual({ inicio: 23982, fim: 24072 })
  })

  test('sem IR: nao ha blocos a validar (array vazio nao e gerado aqui, mas segmentosCarencia trata)', () => {
    const janelas = janelasDerAncoradas(MY(6, 2026), MY(1, 2011))
    expect(janelas.length).toBeGreaterThan(0)
    expect(janelas.every((j) => j.fim - j.inicio === 90)).toBe(true)
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

  test('com 1 IR: valida o bloco DER-ancorado em que cai -> rural = bloco inteiro intersectado', () => {
    // der=Jun/2026=24318. IR Jan/2013=24157.
    // Block1=[24228,24318] — 24157 nao esta aqui
    // Block2=[24138,24228] — 24157 esta aqui -> valida Block2
    // Block2 ∩ [Jan/2011=24133, Jun/2026=24318] = [24138,24228] = 90 meses
    const r = calcularCarencia({ ...base, instrumentosRatificadores: [MY(1, 2013)] })
    expect(r.rural).toBe(90)
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

// --- Blocos DER-ancorados (logica central do Oficio-Circular 46/DIRBEN/INSS) ---
describe('Blocos DER-ancorados (Oficio-Circular 46)', () => {
  test('IR posterior a DER: nenhum bloco alcancado -> rural=0', () => {
    // Todos os blocos terminam na DER ou antes; IR apos DER nao cai em nenhum
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

  test('periodo declarado > 90 meses, IR na DER: rural = 90 meses (limite do bloco)', () => {
    // der=Dec/2020=24252, IR=Dec/2020. Block1=[24162,24252]. IR<=24252 -> valida Block1
    // declarado=[Jan/2000,Dec/2020]. Block1 ∩ declarado = [24162,24252] = 90 meses
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

  test('2 IRs no mesmo bloco: rural = 90 meses (bloco unico, sem duplicar)', () => {
    // der=Jun/2026=24318. IR1=Jan/2013=24157, IR2=Jan/2014=24169.
    // Block2=[24138,24228]. Ambos os IRs estao no Block2 -> rural = 90 meses
    const r = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2010),
      der: MY(6, 2026),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(1, 2013), MY(1, 2014)],
      beneficiosIncapacidade: [],
    })
    expect(r.rural).toBe(90)
  })

  test('2 IRs em blocos distintos: rural = 2 blocos de 90 meses = 180 meses', () => {
    // der=Dec/2025=24312, inicio=Jan/2000=24001
    // Block1=[24222,24312] IR2=Jun/2020=24246 IN -> valida Block1
    // Block2=[24132,24222] nenhum IR
    // Block3=[24042,24132] IR1=Jun/2005=24066 IN -> valida Block3
    // Block1 ∩ declarado = [24222,24312] = 90 meses
    // Block3 ∩ declarado = [24042,24132] = 90 meses (inicio=24001 < 24042)
    const r = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2000),
      der: MY(12, 2025),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(6, 2005), MY(6, 2020)],
      beneficiosIncapacidade: [],
    })
    expect(r.rural).toBe(180)
  })
})

// --- segmentosCarencia (blocos DER-ancorados para visualizacao) ---
describe('segmentosCarencia', () => {
  test('sem IR: retorna []', () => {
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2010), der: MY(12, 2020),
      vinculosUrbanos: [], provasRetorno: [], instrumentosRatificadores: [],
    })
    expect(segs).toEqual([])
  })

  test('periodo declarado < 90 meses, IR na DER: segmento = todo o periodo declarado', () => {
    // der=Dec/2020=24252, Block1=[24162,24252]. IR Dec/2020 valida Block1.
    // declarado=[Jan/2018=24217, Dec/2020=24252]. Block1 ∩ declarado = [24217,24252].
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2018), der: MY(12, 2020),
      vinculosUrbanos: [], provasRetorno: [],
      instrumentosRatificadores: [MY(12, 2020)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(1, 2018)), fim: mesParaAbsoluto(MY(12, 2020)) },
    ])
  })

  test('periodo declarado > 90 meses, IR na DER: segmento = 1 bloco de 90 meses', () => {
    // der=Dec/2020=24252, Block1=[24162,24252]. IR Dec/2020 valida Block1.
    // declarado=[Jan/2000, Dec/2020]. Block1 ∩ declarado = [Jun/2013,Dec/2020].
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2000), der: MY(12, 2020),
      vinculosUrbanos: [], provasRetorno: [],
      instrumentosRatificadores: [MY(12, 2020)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(6, 2013)), fim: mesParaAbsoluto(MY(12, 2020)) },
    ])
  })

  test('2 IRs no mesmo bloco: 1 segmento de 90 meses (sem duplicar)', () => {
    // der=Jun/2026=24318. IR1=Jan/2013=24157, IR2=Jan/2014=24169 — ambos no Block2=[24138,24228].
    // declarado=[Jan/2010=24121, Jun/2026]. Block2 ∩ declarado = [24138,24228] = [Jun/2011,Dec/2018].
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2010), der: MY(6, 2026),
      vinculosUrbanos: [], provasRetorno: [],
      instrumentosRatificadores: [MY(1, 2013), MY(1, 2014)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(6, 2011)), fim: mesParaAbsoluto(MY(12, 2018)) },
    ])
  })

  test('2 IRs em blocos diferentes nao adjacentes: 2 segmentos com "buraco" entre eles', () => {
    // der=Dec/2025=24312, inicio=Jan/2000=24001
    // Block1=[24222,24312] — IR2=Jun/2020=24246 valida Block1
    // Block2=[24132,24222] — sem IR (buraco!)
    // Block3=[24042,24132] — IR1=Jun/2005=24066 valida Block3
    // Block1 ∩ declarado = [24222,24312] = [Jun/2018,Dec/2025]
    // Block3 ∩ declarado = [24042,24132] = [Jun/2003,Dec/2010]
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2000), der: MY(12, 2025),
      vinculosUrbanos: [], provasRetorno: [],
      instrumentosRatificadores: [MY(6, 2005), MY(6, 2020)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(6, 2003)), fim: mesParaAbsoluto(MY(12, 2010)) },
      { inicio: mesParaAbsoluto(MY(6, 2018)), fim: mesParaAbsoluto(MY(12, 2025)) },
    ])
  })
})
