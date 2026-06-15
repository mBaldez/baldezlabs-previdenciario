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

`categoriaPorMes` e `irs` (ja numerados) sao calculados **uma vez** pelo
wrapper (`ModeloHorizontal`/`ModeloCurvas`) para o intervalo total e
compartilhados entre todas as fileiras — ver "Contrato de dados" abaixo.

### `ModeloHorizontal.jsx`

Passa a ser um wrapper fino: calcula o intervalo total `anoInicio` =
`inicio_atividade_ano`, `anoFim` = `der_ano` (ver "Contrato de dados"
abaixo) e renderiza **uma** `EixoLinhaDoTempo` dentro de um container
com `overflowX: auto` (scroll horizontal mantido).

### `ModeloCurvas.jsx`

Tambem um wrapper fino: divide o intervalo total de anos (mesmo
`anoInicio`/`anoFim` definidos em "Contrato de dados") em fileiras de
**8 anos** (ultima fileira pode ter menos), renderiza uma
`EixoLinhaDoTempo` por fileira, empilhadas, conectadas por setas curvas
SVG (canto direito da fileira N -> canto esquerdo da fileira N+1). Sem
scroll horizontal — a grade "JANELA X — N MESES" atual e removida por
completo.

Cada fileira "possui" um intervalo fechado e nao sobreposto de meses
absolutos (`anoInicio*12 .. (anoFim*12 + 11)`). A barra colorida (mes a
mes) e os marcadores IR/PR/DER/Inicio de cada fileira sao determinados
exclusivamente por esse intervalo — sem tratamento especial de borda (um
segmento de carencia/vinculo que atravessa duas fileiras simplesmente
aparece "cortado" em cada uma, o que e o comportamento correto). Como os
intervalos nao se sobrepoem, um marcador pontual (IR/PR/DER/Inicio) cujo
mes absoluto cai exatamente na fronteira pertence a exatamente uma
fileira — a que contem aquele mes — e nunca aparece duplicado nem fica
de fora. Setas curvas conectam apenas fileiras consecutivas (N fileiras
-> N-1 setas); a ultima fileira nao tem seta de saida.

### Contrato de dados (DB -> `calculo.js` -> `lib/eixo.js` -> eixo)

`ModeloHorizontal`/`ModeloCurvas` recebem os dados "brutos" do banco
(`vinculos`, `provas`, `irs`, `incapacidades`, `timeline`), no formato
`{ inicio_mes, inicio_ano, fim_mes, fim_ano, ... }` / `{ data_mes,
data_ano }`. `calculo.js` e `lib/eixo.js` trabalham com `{ mes, ano }` e
mes absoluto (`mesParaAbsoluto`). Cada wrapper faz a conversao **uma
unica vez**, antes de renderizar qualquer fileira:

1. Converte `vinculos`/`provas`/`irs`/`incapacidades` do formato DB para
   `{ mes, ano }`.
2. Define o intervalo total: `anoInicio = inicio_atividade_ano`,
   `anoFim = der_ano` (sem a folga de +1 ano que `ModeloHorizontal` usa
   hoje — os marcadores compactos da decisao #5 nao precisam dela; se o
   label do marcador DER precisar de espaco extra, resolve-se com
   alguns pixels de padding no SVG, nao com um ano inteiro).
3. Chama `segmentosCarencia(...)` **uma vez** para o intervalo total ->
   lista de segmentos `{inicio, fim}` em mes absoluto.
4. Constroi `categoriaPorMes` **uma vez**: funcao/`Map` que, para
   qualquer mes absoluto do intervalo total, devolve a categoria via
   `classificarMes` (usando os segmentos de carencia + vinculos +
   incapacidades convertidos). Essa mesma funcao/map e passada para
   TODAS as fileiras de `EixoLinhaDoTempo` — cada fileira so a consulta
   para o seu proprio range de meses, sem recalcular nada.
5. Chama `numerarIRs(irsConvertidos)` **uma vez**, sobre a lista
   completa de IRs -> `{ mes, ano, numero }[]` numerados
   cronologicamente. Cada fileira recebe essa lista e **filtra** pelos
   seus proprios `anoInicio`/`anoFim` — o `numero` de cada IR e
   preservado, nunca renumerado por fileira.

