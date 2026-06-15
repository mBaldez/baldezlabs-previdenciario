# Fase 3 — Redesign Visual Unificado "Tudo na Linha" — Plano de Implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as visualizacoes atuais de `ModeloHorizontal.jsx` (faixas
flutuantes + fundo zebrado) e `ModeloCurvas.jsx` (grade "JANELA X — N MESES")
por um eixo de linha do tempo compartilhado (`EixoLinhaDoTempo`) onde carencia
reconhecida, vinculos urbanos, incapacidades, IRs numerados, PR, DER e Inicio
aparecem todos sobre a mesma linha — conforme
`docs/plans/2026-06-15-fase3-redesign-visual-design.md` (spec aprovado).

**Architecture:** Nova camada `lib/eixo.js` (classificacao de mes, numeracao de
IRs, e `prepararDadosEixo` que converte os dados do banco e chama
`segmentosCarencia` — nova funcao em `calculo.js`). Novo componente puro
`EixoLinhaDoTempo.jsx` (SVG de uma fileira). `ModeloHorizontal.jsx` e
`ModeloCurvas.jsx` passam a ser wrappers finos que chamam `prepararDadosEixo`
uma vez e renderizam 1 (Horizontal) ou N (Curvas, ~8 anos/fileira com setas
curvas) fileiras de `EixoLinhaDoTempo`. `Legenda.jsx` ganha o item "Sem
cobertura" e renomeia "Carencia (janelas de 90 meses)" -> "Carencia
reconhecida".

**Tech Stack:** React 18 + Vite, Vitest (testes de `calculo.js`/`lib/eixo.js`),
Playwright MCP (verificacao visual final).

---

## Visao geral dos arquivos

| Arquivo | Acao |
|---|---|
| `linha-do-tempo/app/src/lib/calculo.js` | Modificar — nova `segmentosCarencia()`, `uniaoIntervalos()` interna |
| `linha-do-tempo/app/tests/calculo.test.js` | Modificar — testes de `segmentosCarencia()` |
| `linha-do-tempo/app/src/lib/eixo.js` | Criar — `classificarMes`, `numerarIRs`, `prepararDadosEixo` |
| `linha-do-tempo/app/tests/eixo.test.js` | Criar — testes de `lib/eixo.js` |
| `linha-do-tempo/app/src/components/editor/visualizacao/EixoLinhaDoTempo.jsx` | Criar — componente de fileira do eixo |
| `linha-do-tempo/app/src/components/editor/visualizacao/ModeloHorizontal.jsx` | Reescrever — wrapper fino |
| `linha-do-tempo/app/src/components/editor/visualizacao/ModeloCurvas.jsx` | Reescrever — wrapper fino (serpentina) |
| `linha-do-tempo/app/src/components/editor/visualizacao/Legenda.jsx` | Modificar — renomear item + novo item |

Nenhum outro arquivo precisa mudar: `ViewLinhaDoTempo.jsx` ja passa
`timeline, vinculos, provas, irs, incapacidades` (formato DB) para
`ModeloHorizontal`/`ModeloCurvas`, que e exatamente o que `prepararDadosEixo`
espera.

---

### Task 1: `segmentosCarencia()` em `calculo.js`

**Files:**
- Modify: `linha-do-tempo/app/src/lib/calculo.js:35-54` (substituir `totalUniao`), e apos linha 145 (nova funcao exportada)
- Test: `linha-do-tempo/app/tests/calculo.test.js:1` (import) e fim do arquivo (novo `describe`)

- [ ] **Step 1: Escrever os 4 testes (falhando)**

Em `linha-do-tempo/app/tests/calculo.test.js`, troque a linha 1:

```js
import { calcularCarencia, duracaoMeses, mesParaAbsoluto } from '../src/lib/calculo'
```

por:

```js
import { calcularCarencia, duracaoMeses, mesParaAbsoluto, segmentosCarencia } from '../src/lib/calculo'
```

Adicione no final do arquivo (apos o `describe('Janela de 90 meses...')`, que
termina na linha 210):

