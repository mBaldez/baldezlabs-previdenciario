/**
 * Motor de calculo de carencia previdenciaria rural.
 *
 * Logica baseada no Oficio-Circular 46/DIRBEN/INSS (13/09/2019): a DER ancora blocos
 * retroativos de 90 meses (DER-90, DER-180, ...); cada IR que cair dentro de um bloco
 * valida o bloco inteiro. O periodo rural reconhecido e a uniao das intersecoes entre
 * os blocos validados e os periodos rurais autodeclarados.
 * Ver carencia_rural_90_meses_oficio46.md na raiz do repo.
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

/**
 * Gera blocos de 90 meses ancorados na DER, retroativos ate inicioAtividade.
 * Retorna [{inicio, fim}] em meses absolutos, do mais recente ao mais antigo.
 * O ultimo bloco pode comecar antes de inicioAtividade — a intersecao com o
 * periodo declarado e responsavel por aparar a borda.
 */
export function janelasDerAncoradas(der, inicioAtividade) {
  const derAbs = mesParaAbsoluto(der)
  const inicioAbs = mesParaAbsoluto(inicioAtividade)
  const janelas = []
  let fim = derAbs
  while (fim > inicioAbs) {
    janelas.push({ inicio: fim - JANELA_INSTRUMENTO_MESES, fim })
    fim -= JANELA_INSTRUMENTO_MESES
  }
  return janelas
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
    const janelas = janelasDerAncoradas(der, inicioAtividade)
    const janelaValidadas = janelas.filter((j) =>
      instrumentosRatificadores.some((ir) => {
        const irAbs = mesParaAbsoluto(ir)
        return irAbs >= j.inicio && irAbs <= j.fim
      })
    )
    if (janelaValidadas.length > 0) {
      const segmentos = segmentosRuraisDeclarados(inicioAtividade, der, vinculosUrbanos, provasRetorno)
      const intersecoes = segmentos.flatMap((seg) => janelaValidadas.map((j) => intersecao(seg, j)))
      mesesRural = totalUniao(intersecoes)
    }
  }

  const mesesUrbanos = _calcularMesesUrbanos(vinculosUrbanos)

  if (tipoBeneficio === 'hibrida') {
    return { rural: mesesRural, urbano: mesesUrbanos, total: mesesRural + mesesUrbanos }
  }

  return { rural: mesesRural, total: mesesRural }
}

/**
 * Segmentos de carencia rural reconhecidos: blocos de 90 meses ancorados na DER
 * que contenham pelo menos um IR, intersectados com os periodos rurais declarados.
 * Devolve [{inicio, fim}] em meses absolutos — usado pela visualizacao para desenhar
 * a faixa de carencia com "buracos" (blocos sem IR aparecem em cinza).
 */
export function segmentosCarencia({ inicioAtividade, der, vinculosUrbanos, provasRetorno, instrumentosRatificadores }) {
  if (instrumentosRatificadores.length === 0) return []

  const janelas = janelasDerAncoradas(der, inicioAtividade)
  const janelaValidadas = janelas.filter((j) =>
    instrumentosRatificadores.some((ir) => {
      const irAbs = mesParaAbsoluto(ir)
      return irAbs >= j.inicio && irAbs <= j.fim
    })
  )
  if (janelaValidadas.length === 0) return []

  const segmentos = segmentosRuraisDeclarados(inicioAtividade, der, vinculosUrbanos, provasRetorno)
  const intersecoes = segmentos.flatMap((seg) => janelaValidadas.map((j) => intersecao(seg, j)))
  return uniaoIntervalos(intersecoes)
}

/** Soma duracao de todos os vinculos urbanos */
function _calcularMesesUrbanos(vinculosUrbanos) {
  return vinculosUrbanos.reduce(
    (acc, v) => acc + duracaoMeses(v.inicio, v.fim),
    0
  )
}
