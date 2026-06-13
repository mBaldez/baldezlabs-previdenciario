/**
 * Motor de calculo de carencia previdenciaria rural.
 *
 * Logica confirmada: regras 1-7 do mapeamento do concorrente SLT.
 * ESTIMADO: formula exata de expansao do Tempo Rural via IR
 * nao foi derivada com certeza — ver comentario na funcao calcularCarencia.
 */

/** Converte {mes, ano} para numero absoluto de meses */
export function mesParaAbsoluto({ mes, ano }) {
  return ano * 12 + mes
}

/** Duracao em meses entre dois {mes, ano} (exclusivo no fim) */
export function duracaoMeses(inicio, fim) {
  return (fim.ano - inicio.ano) * 12 + (fim.mes - inicio.mes)
}

/**
 * Calcula carencia previdenciaria conforme tipo de beneficio.
 *
 * @param {Object} params
 * @param {'aposentadoria_rural'|'hibrida'|'demais_rurais'} params.tipoBeneficio
 * @param {{mes: number, ano: number}} params.inicioAtividade
 * @param {{mes: number, ano: number}} params.der
 * @param {Array} params.vinculosUrbanos
 * @param {Array} params.provasRetorno
 * @param {Array} params.instrumentosRatificadores
 * @param {Array} params.beneficiosIncapacidade - marcador visual, nao altera calculo
 *
 * @returns {{ rural: number, total: number }} para aposentadoria_rural / demais_rurais
 * @returns {{ rural: number, urbano: number, total: number }} para hibrida
 */
export function calcularCarencia({
  tipoBeneficio,
  inicioAtividade,
  der,
  vinculosUrbanos,
  provasRetorno,
  instrumentosRatificadores,
  // beneficiosIncapacidade — recebido mas nao usado no calculo (marcador visual apenas)
}) {
  // Regra 1: Sem IR => tempo rural = 0 (confirmado)
  if (instrumentosRatificadores.length === 0) {
    if (tipoBeneficio === 'hibrida') {
      const urbano = _calcularMesesUrbanos(vinculosUrbanos)
      return { rural: 0, urbano, total: urbano }
    }
    return { rural: 0, total: 0 }
  }

  // Calcular meses rurais
  // ⚠️ ESTIMADO: logica baseada em observacoes do SLT, nao derivada formalmente.
  // Hipotese: rural = periodo antes do primeiro vinculo + periodo pos-PR apos ultimo vinculo.
  // Se nao ha vinculos urbanos, rural = todo o periodo de inicioAtividade ate DER.
  const mesesRural = _calcularMesesRural(inicioAtividade, der, vinculosUrbanos, provasRetorno)

  // Vinculos urbanos
  const mesesUrbanos = _calcularMesesUrbanos(vinculosUrbanos)

  // Regra 6: Hibrida => total = rural + urbano
  if (tipoBeneficio === 'hibrida') {
    return {
      rural: mesesRural,
      urbano: mesesUrbanos,
      total: mesesRural + mesesUrbanos,
    }
  }

  // Regra 5: Aposentadoria Rural e Demais Rurais => total = rural (urbano nao conta)
  return { rural: mesesRural, total: mesesRural }
}

/**
 * Calcula meses rurais efetivos.
 *
 * ⚠️ ESTIMADO: a formula exata de como o IR expande o "Tempo Rural Efetivamente
 * Reconhecido" nao foi derivada com certeza. Usando logica observada:
 * - Sem vinculos urbanos: rural = duracao(inicioAtividade, der)
 * - Com vinculos: rural = periodo antes do primeiro vinculo
 *   + periodo apos ultima Prova de Retorno (se houver PR apos ultimo vinculo)
 */
function _calcularMesesRural(inicioAtividade, der, vinculosUrbanos, provasRetorno) {
  if (vinculosUrbanos.length === 0) {
    // Sem vinculos: todo periodo de inicioAtividade ate DER
    return duracaoMeses(inicioAtividade, der)
  }

  // Ordenar vinculos por data de inicio
  const vincOrdenados = [...vinculosUrbanos].sort(
    (a, b) => mesParaAbsoluto(a.inicio) - mesParaAbsoluto(b.inicio)
  )
  // Ordenar provas de retorno por data
  const provasOrdenadas = [...provasRetorno].sort(
    (a, b) => mesParaAbsoluto(a) - mesParaAbsoluto(b)
  )

  // Regra 2: Vinculo Urbano interrompe carencia rural
  // Periodo antes do primeiro vinculo
  const primeiroVinculo = vincOrdenados[0]
  let rural = duracaoMeses(inicioAtividade, primeiroVinculo.inicio)
  if (rural < 0) rural = 0

  // Regra 3: Prova de Retorno nao retroage — tempo rural valido so A PARTIR da data da PR
  const ultimoVinculo = vincOrdenados[vincOrdenados.length - 1]
  const provasAposUltimoVinculo = provasOrdenadas.filter(
    (pr) => mesParaAbsoluto(pr) > mesParaAbsoluto(ultimoVinculo.fim)
  )

  if (provasAposUltimoVinculo.length > 0) {
    const primeiraPRValida = provasAposUltimoVinculo[0]
    const periodoPosPR = duracaoMeses(primeiraPRValida, der)
    if (periodoPosPR > 0) {
      rural += periodoPosPR
    }
  }

  return rural < 0 ? 0 : rural
}

/** Soma duracao de todos os vinculos urbanos */
function _calcularMesesUrbanos(vinculosUrbanos) {
  return vinculosUrbanos.reduce(
    (acc, v) => acc + duracaoMeses(v.inicio, v.fim),
    0
  )
}