```js

// --- segmentosCarencia (Fase 3 — segmentos para a visualizacao) ---
describe('segmentosCarencia', () => {
  test('IR cobre todo o periodo declarado -> 1 segmento igual ao periodo declarado', () => {
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2018),
      der: MY(12, 2020),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(12, 2020)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(1, 2018)), fim: mesParaAbsoluto(MY(12, 2020)) },
    ])
  })

  test('periodo declarado > 90 meses: segmento fica limitado a janela do IR', () => {
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2000),
      der: MY(12, 2020),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(12, 2020)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(6, 2013)), fim: mesParaAbsoluto(MY(12, 2020)) },
    ])
  })

  test('2 IRs com janelas sobrepostas -> 1 segmento (uniao, sem duplicar)', () => {
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2010),
      der: MY(6, 2026),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(1, 2013), MY(1, 2014)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(1, 2010)), fim: mesParaAbsoluto(MY(1, 2014)) },
    ])
  })

  test('2 IRs com janelas NAO sobrepostas: 2 segmentos com buraco entre eles', () => {
    const segs = segmentosCarencia({
      inicioAtividade: MY(1, 2000),
      der: MY(12, 2025),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(12, 2007), MY(12, 2020)],
    })
    expect(segs).toEqual([
      { inicio: mesParaAbsoluto(MY(6, 2000)), fim: mesParaAbsoluto(MY(12, 2007)) },
      { inicio: mesParaAbsoluto(MY(6, 2013)), fim: mesParaAbsoluto(MY(12, 2020)) },
    ])
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd linha-do-tempo/app && npx vitest run tests/calculo.test.js`
Expected: FAIL — `segmentosCarencia is not a function` (ou `undefined`) nos 4
novos testes; os demais (18) continuam passando.

- [ ] **Step 3: Implementar `uniaoIntervalos` + `segmentosCarencia`**

Em `linha-do-tempo/app/src/lib/calculo.js`, substitua as linhas 35-54
(funcao `totalUniao` inteira) por:

```js
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
```

Depois, imediatamente apos o fechamento de `calcularCarencia` (apos a linha
`145` que hoje e `}`), insira a nova funcao exportada:

```js

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
```

- [ ] **Step 4: Rodar e confirmar sucesso (suite completa)**

Run: `cd linha-do-tempo/app && npx vitest run`
Expected: PASS — 29/29 (25 existentes + 4 novos). `calcularCarencia` continua
correto porque `totalUniao` so mudou de implementacao interna (via
`uniaoIntervalos`), nao de resultado.

- [ ] **Step 5: Commit**

```bash
git add linha-do-tempo/app/src/lib/calculo.js linha-do-tempo/app/tests/calculo.test.js
git commit -m "feat: segmentosCarencia() — segmentos de carencia para visualizacao (Fase 3)"
```

---

### Task 2: `lib/eixo.js` — `classificarMes`, `numerarIRs`, `prepararDadosEixo`

**Files:**
- Create: `linha-do-tempo/app/src/lib/eixo.js`
- Create: `linha-do-tempo/app/tests/eixo.test.js`

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `linha-do-tempo/app/tests/eixo.test.js`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd linha-do-tempo/app && npx vitest run tests/eixo.test.js`
Expected: FAIL — `Failed to resolve import "../src/lib/eixo"` (arquivo nao existe ainda).

- [ ] **Step 3: Implementar `lib/eixo.js`**

Crie `linha-do-tempo/app/src/lib/eixo.js`:

```js
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
```

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `cd linha-do-tempo/app && npx vitest run`
Expected: PASS — 29 (Task 1) + 7 novos = 36/36.

- [ ] **Step 5: Commit**

```bash
git add linha-do-tempo/app/src/lib/eixo.js linha-do-tempo/app/tests/eixo.test.js
git commit -m "feat: lib/eixo.js — classificarMes, numerarIRs, prepararDadosEixo (Fase 3)"
```

---

### Task 3: Novo componente `EixoLinhaDoTempo.jsx`

**Files:**
- Create: `linha-do-tempo/app/src/components/editor/visualizacao/EixoLinhaDoTempo.jsx`

Sem teste unitario isolado (componente SVG puro) — verificado visualmente na
Task 7 (Playwright), em conjunto com `ModeloHorizontal`/`ModeloCurvas`.

- [ ] **Step 1: Criar o componente**

Crie `linha-do-tempo/app/src/components/editor/visualizacao/EixoLinhaDoTempo.jsx`:

```jsx
import { mesParaAbsoluto } from '../../../lib/calculo'

