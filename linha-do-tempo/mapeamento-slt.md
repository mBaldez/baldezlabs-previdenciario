# Mapeamento — SLT (Sistema Linha do Tempo)

> Engenharia reversa do produto "Mapas" do https://sistemalinhadotempo.com.br/ (login compartilhado com Calculadora de Módulos Fiscais e Banco de Peças Previdenciárias). Objetivo: usar este mapeamento como base para construir uma versão própria, mais visual, dentro do BaldezLabs.

Mapeado em 2026-06-13 navegando o sistema logado como Michael Anderson da Costa Baldez (timeline real "Michael Baldez" / `?line=20735`, Aposentadoria Rural).

**Fase 2 (mesma data)**: simulações com uma timeline de teste descartável (`TESTE Hibrida`, criada e depois excluída) confirmaram o comportamento dos outros 2 tipos de benefício, o cálculo de Carência, o upload de CNIS e o fluxo de exclusão. Achados consolidados nas seções 6 e 6.1.

---

## 1. Fluxo de telas

```
/                       → Home pós-login: escolha de produto (Mapas | Calculadora de Módulos Fiscais | Banco de Peças Previdenciárias)
/list-time-lines/       → Listagem de Linhas do Tempo + form "Nova Linha do Tempo"
/time-line/?line={id}   → Editor de uma Linha do Tempo (tela principal do produto)
```

### 1.1 Home (`/`)
- Saudação personalizada: "Olá, {Nome}!"
- 3 cards de produto (mesmo login):
  - **Mapas** → `/list-time-lines/`
  - **Calculadora de Módulos Fiscais** → `/calculadora-modulos-fiscais/`
  - **Banco de Peças Previdenciárias** → `/banco-peticoes`
- Link extra: "Minicurso do Sistema da Linha do Tempo"

### 1.2 Listagem (`/list-time-lines/`)
- Saudação + "Crie/Edite suas Linhas do Tempo a seguir."
- **Form "Nova Linha do Tempo"**:
  | Campo | Tipo | Observação |
  |---|---|---|
  | Nome | texto | placeholder "Ex.: Roberto Santos" |
  | Tipo de Benefício | select | `Aposentadoria Rural` (default) \| `Aposentadoria Híbrida/Tempo de Contribuição` \| `Demais Benefícios Rurais` |
  | Início da Atividade Rural | mês + ano | default Janeiro/2011 |
  | DER ou Fato Gerador | mês + ano | default mês atual/ano atual |
  | botão "Criar!" | submit | cria nova timeline e (provavelmente) redireciona para o editor |
- **Lista "Suas Linhas do Tempo"**: cada item mostra Nome, Tipo de Benefício, data (DD/MM/AAAA), link "Editar" e botão "Excluir". Cada item abre `/time-line/?line={id}`.
- **Botão "Excluir"** (testado): dispara `confirm()` nativo do browser — *"Tem certeza que deseja excluir?"*. Ao confirmar, AJAX remove a timeline, exibe alerta verde *"Linha do Tempo excluida!"* (sem acento) e a lista é re-renderizada sem reload de página.

### 1.3 Editor (`/time-line/?line={id}`)
Layout 2 colunas: **sidebar esquerda** (formulários, em acordeão) + **área principal** (visualização + ações).

---

## 2. Sidebar — 5 seções em acordeão

### Seção 1 — Exercício da Atividade Rural
- Tipo de Benefício (select, mesmas 3 opções do form de criação)
- DER ou Fato Gerador: mês + ano
  - help text: "É a data da DER ou do fato gerador, sendo o mês e o ano. Ex.: Janeiro/1994."
- Início da Atividade Rural: mês + ano
  - help text: "Essa será a data de início de contagem da carência rural. Ex.: Janeiro 2000"
- botão **"Gerar Linha do Tempo"** — recalcula/redesenha a visualização principal a partir desses dois parâmetros

