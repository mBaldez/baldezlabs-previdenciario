/**
 * Parser client-side de CNIS (Cadastro Nacional de Informações Sociais) do INSS.
 * Usa PDF.js para extrair texto e buscar vínculos empregatícios.
 *
 * IMPORTANTE: O parser procura por padrões de texto específicos do extrato CNIS oficial.
 * PDFs que não sejam CNIS do INSS não serão reconhecidos — isso é intencional.
 */

const MESES_MAP = {
  'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
  'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12,
}

/**
 * Tenta parsear uma data no formato "MM/AAAA" ou "MM-AAAA"
 * @returns {{ mes: number, ano: number } | null}
 */
function parsarData(str) {
  const match = str.match(/(\d{2})[\/\-](\d{4})/)
  if (!match) return null
  return { mes: parseInt(match[1]), ano: parseInt(match[2]) }
}

/**
 * Extrai vínculos do texto bruto de um CNIS.
 * Procura por padrões como "NIT", "CNPJ", datas de admissão/desligamento.
 */
function extrairVinculosDoTexto(textoCompleto) {
  const vinculos = []

  // Padrão simplificado: busca blocos com datas no formato MM/AAAA seguidas de outra data
  // O CNIS real tem padrões como:
  // "Competência: MM/AAAA a MM/AAAA"
  // ou tabelas com Seq | Empregador | Admissão | Desligamento
  const linhas = textoCompleto.split('\n').map(l => l.trim()).filter(Boolean)

  let empregadorAtual = null
  let admissaoAtual = null

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]

    // Detectar nome de empregador (heurística: linha com CNPJ ou NIT)
    if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(linha)) {
      // CNPJ encontrado — linha anterior provavelmente é o nome
      empregadorAtual = (linhas[i - 1] || 'Empresa').substring(0, 60)
    }

    // Detectar datas de admissão/desligamento
    const datasNaLinha = linha.match(/\d{2}\/\d{4}/g)
    if (datasNaLinha && datasNaLinha.length >= 2 && empregadorAtual) {
      const inicio = parsarData(datasNaLinha[0])
      const fim = parsarData(datasNaLinha[1])
      if (inicio && fim && fim.ano >= inicio.ano) {
        vinculos.push({
          origem: empregadorAtual,
          inicio_mes: inicio.mes,
          inicio_ano: inicio.ano,
          fim_mes: fim.mes,
          fim_ano: fim.ano,
        })
        empregadorAtual = null
        admissaoAtual = null
      }
    }
  }

  return vinculos
}

/**
 * Extrai vínculos de um arquivo PDF de CNIS.
 * @param {File} arquivo - O arquivo PDF do CNIS
 * @returns {Promise<Array<{origem, inicio_mes, inicio_ano, fim_mes, fim_ano}>>}
 * @throws {Error} Se o PDF não for reconhecido como CNIS
 */
export async function parsearCnis(arquivo) {
  // Import dinâmico do PDF.js para não bloquear o bundle principal
  const pdfjsLib = await import('pdfjs-dist')

  // Configurar worker (necessário para PDF.js)
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href

  const arrayBuffer = await arquivo.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let textoCompleto = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i)
    const conteudo = await pagina.getTextContent()
    const textoDaPagina = conteudo.items.map(item => item.str).join('\n')
    textoCompleto += textoDaPagina + '\n'
  }

  // Verificar se parece um CNIS
  const isCnis = textoCompleto.toLowerCase().includes('cnis') ||
    textoCompleto.toLowerCase().includes('cadastro nacional') ||
    textoCompleto.toLowerCase().includes('inss') ||
    textoCompleto.toLowerCase().includes('nit')

  if (!isCnis) {
    throw new Error(`${arquivo.name}: Nenhum documento CNIS encontrado no PDF. Verifique se é um extrato CNIS do INSS.`)
  }

  const vinculos = extrairVinculosDoTexto(textoCompleto)

  if (vinculos.length === 0) {
    console.warn('CNIS reconhecido mas nenhum vínculo extraído. O formato pode variar.')
    // Não joga erro — retorna array vazio e deixa o usuário cadastrar manualmente
  }

  return vinculos
}