export const ANO_WIDTH = 80
export const MES_WIDTH = ANO_WIDTH / 12
export const SVG_HEIGHT = 220
export const BASE_Y = 120
export const TICK_H = 20

export const COR = {
  vinculo: '#3498db',
  incapacidade: '#f1c40f',
  carencia: '#e67e22',
  semCobertura: '#BDC3C7',
  ir: '#27ae60',
  provaRetorno: '#e74c3c',
  der: '#e74c3c',
  navy: '#0B1F3A',
  navyTint: '#D0D8E0',
}

export function xParaMes(mesAbs, anoInicio) {
  return (mesAbs - anoInicio * 12 - 1) * MES_WIDTH
}

export function larguraAnos(anoInicio, anoFim) {
  return (anoFim - anoInicio + 1) * ANO_WIDTH
}

/**
 * Renderiza uma fileira do eixo da linha do tempo: anos/ticks, barra colorida
 * por categoria de mes, IRs numerados, Provas de Retorno, DER e Inicio.
 * Props ja "prontas" (ver lib/eixo.js prepararDadosEixo): categoriaPorMes e
 * irs sao calculados uma vez pelo wrapper e compartilhados entre fileiras.
 */
export function EixoLinhaDoTempo({ anoInicio, anoFim, categoriaPorMes, irs, provas, der, inicio }) {
  const totalWidth = larguraAnos(anoInicio, anoFim)
  const anos = Array.from({ length: anoFim - anoInicio + 1 }, (_, i) => anoInicio + i)

  const mesInicial = anoInicio * 12 + 1
  const mesFinal = anoFim * 12 + 12
  const meses = []
  for (let m = mesInicial; m <= mesFinal; m++) meses.push(m)

  const derMesAbs = mesParaAbsoluto(der)
  const inicioMesAbs = mesParaAbsoluto(inicio)
  const mostrarDer = derMesAbs >= mesInicial && derMesAbs <= mesFinal
  const mostrarInicio = inicioMesAbs >= mesInicial && inicioMesAbs <= mesFinal

  return (
    <svg width={totalWidth} height={SVG_HEIGHT} style={{ display: 'block', minWidth: '100%' }}>
      {/* Barra colorida por mes, sobre o eixo */}
      {meses.map(mesAbs => {
        const categoria = categoriaPorMes(mesAbs)
        return (
          <rect
            key={`mes-${mesAbs}`}
            x={xParaMes(mesAbs, anoInicio)} y={BASE_Y - 8}
            width={MES_WIDTH} height={16}
            fill={COR[categoria === 'sem_cobertura' ? 'semCobertura' : categoria]}
          />
        )
      })}

      {/* Ticks e labels dos anos */}
      {anos.map(ano => {
        const x = (ano - anoInicio) * ANO_WIDTH
        return (
          <g key={`tick-${ano}`}>
            <line x1={x} y1={BASE_Y - TICK_H} x2={x} y2={BASE_Y + TICK_H} stroke={COR.navy} strokeWidth={1} />
            <text x={x + ANO_WIDTH / 2} y={SVG_HEIGHT - 8} textAnchor="middle" fontSize={11} fill={COR.navy} fontFamily="Georgia, serif">
              {ano}
            </text>
          </g>
        )
      })}
      <line x1={totalWidth} y1={BASE_Y - TICK_H} x2={totalWidth} y2={BASE_Y + TICK_H} stroke={COR.navy} strokeWidth={1} />

      {/* IRs numerados */}
      {irs.map(ir => {
        const x = xParaMes(mesParaAbsoluto(ir), anoInicio) + MES_WIDTH / 2
        return (
          <g key={`ir-${ir.numero}`}>
            <line x1={x} y1={BASE_Y - 26} x2={x} y2={BASE_Y + 12} stroke={COR.ir} strokeWidth={2} />
            <circle cx={x} cy={BASE_Y - 34} r={8} fill={COR.ir} />
            <text x={x} y={BASE_Y - 34} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="white" fontWeight="bold">
              {ir.numero}
            </text>
          </g>
        )
      })}

      {/* Provas de Retorno */}
      {provas.map((pr, i) => {
        const x = xParaMes(mesParaAbsoluto(pr), anoInicio) + MES_WIDTH / 2
        return (
          <circle key={`pr-${i}`} cx={x} cy={BASE_Y} r={5} fill={COR.provaRetorno} stroke="white" strokeWidth={1.5} />
        )
      })}

      {/* DER */}
      {mostrarDer && (() => {
        const x = xParaMes(derMesAbs, anoInicio) + MES_WIDTH / 2
        return (
          <g>
            <line x1={x} y1={BASE_Y - 18} x2={x} y2={BASE_Y + 18} stroke={COR.der} strokeWidth={2} />
            <text x={x + 4} y={BASE_Y + 32} fontSize={10} fill={COR.der} fontWeight="bold">DER</text>
          </g>
        )
      })()}

      {/* Inicio da Atividade Rural */}
      {mostrarInicio && (() => {
        const x = xParaMes(inicioMesAbs, anoInicio) + MES_WIDTH / 2
        return (
          <g>
            <line x1={x} y1={BASE_Y - 18} x2={x} y2={BASE_Y + 18} stroke={COR.navy} strokeWidth={2} />
            <text x={x + 4} y={BASE_Y - 24} fontSize={10} fill={COR.navy} fontWeight="bold">Inicio</text>
          </g>
        )
      })()}
    </svg>
  )
}
```

- [ ] **Step 2: Build check**

Run: `cd linha-do-tempo/app && npx vite build`
Expected: build sem erros (componente ainda nao e usado por nenhum outro
arquivo, mas precisa compilar sem erros de sintaxe/import).

- [ ] **Step 3: Commit**

```bash
git add linha-do-tempo/app/src/components/editor/visualizacao/EixoLinhaDoTempo.jsx
git commit -m "feat: EixoLinhaDoTempo — fileira compartilhada do eixo da linha do tempo (Fase 3)"
```

---

### Task 4: Reescrever `ModeloHorizontal.jsx` (wrapper fino)

**Files:**
- Modify: `linha-do-tempo/app/src/components/editor/visualizacao/ModeloHorizontal.jsx` (reescrita completa, 213 -> ~25 linhas)

- [ ] **Step 1: Substituir o conteudo do arquivo**

Substitua **todo o conteudo** de
`linha-do-tempo/app/src/components/editor/visualizacao/ModeloHorizontal.jsx` por:

```jsx
import { prepararDadosEixo } from '../../../lib/eixo'
import { EixoLinhaDoTempo } from './EixoLinhaDoTempo'

