"""
Analise de Tendencias de Busca - BaldezLabs
============================================
Usa Google Trends (pytrends) para identificar o que as pessoas
estao buscando sobre direito previdenciario no Brasil.
Roda localmente (IP residencial) para evitar bloqueio do Google.
"""

import json, os, time
from datetime import datetime
from pytrends.request import TrendReq

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_JSON = os.path.join(BASE_DIR, "dados", "temas_em_alta.json")

TERMOS_PRINCIPAIS = {
    "BPC": "BPC autismo",
    "SM":  "salario maternidade INSS",
    "AR":  "aposentadoria rural",
    "AE":  "aposentadoria especial",
    "PM":  "pensao por morte",
    "AI":  "aposentadoria por invalidez",
}

NOMES = {
    "BPC": "BPC / LOAS",
    "SM":  "Salario Maternidade",
    "AR":  "Aposentadoria Rural",
    "AE":  "Aposentadoria Especial",
    "PM":  "Pensao por Morte",
    "AI":  "Aposentadoria por Invalidez",
}

HASHTAGS = {
    "BPC": ["#bpc", "#autismo", "#tea", "#loas", "#direitoprevidenciario"],
    "SM":  ["#salariomaternidade", "#maternidade", "#mei", "#inss", "#direitoprevidenciario"],
    "AR":  ["#aposentadoriarural", "#seguidorespecial", "#trabalhadorarural", "#inss"],
    "AE":  ["#aposentadoriaespecial", "#insalubre", "#tempoespecial", "#inss"],
    "PM":  ["#pensaopormorte", "#inss", "#dependente", "#direitosprevidenciarios"],
    "AI":  ["#aposentadoriainvalidez", "#auxiliodoenca", "#inss", "#direitoprevidenciario"],
}

ANGULO = {
    "BPC": "Muitas familias nao sabem que tem direito - explique os criterios de forma simples",
    "SM":  "MEIs e autonomas tem duvidas frequentes - conteudo pratico converte muito",
    "AR":  "Documentacao e a maior dificuldade - roteiros de 'o que preciso juntar' tem alto alcance",
    "AE":  "Profissionais de saude e construcao civil sao nichos de alto valor - foque em casos reais",
    "PM":  "Alta carga emocional - conteudo empatico sobre prazos e documentos gera confianca",
    "AI":  "Pessoas em sofrimento buscam esperanca - linguagem acolhedora + orientacao pratica",
}

SCORE_CORTE = 6.0


def buscar_um_termo(pytrends, termo):
    for tentativa in range(3):
        try:
            pytrends.build_payload([termo], timeframe="today 1-m", geo="BR")
            df = pytrends.interest_over_time()
            if not df.empty and termo in df.columns:
                return int(df[termo].mean())
            return 0
        except Exception as e:
            msg = str(e)
            if "429" in msg or "too many" in msg.lower():
                espera = 20 + tentativa * 15
                print(f"  Rate limit - aguardando {espera}s...")
                time.sleep(espera)
            else:
                print(f"  Erro: {e}")
                return None
    return None


def buscar_tendencias():
    pytrends = TrendReq(hl="pt-BR", tz=-180, timeout=(15, 30))
    resultados = {}
    total = len(TERMOS_PRINCIPAIS)

    for i, (area, termo) in enumerate(TERMOS_PRINCIPAIS.items(), 1):
        print(f"  [{i}/{total}] \'{termo}\'...", end=" ", flush=True)
        interesse = buscar_um_termo(pytrends, termo)
        if interesse is not None:
            resultados[area] = {"termo": termo, "interesse": interesse}
            print(f"{interesse}/100")
        else:
            print("sem dados")
        if i < total:
            time.sleep(8)

    return resultados


def gerar_temas(resultados):
    temas = []
    print("\nInteresse detectado (Google Trends Brasil - ultimo mes):")
    for area, dado in sorted(resultados.items(), key=lambda x: -x[1]["interesse"]):
        interesse = dado["interesse"]
        score = round(min(interesse / 10, 10.0), 1)
        flag = "OK" if score >= SCORE_CORTE else "  "
        print(f"   {flag} {area}: {interesse}/100 (score {score}) - \'{dado[\'termo\']}\'")
        temas.append({
            "tema":                  NOMES.get(area, area),
            "area":                  area,
            "termo_pesquisado":      dado["termo"],
            "interesse_google":      interesse,
            "score_estimado":        score,
            "angulo_conteudo":       ANGULO.get(area, ""),
            "hashtags_relacionadas": HASHTAGS.get(area, []),
        })

    temas.sort(key=lambda x: x["score_estimado"], reverse=True)
    acima = [t for t in temas if t["score_estimado"] >= SCORE_CORTE]
    return acima if acima else temas[:6]


def main():
    print("Analisando tendencias de busca no Google (Brasil)...")
    print("Periodo: ultimo mes - Regiao: BR\n")

    resultados = buscar_tendencias()

    if not resultados:
        print("Nenhum dado retornado. Mantendo JSON existente.")
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

    content = json.dumps(output, ensure_ascii=False, indent=2)
    json.loads(content)  # valida antes de salvar

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n{len(temas)} temas salvos em dados/temas_em_alta.json")


if __name__ == "__main__":
    main()