### Seção 2 — Vínculos Urbanos
> "Defina um período para adicionar um Vínculo Urbano. Lembre de apresentar uma Prova de Retorno caso tenha."
- Origem do vínculo: texto (placeholder "Ex.: Empresa X, Benefício Y, etc.")
- Data de início: mês + ano
- Data de fim: mês + ano
- botão "Adicionar Vínculo Urbano"
- **Upload CNIS** (testado): "Você pode carregar um PDF do CNIS no sistema para reconhecer alguns Vínculos Urbanos." + botão "Carregar CNIS" → abre modal **"Adicionando Vínculo Urbano"** com texto *"Selecione o PDF do CNIS que deseja carregar no sistema."*, input de arquivo ("Escolher arquivo") e botões "Cancelar"/"Salvar" (Salvar fica desabilitado até um arquivo ser escolhido).
  - Parsing é **100% client-side via PDF.js** (`wp-content/themes/previdencia-time-line/assets/js/pdfjs/index.js` + `pdfjs/pdf-worker.mjs`) — o PDF nunca é enviado a um servidor para extração.
  - Testado com um PDF genérico (não-CNIS): o parser não encontrou as seções esperadas e logou `Erro: {nome-do-arquivo} Nenhum documento encontrado no PDF.` (sem alterar a timeline). O parser real provavelmente procura por marcadores de texto específicos do extrato CNIS oficial do INSS (ex.: cabeçalhos "Vínculos"/"Remunerações"). Para o redesign, vale extrair a lógica de `pdfjs/index.js` ou reimplementar com um CNIS real de exemplo.
- Lista "Vínculos Cadastrados:" (vazio = "Nenhum Vínculo Urbano")

### Seção 3 — Provas de Retorno
> Tooltip (ícone "i"): *"Prova de retorno é qualquer prova rural posterior a cessação de um vínculo urbano maior de 120 dias no ano. Ela não retroage e reconhecerá o tempo rural somente a partir dela. Se você não coloca a prova de retorno após o vínculo urbano os Instrumentos Ratificadores não validarão o período rural corretamente."*
- Data do Retorno: mês + ano
- botão "Adicionar Prova de Retorno"
- Lista "Retornos Cadastrados:" (vazio = "Nenhum Retorno")

### Seção 4 — Instrumentos Ratificadores (IR)
> Tooltip: *"Instrumentos ratificadores são provas rurais. Esse é o nome oficial trazido pela IN 128/2022."*
- Defina uma data: mês + ano
  - help text: "Defina a data que deseja criar uma IR dentro do intervalo da Atividade Rural."
- botão "Adicionar IR"
- Lista "IRs Cadastrados:" (vazio = "Nenhum IR")

### Seção 5 — Benefício por Incapacidade
> Tooltip: *"Aqui você informará se o seu cliente já recebeu no passado algum auxílio-doença rural ou aposentadoria por invalidez rural. Esse período de gozo contará como carência. ATENÇÃO! Se o seu cliente recebeu auxílio-doença urbano ou aposentadoria por invalidez urbana você deve acrescentar esse período na linha do tempo como se fosse um vínculo urbano."*
- Data de início: mês + ano
- Data de fim: mês + ano
- botão "Adicionar Incapacidade"
- Lista "Incapacidades Cadastradas:" (vazio = "Nenhum item")

---

## 3. Área principal

### 3.1 Barra superior
- Título: "Linha do Tempo {Nome do Cliente}"
- **Salvar** (com ícone "i" → tooltip: *"A linha do tempo é salva automaticamente a cada modificação feita."* — ou seja, autosave; o botão parece ser só um indicador/trigger manual)
- **Modelos** (dropdown): `Modelo horizontal` (default) | `Modelo em curvas`
- **Exportar Linha do Tempo** (botão verde) → abre nova aba com a imagem do modelo ativo + texto "Você pode copiar a imagem abaixo ou fazer download clicando aqui." (export = imagem/PNG do gráfico atual)

### 3.2 "Opções" (dropdown no rodapé) — 4 modos de visualização do conteúdo principal

1. **Linha do Tempo** (default)
   - **Modelo horizontal**: régua horizontal de anos (2011→2026+, scroll horizontal), com marcadores verticais coloridos para cada tipo de evento + marcador "DER" no fim. Vínculo Urbano e Benefício por Incapacidade aparecem como blocos/retângulos preenchidos sobre a régua; IR e Prova de Retorno como marcadores pontuais (linha vertical verde/vermelha).
   - **Modelo em curvas**: layout "serpentina" — uma fileira de anos decrescente (da DER para trás, ex. 2018→2011), conectada por uma curva a uma segunda fileira crescente que continua até a DER (ex. 2019→2026). Rotulado **"Períodos de 90 meses"** — visualiza as janelas de carência de 90 meses do ofício-circular 46/2019 que o sistema usa para validar o período.
   - Abaixo: **Legendas** (5 itens, ver seção 4) + tabela "Carência", cuja estrutura **depende do Tipo de Benefício** (ver seção 6.1):
     - Aposentadoria Rural / Demais Benefícios Rurais → 1 linha: "Total {N} meses"
     - Aposentadoria Híbrida/Tempo de Contribuição → 3 linhas: "Rural {N} meses" / "Urbano {M} meses" / "Total {N+M} meses"

