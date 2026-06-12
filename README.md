# 📱 BaldezLabs — Sistema de Marketing Previdenciário

> Repositório central de conteúdo, roteiros e automações para o canal @baldezlabs no Instagram e TikTok.

---

## 🗂️ Estrutura do Repositório

```
├── temas/                    # Guias de gravação por benefício
├── concorrentes/             # Perfis monitorados e dados de análise
├── dados/                    # JSONs gerados automaticamente (temas em alta, métricas)
├── scripts/                  # Scripts Python de automação e análise
├── dashboard/                # Dashboard HTML de agendamento editorial
└── .github/workflows/        # GitHub Actions (análise semanal de concorrentes)
```

---

## 📋 Temas Disponíveis

| Sigla | Benefício | Arquivo | Temas |
|---|---|---|---|
| SM | Salário-Maternidade | `temas/SM_Salario_Maternidade.md` | 48 |
| BPC | BPC – Criança Autista | `temas/BPC_Crianca_Autista.md` | 42 |
| AR | Aposentadoria Rural | `temas/AR_Aposentadoria_Rural.md` | 48 |
| AE | Aposentadoria Especial | `temas/AE_Aposentadoria_Especial.md` | 48 |
| AA | Auxílio-Acidente | `temas/AA_Auxilio_Acidente.md` | 48 |
| PM | Pensão por Morte | `temas/PM_Pensao_por_Morte.md` | 48 |

**Total atual: 282 temas | 6 áreas**

### Próximos Temas (backlog)
- [ ] BPC – Idoso (`BPC_Idoso.md`)
- [ ] BPC – Outras Deficiências (`BPC_Outras_Deficiencias.md`)
- [ ] Aposentadoria por Invalidez/Incapacidade Permanente
- [ ] LOAS Idoso
- [ ] Revisão da Vida Toda

---

## 🔍 Concorrentes Monitorados

Lista em `concorrentes/perfis.json`. Análise automática semanal via GitHub Actions.

---

## ⚙️ Automações (GitHub Actions)

| Workflow | Frequência | O que faz |
|---|---|---|
| `analise_concorrentes.yml` | Semanalmente (domingo) | Coleta hashtags e temas em alta dos perfis monitorados |
| `metricas_instagram.yml` | A cada 3 dias | Coleta métricas via Instagram Graph API |

---

## 🚀 Como usar o sistema

1. **Criar conteúdo:** abra o arquivo MD do tema desejado e use o banco de perguntas como roteiro
2. **Agendar:** use o dashboard HTML (`dashboard/agenda.html`) para organizar o calendário editorial
3. **Impulsionar:** a aba "Impulsionar" do dashboard mostra os posts com maior potencial
4. **Atualizar temas:** a cada semana, o script gera sugestões em `dados/temas_em_alta.json`

---

*Projeto: BaldezLabs — Direito Previdenciário | Metodologia MN ADS*
