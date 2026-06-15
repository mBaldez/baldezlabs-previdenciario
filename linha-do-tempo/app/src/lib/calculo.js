/**
 * Motor de calculo de carencia previdenciaria rural.
 *
 * Logica baseada no Oficio-Circular 46/DIRBEN/INSS (13/09/2019): cada instrumento
 * ratificador (IR) abre uma janela de 90 meses retroativos a partir da sua data;
 * o periodo rural reconhecido e a uniao das intersecoes entre essas janelas e os
 * periodos rurais autodeclarados. Ver carencia_rural_90_meses_oficio46.md na raiz do repo.
 */

const JANELA_INSTRUMENTO_MESES = 90

/** Converte {mes, ano} para numero absoluto de meses */
export function mesParaAbsoluto({ mes, ano }) {
  return ano * 12 + mes
}

/** Duracao em meses entre dois {mes, ano} (exclusivo no fim) */
export function duracaoMeses(inicio, fim) {
  return (fim.ano - inicio.ano) * 12 + (fim.mes - inicio.mes)
}

/** Janela de retroatividade de um IR: 90 meses antes da sua data, ate a sua data */
function janelaInstrumento(dataIR) {
  const fim = mesParaAbsoluto(dataIR)
  return { inicio: fim - JANELA_INSTRUMENTO_MESES, fim }
}

/** Intersecao entre dois intervalos [inicio, fim) em meses absolutos. Retorna null se vazia. */
function intersecao(a, b) {
  const inicio = Math.max(a.inicio, b.inicio)
  const fim = Math.min(a.fim, b.fim)
  return inicio < fim ? { inicio, fim } : null
}

/** Uniao de intervalos [inicio, fim), mesclando sobreposicoes. Ordenada por inicio. */
function uniaoIntervalos(intervalos) {
  const validos = intervalos.filter(Boolean).sort((a, b) => a.inicio - b.inicio)
  if (validos.length === 0) return []

  const uniao = []
  let atual = { ...validos[0] }

  for (let i = 1; i < validos.length; i++) {
    const seg = validos[i]
    if (seg.inicio <= atual.fim) {
      atual.fim = Math.max(atual.fim, seg.fim)
    } else {
      uniao.push(atual)
      atual = { ...seg }
    }
  }
  uniao.push(atual)
  return uniao
}

/** Soma a duracao da uniao de intervalos, sem contar overlap duas vezes */
function totalUniao(intervalos) {
  return uniaoIntervalos(intervalos).reduce((acc, seg) => acc + (seg.fim - seg.inicio), 0)
}

/**
 * Segmentos do periodo rural autodeclarado (em meses absolutos, [inicio, fim)).
 * Cada vinculo urbano interrompe o periodo rural; uma Prova de Retorno (PR)
 * posterior ao fim do vinculo reabre o reconhecimento a partir da data da PR
 * (regra: PR nao retroage).
 */
function segmentosRuraisDeclarados(inicioAtividade, der, vinculosUrbanos, provasRetorno) {
  const inicioAbs = mesParaAbsoluto(inicioAtividade)
  const derAbs = mesParaAbsoluto(der)

  if (vinculosUrbanos.length === 0) {
    return [{ inicio: inicioAbs, fim: derAbs }]
  }

  const vinculos = [...vinculosUrbanos].sort(
    (a, b) => mesParaAbsoluto(a.inicio) - mesParaAbsoluto(b.inicio)
  )
  const provas = [...provasRetorno].sort(
    (a, b) => mesParaAbsoluto(a) - mesParaAbsoluto(b)
  )

  const segmentos = []
  let cursor = inicioAbs

  for (let i = 0; i < vinculos.length; i++) {
    const vInicio = mesParaAbsoluto(vinculos[i].inicio)
    const vFim = mesParaAbsoluto(vinculos[i].fim)
    const proximoInicio = i + 1 < vinculos.length
      ? mesParaAbsoluto(vinculos[i + 1].inicio)
      : derAbs

    if (vInicio > cursor) {
      segmentos.push({ inicio: cursor, fim: vInicio })
    }

    // PR nao retroage: vale a primeira PR a partir do fim do vinculo
    const pr = provas.find(
      (p) => mesParaAbsoluto(p) >= vFim && mesParaAbsoluto(p) < proximoInicio
    )
    cursor = pr ? mesParaAbsoluto(pr) : proximoInicio
  }

  if (cursor < derAbs) {
    segmentos.push({ inicio: cursor, fim: derAbs })
  }

  return segmentos
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
  let mesesRural = 0

  if (instrumentosRatificadores.length > 0) {
    const segmentos = segmentosRuraisDeclarados(inicioAtividade, der, vinculosUrbanos, provasRetorno)
    const janelas = instrumentosRatificadores.map(janelaInstrumento)
    const intersecoes = segmentos.flatMap((seg) => janelas.map((j) => intersecao(seg, j)))
    mesesRural = totalUniao(intersecoes)
  }

  const mesesUrbanos = _calcularMesesUrbanos(vinculosUrbanos)

  if (tipoBeneficio === 'hibrida') {
    return { rural: mesesRural, urbano: mesesUrbanos, total: mesesRural + mesesUrbanos }
  }

  return { rural: mesesRural, total: mesesRural }
}

/**
 * Segmentos de carencia rural reconhecidos: uniao das intersecoes entre os
 * periodos rurais autodeclarados e as janelas de 90 meses de cada instrumento
 * ratificador. Mesma logica de calcularCarencia, mas devolve os segmentos
 * {inicio, fim} (meses absolutos) em vez de so o total — usado pela
 * visualizacao (Fase 3) para desenhar a faixa de carencia com "buracos".
 */
export function segmentosCarencia({ inicioAtividade, der, vinculosUrbanos, provasRetorno, instrumentosRatificadores }) {
  if (instrumentosRatificadores.length === 0) return []

  const segmentos = segmentosRuraisDeclarados(inicioAtividade, der, vinculosUrbanos, provasRetorno)
  const janelas = instrumentosRatificadores.map(janelaInstrumento)
  const intersecoes = segmentos.flatMap((seg) => janelas.map((j) => intersecao(seg, j)))
  return uniaoIntervalos(intersecoes)
}

/** Soma duracao de todos os vinculos urbanos */
function _calcularMesesUrbanos(vinculosUrbanos) {
  return vinculosUrbanos.reduce(
    (acc, v) => acc + duracaoMeses(v.inicio, v.fim),
    0
  )
}