2. **Descrever IRs e PRs** — editor de texto livre ("Nenhum IR" quando vazio) + botão "Salvar descrição". Provavelmente alimenta a peça jurídica (Banco de Peças) com a narrativa dos Instrumentos Ratificadores e Provas de Retorno.

3. **Descrever Vínculos Urbanos** — mesmo padrão, editor de texto livre + "Salvar descrição".

4. **Relatório** — "Relatório de Tempo de Contribuição":
   - Tabela 1: "Tempo Rural Efetivamente Reconhecido" — colunas Data Início | Data Fim | Tempo Final (meses)
   - Tabela 2: "Vínculos Urbanos" — colunas Origem do Vínculo | Data Início | Data Fim | Tempo de contribuição + linha "Total:"
   - botão "Exportar relatório"

---

## 4. Legenda / código de cores (igual em todas as visualizações)

| Cor | Significado |
|---|---|
| 🟧 traço laranja | Carência (com base nos 90 meses do ofício-circular 46/2019) |
| 🟩 verde | Instrumentos Ratificadores (IR) |
| 🟦 azul | Vínculo Urbano |
| 🟥 vermelho | Prova de Retorno |
| 🟨 amarelo claro | Gozo de Benefício por Incapacidade |

---

## 5. Modelo de dados (inferido)

```
LinhaDoTempo
├── id                          (ex.: 20735, usado em ?line=)
├── nomeCliente
├── tipoBeneficio: enum { AposentadoriaRural, AposentadoriaHibridaTempoContribuicao, DemaisBeneficiosRurais }
├── inicioAtividadeRural: {mes, ano}
├── derOuFatoGerador: {mes, ano}
├── modeloVisual: enum { horizontal, curvas }
├── vinculosUrbanos[]:    { origem: string, dataInicio: {mes,ano}, dataFim: {mes,ano} }
├── provasDeRetorno[]:    { data: {mes,ano} }
├── instrumentosRatificadores[]: { data: {mes,ano} }
├── beneficiosPorIncapacidade[]: { dataInicio: {mes,ano}, dataFim: {mes,ano} }
├── descricaoIRsEPRs: texto livre
└── descricaoVinculosUrbanos: texto livre

Relatório (calculado, não persistido):
├── tempoRuralReconhecido: { dataInicio, dataFim, tempoFinalMeses }   // = "Tempo Rural Efetivamente Reconhecido"
└── vinculosUrbanos[]: { ...+ tempoContribuicaoMeses }, total

Carência (calculada, não persistida — estrutura varia por tipoBeneficio, ver regra 6.1):
├── AposentadoriaRural | DemaisBeneficiosRurais → { total: tempoRuralReconhecido.tempoFinalMeses }
└── AposentadoriaHibridaTempoContribuicao       → { rural: tempoRuralReconhecido.tempoFinalMeses, urbano: somaVinculosUrbanos, total: rural + urbano }
```

---

## 6. Regras de negócio identificadas