export function ModeloHorizontal({ timeline, vinculos, provas, irs, incapacidades }) {
  if (!timeline) return null

  const { anoInicio, anoFim, categoriaPorMes, irsNumerados, provasConvertidas, der, inicioAtividade } =
    prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades })

  if (anoFim < anoInicio) return <p style={{ color: '#999' }}>Periodo invalido.</p>

  return (
    <div
      id="area-timeline"
      style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', padding: '8px' }}
    >
      <EixoLinhaDoTempo
        anoInicio={anoInicio}
        anoFim={anoFim}
        categoriaPorMes={categoriaPorMes}
        irs={irsNumerados}
        provas={provasConvertidas}
        der={der}
        inicio={inicioAtividade}
      />
    </div>
  )
}
```

Isso remove `COR`, `ANO_WIDTH`, `SVG_HEIGHT`, `BASE_Y`, `TICK_H`, `FAIXA_TOP`,
`xParaMes`, `larguraMeses` locais (todos substituidos pelo equivalente em
`EixoLinhaDoTempo.jsx`), o fundo zebrado, as faixas soltas de vinculo/incapacidade,
e o `fimAno = der_ano + 1` (agora `anoFim = der_ano`, sem a folga de +1 ano —
ver "Contrato de dados" no spec).

- [ ] **Step 2: Rodar a suite completa**

Run: `cd linha-do-tempo/app && npx vitest run`
Expected: PASS — 36/36 (nada relacionado a calculo muda).

- [ ] **Step 3: Build check**

Run: `cd linha-do-tempo/app && npx vite build`
Expected: build sem erros.

- [ ] **Step 4: Commit**

```bash
git add linha-do-tempo/app/src/components/editor/visualizacao/ModeloHorizontal.jsx
git commit -m "refactor: ModeloHorizontal -> wrapper fino sobre EixoLinhaDoTempo (Fase 3, #3)"
```

---

### Task 5: Reescrever `ModeloCurvas.jsx` (serpentina, ~8 anos/fileira)

**Files:**
- Modify: `linha-do-tempo/app/src/components/editor/visualizacao/ModeloCurvas.jsx` (reescrita completa, 183 linhas -> ~80 linhas)

- [ ] **Step 1: Substituir o conteudo do arquivo**

Substitua **todo o conteudo** de
`linha-do-tempo/app/src/components/editor/visualizacao/ModeloCurvas.jsx` por:

```jsx
import { prepararDadosEixo } from '../../../lib/eixo'
import { EixoLinhaDoTempo, larguraAnos } from './EixoLinhaDoTempo'

