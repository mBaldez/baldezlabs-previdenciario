# Fase 3 — Redesign Visual Unificado "Tudo na Linha" (Design)

> Spec de design (skills:brainstorming). Resolve os problemas #3, #4 e #6 do
> `1 ciclo de ajustes.docx` (raiz do repo) e a Nota de Escopo "Fase 3" de
> `docs/plans/2026-06-15-ciclo-de-ajustes.md`. Apos aprovacao, seguir para
> skills:writing-plans.

## Contexto e objetivo

O `.docx` resume o pedido numa frase: **"é uma linha, logo tem de ter um
design de tudo na linha"**. Hoje:

- **#3** — em `ModeloHorizontal.jsx`, Vinculos Urbanos e Beneficios por
  Incapacidade ficam numa "faixa" solta acima do eixo (`FAIXA_TOP=10`),
  desconectados da linha do tempo, sobre um fundo "zebrado".
- **#4** — `ModeloCurvas.jsx` renderiza uma grade tipo calendario
  ("JANELA X — N MESES", celulas de 90 meses por janela de IR). O usuario
  considera isso "totalmente fora do proposito" de uma linha do tempo.
- **#6** — Instrumentos Ratificadores (IRs) aparecem como linhas verdes sem
  numero; no sistema parametro, quando ha varios IRs eles ficam marcados
  na linha com numero sequencial (1, 2, 3...).

A imagem `image11.png` (extraida do docx, sistema parametro) resolve os 3
problemas em um unico desenho: uma linha do tempo onde **tudo** —
periodo de carencia, vinculos, IRs numerados, prova de retorno, DER —
fica desenhado sobre o mesmo eixo.

A Fase 1 (ja commitada em `2d218db`) corrigiu o motor de calculo
(`calculo.js`) para reconhecer corretamente os periodos de carencia rural
(janelas de 90 meses por IR), mas esse resultado ainda nao aparece em
lugar nenhum da interface. Esta Fase 3 e tambem o que torna esse resultado
visivel.

## Decisoes de design (resumo do brainstorming)

1. Uma **peca de desenho compartilhada** ("eixo da linha do tempo") e usada
   pelos dois modelos existentes (Horizontal e Curvas) — evita reescrever
   o SVG duas vezes e mantem os dois sempre consistentes.
2. **Camada unica de cor por mes** (não fileiras paralelas): cada mes da
   linha recebe UMA cor, de acordo com sua categoria.
3. A faixa de **Carencia (laranja)** mostra o resultado **corrigido** do
   motor da Fase 1 — pode ter "buracos" (trechos sem cor) onde o periodo
   declarado nao cai em nenhuma janela de 90 meses de IR. Isso e
   informacao util para o usuario (mostra onde falta cobertura documental).
4. IRs numerados por **ordem cronologica** das datas (mais antigo = 1).
5. DER e Inicio da Atividade Rural deixam de ser linhas tracejadas de
   altura total e passam a ser **marcadores compactos sobre a linha**,
   no mesmo estilo do IR/PR (sem numero).
6. "Modelo Curvas" (serpentina) usa o **mesmo** carimbo de eixo, dividido
   em fileiras de **~8 anos cada**, conectadas por setas curvas — sem
   scroll horizontal. E uma alternativa de visualizacao para quando a
   linha "reta" fica muito longa para ler comodamente com scroll.

## Arquitetura

### Novo componente: `EixoLinhaDoTempo`

`linha-do-tempo/app/src/components/editor/visualizacao/EixoLinhaDoTempo.jsx`

Renderiza **uma fileira** do eixo como SVG: anos/ticks, a barra colorida
por categoria (mes a mes), marcadores de IR numerados, PR, DER e Inicio.
Recebe como props:

- `anoInicio`, `anoFim` — intervalo de anos visivel nesta fileira
- `categoriaPorMes` — funcao/mapa que devolve a categoria de cada mes
  absoluto (`'carencia' | 'vinculo' | 'incapacidade' | 'sem_cobertura'`)
- `irs` — lista de IRs com numero ja calculado (`{ mes, ano, numero }`)
- `provas` — lista de Provas de Retorno
- `der`, `inicio` — marcadores de DER e Inicio (so desenhados na fileira
  que contem a data correspondente)

### `ModeloHorizontal.jsx`

Passa a ser um wrapper fino: calcula `anoInicio`/`anoFim` (igual a hoje,
`inicio_ano` at `der_ano + 1`) e renderiza **uma** `EixoLinhaDoTempo`
dentro de um container com `overflowX: auto` (scroll horizontal mantido).