1. **Carência rural por janelas de 90 meses** (ofício-circular 46/2019), contadas a partir de "Início da Atividade Rural" — visualizada no "Modelo em curvas" como blocos sucessivos de 90 meses até a DER.
2. **Vínculo Urbano interrompe** a contagem da carência rural.
3. **Prova de Retorno não retroage**: após um Vínculo Urbano, o tempo rural só volta a ser reconhecido a partir da data da Prova de Retorno. Sem essa prova, os IRs posteriores ao vínculo não validam o período rural.
4. **IR (Instrumento Ratificador)** = nome oficial (IN 128/2022) para "provas rurais"; deve estar dentro do intervalo da Atividade Rural. Na prática, adicionar um IR **aumenta** o "Tempo Rural Efetivamente Reconhecido" (ver 6.1) — é o que "valida"/recupera um bloco de tempo rural que, sem ele, não seria contado.
5. **Benefício por Incapacidade rural** (auxílio-doença rural / aposentadoria por invalidez rural) conta como carência. Se o benefício recebido foi **urbano**, deve ser lançado como Vínculo Urbano em vez de Incapacidade. **Testado**: um período de Incapacidade dentro de um intervalo já reconhecido como rural não alterou nenhum número da Carência/Relatório — funcionou apenas como marcador visual nesse caso (não testamos um período de Incapacidade fora de qualquer janela reconhecida).
6. **Tipo de Benefício altera o cálculo da Carência** (confirmado — ver 6.1 para a tabela completa):
   - **Aposentadoria Rural** e **Demais Benefícios Rurais**: carência = 100% rural. Vínculo Urbano **não conta** para o total (aparece só informativamente no Relatório).
   - **Aposentadoria Híbrida/Tempo de Contribuição**: carência = Rural + Urbano, com **Total fixado em 90 meses** (a meta do ofício-circular 46/2019) quando há tempo suficiente para completá-la.
7. Trocar o "Tipo de Benefício" na Seção 1 **recalcula a tabela de Carência e os rótulos de campo imediatamente** (não precisa clicar "Gerar Linha do Tempo") e o autosave persiste a mudança (a listagem passa a refletir o novo tipo).

### 6.1 Cálculo de Carência — dados de teste (timeline "TESTE Hibrida")

Timeline de teste: **Início da Atividade Rural = Janeiro/2011**, **DER = Junho/2026**. Dados adicionados incrementalmente (Tipo de Benefício = Aposentadoria Híbrida/Tempo de Contribuição):

| Dados na timeline | Carência: Rural | Carência: Urbano | Carência: Total | Relatório: "Tempo Rural Efetivamente Reconhecido" |
|---|---|---|---|---|
| (nenhum) | 0 meses | 0 meses | 0 meses | — |
| + Vínculo Urbano "Empresa Teste LTDA" Jan/2015–Dez/2016 (24 meses) | 0 meses | 24 meses | 24 meses | — |
| + Prova de Retorno Jan/2017 | 24 meses | 24 meses | 48 meses | Jan/2011–Jun/2026 = 24 meses |
| + IR em Jan/2013 | **66 meses** | 24 meses | **90 meses** | Jan/2011–Jun/2026 = **66 meses** |
| + Benefício por Incapacidade Mar/2018–Ago/2018 (6 meses) | 66 meses | 24 meses | 90 meses | sem alteração (66 meses) |

Com os mesmos dados acima (Rural=66 / Urbano=24 / "Tempo Rural Efetivamente Reconhecido"=66), trocando o Tipo de Benefício para **"Demais Benefícios Rurais"**, a tabela Carência passa a ter **1 linha só**: `Total = 66 meses` (= o valor "Rural" da Híbrida; os 24 meses do Vínculo Urbano somem do total).

**Interpretação / hipóteses**:
- Para Híbrida, `Total = Rural + Urbano`. Quando o tempo disponível é suficiente, `Total` parece convergir para **90** (a carência exigida pelo ofício-circular 46/2019), com `Urbano` = soma dos meses de Vínculo(s) Urbano(s) e `Rural = Total − Urbano` (igual ao "Tempo Rural Efetivamente Reconhecido").
- Para Rural/Demais Benefícios, `Total = Tempo Rural Efetivamente Reconhecido` (Vínculo Urbano é ignorado no total, mas continua listado na tabela "Vínculos Urbanos" do Relatório).
- **Não confirmado**: a fórmula exata de como o IR expande o "Tempo Rural Efetivamente Reconhecido" (no teste, foi de 24→66 meses ao adicionar 1 IR em Jan/2013 — um salto de 42 meses). Hipóteses não validadas: relação com a distância entre "Início da Atividade Rural" e o Vínculo Urbano (Jan/2011–Jan/2015 = 48 meses), ou com a posição do IR dentro da janela de 90 meses ancorada na DER/Prova de Retorno.
- **Recomendação para o redesign**: não tentar adivinhar a fórmula por engenharia reversa apenas visual — ou (a) extrair o JS de cálculo do tema `previdencia-time-line` (créditos: fabriziofeitosa.dev) e portar a lógica, ou (b) tratar como caixa-preta e gerar uma bateria de casos de teste (combinações de datas de Início/DER/Vínculos/IRs/PRs) usando o próprio SLT como "oráculo" antes de implementar o motor de cálculo próprio.