const ANOS_POR_FILEIRA = 8

export function ModeloCurvas({ timeline, vinculos, provas, irs, incapacidades }) {
  if (!timeline) return null

  const { anoInicio, anoFim, categoriaPorMes, irsNumerados, provasConvertidas, der, inicioAtividade } =
    prepararDadosEixo({ timeline, vinculos, provas, irs, incapacidades })

  if (anoFim < anoInicio) return <p style={{ color: '#999' }}>Periodo invalido.</p>

  // Divide o intervalo total em fileiras de ~8 anos (a ultima pode ser menor)
  const fileiras = []
  for (let inicio = anoInicio; inicio <= anoFim; inicio += ANOS_POR_FILEIRA) {
    const fim = Math.min(inicio + ANOS_POR_FILEIRA - 1, anoFim)
    fileiras.push({ anoInicio: inicio, anoFim: fim })
  }

  return (
    <div id="area-timeline" style={{ background: 'white', borderRadius: '8px', padding: '12px' }}>
      <div style={{ marginBottom: '12px', fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#0B1F3A', fontSize: '14px' }}>
        Linha do Tempo
      </div>

      {fileiras.map((fileira, idx) => {
        const largura = larguraAnos(fileira.anoInicio, fileira.anoFim)
        const irsFileira = irsNumerados.filter(ir => ir.ano >= fileira.anoInicio && ir.ano <= fileira.anoFim)
        const provasFileira = provasConvertidas.filter(p => p.ano >= fileira.anoInicio && p.ano <= fileira.anoFim)
        const temProximaFileira = idx < fileiras.length - 1

        return (
          <div key={idx} style={{ marginBottom: temProximaFileira ? '0' : '8px' }}>
            <EixoLinhaDoTempo
              anoInicio={fileira.anoInicio}
              anoFim={fileira.anoFim}
              categoriaPorMes={categoriaPorMes}
              irs={irsFileira}
              provas={provasFileira}
              der={der}
              inicio={inicioAtividade}
            />
            {temProximaFileira && (
              <svg width={largura} height={60} style={{ display: 'block' }}>
                <defs>
                  <marker id={`seta-curva-${idx}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill={COR_SETA} />
                  </marker>
                </defs>
                <path
                  d={`M ${largura - 4} 4 C ${largura - 4} 45, 30 45, 24 56`}
                  fill="none" stroke={COR_SETA} strokeWidth={2}
                  markerEnd={`url(#seta-curva-${idx})`}
                />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}

const COR_SETA = '#0B1F3A'
```

Notas sobre essa implementacao:
- Cada fileira "possui" um intervalo fechado `[fileira.anoInicio, fileira.anoFim]`
  e nao se sobrepoe a vizinha — IRs/PRs sao filtrados por `ano` (suficiente,
  pois os intervalos de anos das fileiras nao se sobrepoem). DER/Inicio sao
  passados para **todas** as fileiras; `EixoLinhaDoTempo` decide internamente
  em qual fileira desenhar (com base no mes absoluto).
- A seta curva fica numa faixa extra de 60px de altura abaixo de cada fileira
  (exceto a ultima), com o path inteiramente dentro de `[0,60]` (sem
  extrapolar o `viewBox` — evita o SVG cortar a curva), conectando
  visualmente o canto superior-direito ao canto inferior-esquerdo dessa
  faixa. N fileiras -> N-1 setas. O alinhamento vertical exato com a linha
  base (`BASE_Y`) de cada fileira e um ajuste fino da Task 7 (ex: reduzir a
  altura da fileira via margem negativa, ou ajustar os pontos do path, se a
  curva parecer "desconectada" do eixo).
- Sem `overflowX: auto` — cada fileira tem no maximo `ANOS_POR_FILEIRA * ANO_WIDTH`
  = 640px de largura, sem scroll horizontal (decisao #6 do spec).

- [ ] **Step 2: Rodar a suite completa**

Run: `cd linha-do-tempo/app && npx vitest run`
Expected: PASS — 36/36.

- [ ] **Step 3: Build check**

Run: `cd linha-do-tempo/app && npx vite build`
Expected: build sem erros.

- [ ] **Step 4: Commit**

```bash
git add linha-do-tempo/app/src/components/editor/visualizacao/ModeloCurvas.jsx
git commit -m "refactor: ModeloCurvas -> serpentina de EixoLinhaDoTempo (~8 anos/fileira), remove grade (Fase 3, #4/#6)"
```

---

### Task 6: Atualizar `Legenda.jsx`

**Files:**
- Modify: `linha-do-tempo/app/src/components/editor/visualizacao/Legenda.jsx:1-7`

- [ ] **Step 1: Editar o array `ITENS`**

Em `linha-do-tempo/app/src/components/editor/visualizacao/Legenda.jsx`, troque
as linhas 1-7:

```js
const ITENS = [
  { cor: '#e67e22', label: 'Carência (janelas de 90 meses)' },
  { cor: '#27ae60', label: 'Instrumentos Ratificadores (IR)' },
  { cor: '#3498db', label: 'Vínculo Urbano' },
  { cor: '#e74c3c', label: 'Prova de Retorno' },
  { cor: '#f1c40f', label: 'Gozo de Benefício por Incapacidade' },
]
```

por:

```js
const ITENS = [
  { cor: '#e67e22', label: 'Carência reconhecida' },
  { cor: '#27ae60', label: 'Instrumentos Ratificadores (IR)' },
  { cor: '#3498db', label: 'Vínculo Urbano' },
  { cor: '#e74c3c', label: 'Prova de Retorno' },
  { cor: '#f1c40f', label: 'Gozo de Benefício por Incapacidade' },
  { cor: '#BDC3C7', label: 'Sem cobertura' },
]
```

(A cor `#BDC3C7` e a mesma usada em `COR.semCobertura` no `EixoLinhaDoTempo.jsx`,
Task 3 — mantenha as duas em sincronia caso uma seja ajustada depois.)

- [ ] **Step 2: Build check**

Run: `cd linha-do-tempo/app && npx vite build`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add linha-do-tempo/app/src/components/editor/visualizacao/Legenda.jsx
git commit -m "feat: Legenda — renomeia 'Carencia (janelas de 90 meses)' -> 'Carencia reconhecida', adiciona 'Sem cobertura' (Fase 3, #3)"
```

---

### Task 7: Verificacao visual (Playwright) + ajustes finais

**Files:** nenhum arquivo novo necessariamente — esta task pode gerar pequenos
ajustes de estilo em `EixoLinhaDoTempo.jsx`, `ModeloHorizontal.jsx` ou
`ModeloCurvas.jsx` se algo nao parecer legivel no navegador.

- [ ] **Step 1: Iniciar o app**

Run: `cd linha-do-tempo/app && npm run dev` (em background — anote a porta,
geralmente `http://localhost:5173`).

- [ ] **Step 2: Login e abrir uma timeline com cenario completo**

Via Playwright MCP, navegue para a URL do dev server, faca login (credenciais
de teste — ver `marketing@baldezadvogados.com.br` usado na verificacao da Fase 2,
em `memory/project_linha_do_tempo_ciclo_ajustes.md`; se a senha nao estiver
disponivel, peca ao usuario).

Abra uma timeline que tenha, idealmente:
- pelo menos 1 Vinculo Urbano
- pelo menos 2 Instrumentos Ratificadores com janelas de 90 meses **nao
  sobrepostas** (para ver a faixa "Carencia" com um "buraco" — cenario #4 do
  spec)
- 1 Prova de Retorno
- DER e Inicio em anos diferentes

Se a timeline existente (`c4cb22d8-818a-4cbd-9be1-1938eecaa666`, usada na Fase 2)
nao tiver esse cenario, adicione os registros faltantes via UI (formularios de
Vinculos/IRs/Provas ja existentes).

- [ ] **Step 3: Verificar "Linha do Tempo" (ModeloHorizontal)**

Selecione o modelo "Linha do Tempo" (horizontal) e tire um screenshot
(`browser_take_screenshot`). Confirme visualmente:
- uma unica fileira, com a barra colorida diretamente sobre o eixo (sem faixa
  flutuante, sem fundo zebrado)
- trecho laranja (carencia) com um "buraco" cinza claro entre os 2 IRs
- bloco azul do vinculo sobre a linha
- IRs como badges verdes numerados (1, 2, ...) acima da linha
- marcador "DER" e "Inicio" compactos, sobre a linha
- container com scroll horizontal se o periodo for longo

- [ ] **Step 4: Verificar "Modelo Curvas" (serpentina)**

Selecione o modelo "Curvas" e tire um screenshot. Confirme visualmente:
- N fileiras de ~8 anos cada, empilhadas, sem scroll horizontal
- setas curvas conectando canto direito de uma fileira ao canto esquerdo da
  proxima (N-1 setas para N fileiras). Se a curva parecer "flutuando" sem
  tocar a linha base de cada fileira, ajuste o path/altura da faixa
  (ver nota na Task 5) — isso e esperado precisar de 1 iteracao de ajuste.
- mesmas cores/marcadores da Task 3, sem a grade antiga "JANELA X — N MESES"
- IR/DER/Inicio aparecem na fileira correta (sem duplicacao, sem ficar de fora)

- [ ] **Step 5: Verificar Legenda**

Confirme que a Legenda mostra 6 itens, incluindo "Carencia reconhecida" e
"Sem cobertura" (cinza, mesma cor da faixa sem cobertura no eixo).

- [ ] **Step 6: Ajustes finais (se necessario) + commit**

Se algo precisar de ajuste visual (ex: espacamento, posicao de labels), edite
o(s) arquivo(s) relevante(s), rode `npx vitest run` de novo para garantir que
nada quebrou, e commit:

```bash
git add linha-do-tempo/app/src/components/editor/visualizacao/
git commit -m "fix: ajustes visuais finais do redesign Fase 3 (apos verificacao Playwright)"
```

Se nada precisar de ajuste, esta task termina sem commit adicional.

---

## Resumo de testes esperado ao final

- `tests/calculo.test.js`: 29 testes (25 existentes + 4 de `segmentosCarencia`)
- `tests/eixo.test.js`: 7 testes (5 `classificarMes` + 1 `numerarIRs` + 1 `prepararDadosEixo`)
- **Total: 36/36 passando**
