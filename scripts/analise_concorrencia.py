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


def buscar_um_termo(pytrends, area, termo):
    """Tenta buscar um único termo, com retry em caso de 429."""
    for tentativa in range(3):
        try:
            pytrends.build_payload([termo], timeframe="today 1-m", geo="BR")
            df = pytrends.interest_over_time()
            if not df.empty and termo in df.columns:
                return int(df[termo].mean())
            return 0
        except Exception as e:
            msg = str(e)
            if "429" in msg or "Too Many" in msg.lower():
                espera = 20 + tentativa * 15
                print(f"  ⏳ Rate limit — aguardando {espera}s antes de tentar novamente...")
                time.sleep(espera)
            else:
                print(f"  ⚠️  Erro: {e}")
                return None
    return None


def buscar_tendencias():
    """Consulta Google Trends termo a termo para evitar bloqueios."""
    pytrends = TrendReq(hl="pt-BR", tz=-180, timeout=(15, 30))
    resultados = {}

    # Um termo representativo por área (o mais pesquisado)
    termos_principais = {
        "BPC": "BPC autismo",
        "SM":  "salario maternidade INSS",
        "AR":  "aposentadoria rural",
        "AE":  "aposentadoria especial",
        "PM":  "pensao por morte",
        "AI":  "aposentadoria por invalidez",
    }

    total = len(termos_principais)
    for i, (area, termo) in enumerate(termos_principais.items(), 1):
        print(f"  [{i}/{total}] Buscando: '{termo}'...", end=" ", flush=True)
        interesse = buscar_um_termo(pytrends, area, termo)
        if interesse is not None:
            resultados[area] = {"termo": termo, "interesse": interesse}
            print(f"{interesse}/100")
        else:
            print("sem dados")
        if i < total:
            time.sleep(8)  # pausa entre termos para evitar rate limit

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
        p