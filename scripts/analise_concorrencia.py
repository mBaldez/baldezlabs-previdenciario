"""
Análise de Tendências de Busca — BaldezLabs
=============================================
Usa Google Trends (pytrends) para identificar o que as pessoas
estão buscando sobre direito previdenciário no Brasil.

Foco: intenção de busca dos clientes, não conteúdo da concorrência.

Secrets necessários (GitHub):
  CONCORRENTES_LIST  — mantido por compatibilidade, não usado aqui

Sem custo — Google Trends é gratuito.
"""

import json, os, time
from datetime import datetime
from pytrends.request import TrendReq

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_JSON = os.path.join(BASE_DIR, "dados", "temas_em_alta.json")

# ── Termos de busca por área ────────────────────────────────────
# Frases que clientes reais digitam no Google
TERMOS = {
    "BPC": [
        "BPC autismo",
        "como pedir BPC",
        "BPC LOAS deficiência",
        "BPC criança",
    ],
    "SM": [
        "salário maternidade INSS",
        "como receber salário maternidade",
        "salário maternidade MEI",
    ],
    "AR": [
        "aposentadoria rural documentos",
        "segurado especial INSS",
        "aposentadoria trabalhador rural",
    ],
    "AE": [
        "aposentadoria especial insalubre",
        "tempo especial INSS",
        "aposentadoria especial como funciona",
    ],
    "PM": [
        "pensão por morte como receber",
        "pensão por morte cônjuge",
        "pensão por morte filhos",
    ],
    "AI": [
        "aposentadoria por invalidez",
        "como se aposentar por doença",
        "auxílio doença INSS",
    ],
}

NOMES = {
    "BPC": "BPC / LOAS",
    "SM":  "Salário Maternidade",
    "AR":  "Aposentadoria Rural",
    "AE":  "Aposentadoria Especial",
    "PM":  "Pensão por Morte",
    "AI":  "Aposentadoria por Invalidez / Auxílio Doença",
}

HASHTAGS = {
    "BPC": ["#bpc", "#autismo", "#tea", "#loas", "#direitoprevidenciario"],
    "SM":  ["#salariomaternidade", "#maternidade", "#inss", "#mei", "#direitoprevidenciario"],
    "AR":  ["#aposentadoriarural", "#seguidorespecial", "#trabalhadorarural", "#inss"],
    "AE":  ["#aposentadoriaespecial", "#insalubre", "#tempoespecial", "#inss"],
    "PM":  ["#pensaopormorte", "#inss", "#dependente", "#direitosprevidenciarios"],
    "AI":  ["#aposentadoriainvalidez", "#auxiliodoenca", "#inss", "#direitoprevidenciario"],
}

ANGULO = {
    "BPC": "Muitas famílias não sabem que têm direito — explique os critérios de forma simples",
    "SM":  "MEIs e autônomas têm dúvidas frequentes — conteúdo prático converte muito",
    "AR":  "Documentação é a maior dificuldade — roteiros de 'o que preciso juntar' têm alto alcance",
    "AE":  "Profissionais de saúde e construção civil são nichos de alto valor — foque em casos reais",
    "PM":  "Alta carga emocional — conteúdo empático sobre prazos e documentos gera confiança",
    "AI":  "Pessoas em sofrimento buscam esperança — linguagem acolhedora + orientação prática",
}

SCORE_CORTE = 6.0  # interesse ≥ 60/100 no Google Trends


def buscar_tendencias():
    """Consulta Google Trends para todos os termos, em lotes de 5."""
    pytrends = TrendReq(hl="pt-BR", tz=-180, timeout=(10, 25), retries=2, backoff_factor=0.5)
    resultados = {}

    todos_termos = [(area, termo) for area, lista in TERMOS.items() for termo in lista]
    lotes = [todos_termos[i:i+5] for i in range(0, len(todos_termos), 5)]

    for idx, lote in enumerate(lotes):
        palavras = [t for _, t in lote]
        print(f"  🔍 Lote {idx+1}/{len(lotes)}: {palavras}")
        try:
            pytrends.build_payload(palavras, timeframe="today 1-m", geo="BR")
            df = pytrends.interest_over_time()
            if not df.empty:
                for area, termo in lote:
                    if termo in df.columns:
                        interesse = int(df[termo].mean())
                        if area not in resultados or interesse > resultados[area]["interesse"]:
                            resultados[area] = {"termo": termo, "interesse": interesse}
        except Exception as e:
            print(f"  ⚠️  Erro no lote: {e}")
        if idx < len(lotes) - 1:
            time.sleep(3)

    return resultados


def gerar_temas(resultados):
    temas = []
    print("\n📊 Interesse detectado (Google Trends Brasil — último mês):")
    for area, dado in sorted(resultados.items(), key=lambda x: -x[1]["interesse"]):
        interesse = dado["interesse"]
        score     = round(min(interesse / 10, 10.0), 1)
        flag      = "✅" if score >= SCORE_CORTE else "  "
        print(f"   {flag} {area}: {interesse}/100 (score {score}) — '{dado['termo']}'")
        temas.append({
            "tema":               NOMES.get(area, area),
            "area":               area,
            "termo_pesquisado":   dado["termo"],
            "interesse_google":   interesse,
            "score_estimado":     score,
            "angulo_conteudo":    ANGULO.get(area, ""),
            "hashtags_relacionadas": HASHTAGS.get(area, []),
        })

    temas.sort(key=lambda x: x["score_estimado"], reverse=True)
    acima = [t for t in temas if t["score_estimado"] >= SCORE_CORTE]
    return acima if acima else temas[:6]


def main():
    print("🔍 Analisando tendências de busca no Google (Brasil)...")
    print("   Período: último mês · Região: BR\n")

    resultados = buscar_tendencias()

    if not resultados:
        print("⚠️  Nenhum dado retornado pelo Google Trends.")
        return

    temas = gerar_temas(resultados)

    output = {
        "gerado_em":           datetime.now().strftime("%Y-%m-%d"),
        "fonte":               "google_trends_brasil",
        "periodo":             "ultimo_mes",
        "proxima_atualizacao": "automatica_via_github_actions",
        "score_corte":         SCORE_CORTE,
        "temas_em_alta":       temas,
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(temas)} temas salvos em dados/temas_em_alta.json")


if __name__ == "__main__":
    main()