**"Sem cobertura"** (`classificarMes` -> `sem_cobertura`) e o valor
padrao/`fallback`: cobre tanto os "buracos" dentro do periodo declarado
(meses fora de toda janela de 90 meses de IR — decisao #3) quanto
qualquer mes do intervalo total que esteja fora do periodo declarado.

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

Sera coberta por testes (TDD): 3 cenarios que ja existem para
`calcularCarencia` (1 IR cobre tudo, janela limitando a 90 meses, uniao
de janelas sobrepostas) + 1 cenario novo (buraco entre janelas de IRs
nao sobrepostas) — ver secao "Testes" abaixo para o detalhamento.

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

**Substitui** o `classificarMes`/`COR` locais que existem hoje dentro de
`ModeloCurvas.jsx` (assinatura e prioridade diferentes, sem conceito de
"carencia"/"sem cobertura") — ambos sao removidos quando `ModeloCurvas`
passar a usar `EixoLinhaDoTempo`. O `COR` do novo `EixoLinhaDoTempo`
**reaproveita** o objeto `COR` e as constantes de escala (`ANO_WIDTH`,
`SVG_HEIGHT`, `BASE_Y`, etc.) ja existentes em `ModeloHorizontal.jsx`,
acrescentando 2 entradas: `carencia` (laranja, `#e67e22` — mesma cor ja
usada na Legenda) e `semCobertura` (cinza).

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

O componente de Legenda (adicionado em sessao anterior) tem hoje 5 itens
fixos. Mudancas:

- O item existente **"Carencia (janelas de 90 meses)"** (laranja,
  `#e67e22`) e **renomeado** para **"Carencia reconhecida"** — mesma
  cor, significado atualizado para o resultado de `segmentosCarencia`.
- Novo item: **"Sem cobertura"** (cinza) — unico item efetivamente
  adicionado.
- Vinculo Urbano, Beneficio por Incapacidade, IR e Prova de Retorno
  permanecem como estao.

Total: 6 itens (5 existentes, 1 renomeado + 1 novo — nao 7).

## Fora de escopo (Fase 4+)

- B41, regra "periodo mais antigo" da hibrida, intercalacao urbana de
  120 dias/ano — dependem de evoluir `segmentosCarencia`/`calcularCarencia`
  primeiro (fora desta fase, que e so visual).
- Layout "serpentina alternada" (linhas pares lendo da direita para
  esquerda, como em `image11.png`) — **decisao explicita do usuario**
  durante o brainstorming (Decisao B): a versao aprovada usa todas as
  fileiras lendo da esquerda para a direita, conectadas por setas curvas
  canto-direito -> canto-esquerdo. Mais simples de implementar e ler;
  e uma simplificacao aprovada, nao um deficit em relacao a referencia.

## Testes

- `segmentosCarencia()` em `calculo.js`: TDD, 4 cenarios (reaproveitando
  dados dos testes existentes de `calcularCarencia` quando possivel):
  1. Um IR cuja janela de 90 meses cobre todo o periodo declarado -> 1
     segmento igual ao periodo declarado.
  2. Periodo declarado maior que a janela de 90 meses de 1 IR -> 1
     segmento cobrindo so a parte dentro da janela (o restante fica de
     fora — sera "sem cobertura" na visualizacao).
  3. Dois IRs com janelas que se sobrepoem no periodo declarado -> 1
     segmento unico (uniao), sem duplicacao.
  4. **Cenario novo** (nao existe hoje em `calcularCarencia`): dois IRs
     com janelas de 90 meses que NAO se sobrepoem, deixando um trecho do
     periodo declarado entre elas fora de ambas -> `segmentosCarencia`
     retorna 2 segmentos separados, com um "buraco" entre eles — e o
     cenario que a faixa laranja-com-buraco (decisao #3) precisa exibir.
- `classificarMes()` e `numerarIRs()` em `lib/eixo.js`: testes unitarios
  cobrindo a prioridade de categorias (incluindo um mes "sem_cobertura")
  e a numeracao cronologica dos IRs (incluindo IRs fora de ordem na
  lista de entrada).
- Verificacao visual no navegador (Playwright) para `EixoLinhaDoTempo`,
  `ModeloHorizontal` e `ModeloCurvas` com dados de exemplo (cenario com
  vinculo urbano, IR, PR, carencia com "buraco").