---

## 7. Estilo visual (para referência do redesign)

- Sidebar: fundo escuro (acordeão cinza-chumbo, seção ativa com texto branco em destaque), botões numerados (1-5)
- Topo da área principal: barra escura com título + ações (Salvar / Modelos / Exportar — verde)
- Fundo da área principal: branco/cinza claro
- Logo SLT: ícone "S T" em gradiente ciano→roxo + texto "Sistema Linha do Tempo / Calculadora de Tempo Rural"
- Screenshots de referência em [`screenshots/`](./screenshots/):
  - `slt-timeline-section1.png` — editor, Seção 1 + Modelo horizontal
  - `slt-modelo-curvas.png` — Modelo em curvas (serpentina, períodos de 90 meses)
  - `slt-opcoes.png` — menu "Opções" (4 modos de visualização)
  - `slt-modelos.png` — menu "Modelos" (horizontal / curvas)
  - `slt-descrever-irs-prs.png`, `slt-descrever-vinculos.png` — editores de descrição
  - `slt-relatorio.png` — Relatório de Tempo de Contribuição
  - `slt-export-pdf.png` — resultado de "Exportar Linha do Tempo"
  - **Fase 2** (timeline de teste "TESTE Hibrida", ver seção 6.1):
    - `slt-hibrida-vinculo-urbano.png` — Modelo horizontal com 1 Vínculo Urbano (Jan/2015–Dez/2016)
    - `slt-hibrida-relatorio-1.png` — Relatório com "Tempo Rural Efetivamente Reconhecido" = 24 meses + tabela de Vínculos Urbanos
    - `slt-hibrida-horizontal-com-ir.png` — Modelo horizontal com IR (Jan/2013) + Vínculo Urbano + Prova de Retorno; Carência Rural=66/Urbano=24/Total=90
    - `slt-hibrida-curvas-com-ir.png`, `slt-hibrida-curvas-scroll.png` — Modelo em curvas ("Períodos de 90 meses") com o mesmo cenário, mostrando o layout serpentina 2011→2026
    - `slt-hibrida-com-incapacidade.png` — Modelo horizontal com Benefício por Incapacidade (Mar–Ago/2018) adicionado (marcador amarelo; Carência inalterada)
    - `slt-demais-beneficios.png` — mesma timeline com Tipo de Benefício = "Demais Benefícios Rurais": Carência colapsa para 1 linha "Total 66 meses"
    - `slt-cnis-click.png` — modal "Adicionando Vínculo Urbano" (upload de CNIS)
    - `slt-cnis-resultado.png` — estado após tentativa de upload de PDF não reconhecido (erro no console, sem alteração na timeline)

---

## 8. Próximos passos / pendências

- [x] Testar **"Aposentadoria Híbrida/Tempo de Contribuição"** e **"Demais Benefícios Rurais"** — ver seção 6.1.
- [x] Cadastrar dados de exemplo (Vínculo Urbano, Prova de Retorno, IR, Incapacidade) numa timeline de teste e observar recálculo — ver seção 6.1.
- [x] Testar **"Carregar CNIS"** (upload de PDF) — modal e parser client-side (PDF.js) mapeados; ver seção 2 (Seção 2 — Vínculos Urbanos).
- [x] Mapear botão "Excluir" na listagem — ver seção 1.2. (Fluxo "Criar!" já estava mapeado na Fase 1.)
- [x] Timeline de teste "TESTE Hibrida" (`?line=20939`) excluída — apenas "Michael Baldez" (`?line=20735`) permanece na conta.
- [ ] **Fórmula exata da Carência/Tempo Rural Efetivamente Reconhecido** ainda não derivada (ver hipóteses e recomendação na seção 6.1) — próximo passo é extrair a lógica do JS do tema ou montar uma bateria de casos de teste usando o SLT como oráculo.
- [ ] Avaliar se vale mapear também **Calculadora de Módulos Fiscais** e **Banco de Peças Previdenciárias** (mesmo login, produtos irmãos) — fora do escopo inicial ("Mapas").
- [ ] Definir stack/arquitetura do redesign (este repo é estático HTML/CSS/JS + GitHub Actions — avaliar se a timeline visual cabe nesse modelo ou precisa de backend próprio para persistência).