### `ModeloCurvas.jsx`

Tambem um wrapper fino: divide o intervalo total de anos em fileiras de
**8 anos** (ultima fileira pode ter menos), renderiza uma
`EixoLinhaDoTempo` por fileira, empilhadas, conectadas por setas curvas
SVG (canto direito da fileira N -> canto esquerdo da fileira N+1). Sem
scroll horizontal — a grade "JANELA X — N MESES" atual e removida por
completo.

## Camada de dados (`calculo.js` + novo `lib/eixo.js`)

### `calculo.js` — nova funcao `segmentosCarencia()`

Hoje `calcularCarencia()` retorna so o total em meses (`{ rural, total }`),
descartando os intervalos calculados internamente
(`segmentos`/`janelas`/`intersecoes`/uniao). Nova funcao exportada:

```js
export function segmentosCarencia({ inicioAtividade, der, vinculosUrbanos, provasRetorno, instrumentosRatificadores }) {
  // mesma logica de segmentosRuraisDeclarados + janelaInstrumento + intersecao,
  // mas retorna a UNIAO como lista de {inicio, fim} em meses absolutos,
  // em vez de so a soma das duracoes.
}
```

Sera coberta por testes (TDD), espelhando os 4 cenarios do Oficio 46 ja
testados em `calcularCarencia` (1 IR, janela limitando a 90 meses, uniao
de janelas sobrepostas, IR que nao alcanca o periodo declarado).

**Limitacao herdada da Fase 1** (ja documentada na Nota de Escopo): B41
(2 blocos de 90 meses), regra "periodo mais antigo" da hibrida e
intercalacao urbana de 120 dias/ano nao sao calculados — `segmentosCarencia`
reflete exatamente o que `calcularCarencia` ja calcula hoje, nem mais
nem menos.

### Novo `lib/eixo.js` — `classificarMes()`

Funcao pura que, para um mes absoluto, devolve a categoria visual com
prioridade:

```
Vinculo Urbano > Beneficio por Incapacidade > Carencia reconhecida > Sem cobertura
```

(vinculo/incapacidade "vencem" carencia em caso de coincidencia — nao deveria
ocorrer pela definicao dos dados, mas evita ambiguidade visual se ocorrer).

Tambem em `lib/eixo.js`: helper para numerar IRs por ordem cronologica
(`numerarIRs(irs)` -> lista ordenada com `numero` 1..N).

## Vocabulario visual (cores e marcadores)

| Elemento | Aparencia |
|---|---|
| Carencia reconhecida | trecho laranja da barra |
| Vinculo Urbano | trecho azul da barra |
| Beneficio por Incapacidade | trecho amarelo da barra |
| Sem cobertura | trecho cinza da barra |
| IR (Instrumento Ratificador) | marcador verde + numero sequencial (1,2,3...) acima da linha |
| Prova de Retorno (PR) | marcador vermelho na linha, sem numero |
| DER | marcador compacto na linha, label "DER" |
| Inicio da Atividade Rural | marcador compacto na linha, label "Inicio" |

## Legenda

O componente de Legenda (adicionado em sessao anterior) ganha 2 itens
novos: **"Carencia reconhecida"** (laranja) e **"Sem cobertura"** (cinza),
alem dos itens existentes (Vinculo Urbano, Incapacidade, IR, Prova de
Retorno).

## Fora de escopo (Fase 4+)

- B41, regra "periodo mais antigo" da hibrida, intercalacao urbana de
  120 dias/ano — dependem de evoluir `segmentosCarencia`/`calcularCarencia`
  primeiro (fora desta fase, que e so visual).
- Layout "serpentina alternada" (linhas pares lendo da direita para
  esquerda, como em `image11.png`) — a versao aprovada usa todas as
  fileiras lendo da esquerda para a direita, conectadas por setas curvas
  canto-direito -> canto-esquerdo. Mais simples de implementar e ler.

## Testes

- `segmentosCarencia()` em `calculo.js`: TDD, testes espelhando os 4
  cenarios do Oficio 46 ja cobertos por `calcularCarencia`.
- `classificarMes()` e `numerarIRs()` em `lib/eixo.js`: testes unitarios
  cobrindo a prioridade de categorias e a ordenacao cronologica dos IRs.
- Verificacao visual no navegador (Playwright) para `EixoLinhaDoTempo`,
  `ModeloHorizontal` e `ModeloCurvas` com dados de exemplo (cenario com
  vinculo urbano, IR, PR, carencia com "buraco").
