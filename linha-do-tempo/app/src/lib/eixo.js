import { mesParaAbsoluto, segmentosCarencia } from './calculo'

/**
 * Categoria visual de um mes absoluto, com prioridade:
 * Vinculo Urbano > Beneficio por Incapacidade > Carencia reconhecida > Sem cobertura
 */
export function classificarMes(mesAbs, { segmentos, vinculos, incapacidades }) {
  const dentro = (item) => mesAbs >= item.inicio && mesAbs < item.fim

  if (vinculos.some(dentro)) return 'vinculo'
  if (incapacidades.some(dentro)) return 'incapacidade'
  if (segmentos.some(dentro)) return 'carencia'
  return 'sem_cobertura'
}

/** Numera IRs por ordem cronologica (mais antigo = 1) */
export function numerarIRs(irs) {
  return [...irs]
    .sort((a, b) => mesParaAbsoluto(a) - mesParaAbsoluto(b))
    .map((ir, idx) => ({ ...ir, numero: idx + 1 }))
}

/**
 * Converte os dados "brutos" do banco (formato inicio_mes/inicio_ano/...) para
 * o que EixoLinhaDoTempo precisa: intervalo total de anos, categoriaPorMes
 * (calculada uma vez para o intervalo todo) e IRs numerados cronologicamente.
 * Ver "Contrato de dados" em docs/plans/2026-06-15-fase3-redesign-visual-design.md.
 */
export function prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades }) {
  const inicioAtividade = { mes: timeline.inicio_mes, ano: timeline.inicio_ano }
  const der = { mes: timeline.der_mes, ano: timeline.der_ano }

  const vinculosConvertidos = vinculos.map(v => ({
    inicio: { mes: v.inicio_mes, ano: v.inicio_ano },
    fim: { mes: v.fim_mes, ano: v.fim_ano },
  }))
  const provasConvertidas = provas.map(p => ({ mes: p.data_mes, ano: p.data_ano }))
  const irsConvertidos = irs.map(ir => ({ mes: ir.data_mes, ano: ir.data_ano }))
  const incapacidadesConvertidas = incapacidades.map(inc => ({
    inicio: { mes: inc.inicio_mes, ano: inc.inicio_ano },
    fim: { mes: inc.fim_mes, ano: inc.fim_ano },
  }))

  const segmentos = segmentosCarencia({
    inicioAtividade,
    der,
    vinculosUrbanos: vinculosConvertidos,
    provasRetorno: provasConvertidas,
    instrumentosRatificadores: irsConvertidos,
  })

  const vinculosAbs = vinculosConvertidos.map(v => ({
    inicio: mesParaAbsoluto(v.inicio), fim: mesParaAbsoluto(v.fim),
  }))
  const incapacidadesAbs = incapacidadesConvertidas.map(inc => ({
    inicio: mesParaAbsoluto(inc.inicio), fim: mesParaAbsoluto(inc.fim),
  }))

  return {
    anoInicio: timeline.inicio_ano,
    anoFim: timeline.der_ano,
    categoriaPorMes: (mesAbs) => classificarMes(mesAbs, { segmentos, vinculos: vinculosAbs, incapacidades: incapacidadesAbs }),
    irsNumerados: numerarIRs(irsConvertidos),
    provasConvertidas,
    der,
    inicioAtividade,
  }
}
