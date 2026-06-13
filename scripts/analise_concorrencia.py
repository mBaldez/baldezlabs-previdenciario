"""
Análise de Mercado — BaldezLabs
================================
Usa Apify (Instagram Scraper) para coletar posts públicos.

Secrets necessários:
  CONCORRENTES_LIST  — perfil1,perfil2,perfil3
  APIFY_TOKEN        — token em console.apify.com/account/integrations
"""

import json
import os
import time
import requests
import statistics
from datetime import datetime
from collections import Counter

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_JSON = os.path.join(BASE_DIR, "dados", "temas_em_alta.json")

APIFY_ACTOR = "apify~instagram-scraper"
SCORE_CORTE = 8.6

CATEGORIAS = {
    "SM":  ["salariomaternidade", "maternidade", "inssmaternidade", "licencamaternidade"],
    "BPC": ["bpc", "autismo", "tea", "beneficioassistencial", "loas", "bpcautismo"],
    "AR":  ["aposentadoriarural", "seguidorespecial", "trabalhadorarural", "agricultora", "pescador"],
    "AE":  ["aposentadoriaespecial", "insalubre", "ppp", "tempoespecial", "periculosidade"],
    "AA":  ["auxilioacidente", "acidentedetrabalho", "cat", "sequela"],
    "PM":  ["pensaopormorte", "pensao", "dependente", "obito"],
}

NOMES = {
    "SM": "Salário Maternidade",
    "BPC": "BPC / LOAS",
    "AR": "Aposentadoria Rural",
    "AE": "Aposentadoria Especial",
    "AA": "Auxílio Acidente",
    "PM": "Pensão por Morte",
}

IGNORAR_EMERGENTES = {"inss","previdencia","advogado","direito","brasil","juridico",
                      "advogados","previdenciario","social","advocacia"}


# ── helpers ────────────────────────────────────────────────────

def carregar_perfis():
    raw = os.environ.get("CONCORRENTES_LIST", "").strip()
    if not raw:
        raise EnvironmentError("CONCORRENTES_LIST não definida.")
    perfis = [p.strip() for p in raw.split(",") if p.strip()]
    print(f"📋 {len(perfis)} perfis carregados")
    return perfis


def extrair_hashtags(texto):
    if not texto:
        return []
    return [t.lower().lstrip("#") for t in texto.split() if t.startswith("#")]


def classificar(hashtags):
    contagem = {a: 0 for a in CATEGORIAS}
    for tag in hashtags:
        for area, palavras in CATEGORIAS.items():
            if any(p in tag for p in palavras):
                contagem[area] += 1
    melhor = max(contagem, key=contagem.get)
    return melhor if contagem[melhor] > 0 else "OUTROS"


def calcular_score(likes_lista, n_posts, n_perfis, total_perfis):
    if n_posts == 0:
        return 0.0
    mediana     = statistics.median(likes_lista) if likes_lista else 0
    likes_score = min(mediana / 150, 1.0) * 4.0
    freq_score  = (n_perfis / total_perfis) * 3.5
    saturacao   = n_perfis / total_perfis
    sat_bonus   = (1 - saturacao) * 1.5 if saturacao > 0.5 else 1.5
    vol_score   = min(n_posts / 10, 1.0) * 1.0
    return round(min(likes_score + freq_score + sat_bonus + vol_score, 10.0), 1)


# ── Apify async ────────────────────────────────────────────────

def coletar_via_apify(usernames, token):
    urls = [f"https://www.instagram.com/{u}/" for u in usernames]
    print(f"🌐 Iniciando run Apify para {len(usernames)} perfis...")

    # 1. Inicia run
    r = requests.post(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/runs",
        params={"token": token},
        json={"directUrls": urls, "resultsType": "posts", "resultsLimit": 20},
        timeout=30,
    )
    r.raise_for_status()
    data       = r.json()["data"]
    run_id     = data["id"]
    dataset_id = data["defaultDatasetId"]
    print(f"   Run ID: {run_id}")

    # 2. Aguarda conclusão (máx 8 min)
    for i in range(48):
        time.sleep(10)
        s = requests.get(
            f"https://api.apify.com/v2/actor-runs/{run_id}",
            params={"token": token}, timeout=15
        ).json()["data"]["status"]
        print(f"   [{(i+1)*10}s] {s}")
        if s in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            if s != "SUCCEEDED":
                print(f"⚠️  Run terminou com: {s}")
                return []
            break

    # 3. Busca resultados
    items = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": token, "format": "json", "clean": "true"},
        timeout=60,
    ).json()
    print(f"   {len(items)} posts recebidos")
    return items


# ── processamento ──────────────────────────────────────────────

def processar(items, total_perfis):
    por_area       = {}
    hashtags_outros = []

    for item in items:
        caption  = item.get("caption") or item.get("alt") or ""
        likes    = item.get("likesCount") or item.get("likes") or 0
        owner    = item.get("ownerUsername") or item.get("username") or ""
        hashtags = extrair_hashtags(caption)
        area     = classificar(hashtags)

        if area == "OUTROS":
            hashtags_outros.extend(hashtags)
            continue

        if area not in por_area:
            por_area[area] = {"likes": [], "hashtags": [], "perfis": set()}

        por_area[area]["likes"].append(likes)
        por_area[area]["hashtags"].extend(hashtags)
        por_area[area]["perfis"].add(owner)

    # Temas emergentes (top hashtags de posts não classificados)
    top_outros = [
        f"#{t}" for t, _ in Counter(hashtags_outros).most_common(15)
        if len(t) > 4 and t not in IGNORAR_EMERGENTES
    ]

    # Calcula scores
    temas = []
    for area, d in por_area.items():
        n_posts  = len(d["likes"])
        n_perfis = len(d["perfis"])
        score    = calcular_score(d["likes"], n_posts, n_perfis, total_perfis)
        mediana_l = int(statistics.median(d["likes"])) if d["likes"] else 0
        top_tags = [f"#{t}" for t, _ in Counter(d["hashtags"]).most_common(5)]
        temas.append({
            "tema": NOMES.get(area, area),
            "area": area,
            "score_estimado": score,
            "motivo": f"{n_posts} posts · mediana {mediana_l} likes · {n_perfis} perfis abordaram",
            "hashtags_relacionadas": top_tags,
        })

    temas.sort(key=lambda x: x["score_estimado"], reverse=True)

    # Diagnóstico
    print("\n📊 Scores detectados:")
    for t in temas:
        flag = "✅" if t["score_estimado"] >= SCORE_CORTE else "  "
        print(f"   {flag} {t['area']}: {t['score_estimado']} — {t['motivo']}")
    print(f"\n🔎 Emergentes: {top_outros[:5]}")

    classificados = sum(len(d["likes"]) for d in por_area.values())
    acima = [t for t in temas if t["score_estimado"] >= SCORE_CORTE]
    return (acima if acima else temas[:6]), top_outros, len(items), classificados


# ── main ───────────────────────────────────────────────────────

def main():
    print("🔍 Iniciando análise de mercado via Apify...")

    token = os.environ.get("APIFY_TOKEN", "").strip()
    if not token:
        raise EnvironmentError("APIFY_TOKEN não definido.")

    perfis = carregar_perfis()

    try:
        items = coletar_via_apify(perfis, token)
    except Exception as e:
        print(f"⚠️  Erro na coleta: {e}")
        items = []

    temas, top_outros, total, classificados = processar(items, len(perfis))

    output = {
        "gerado_em": datetime.now().strftime("%Y-%m-%d"),
        "fonte": "apify_instagram_scraper",
        "proxima_atualizacao": "automatica_via_github_actions",
        "score_corte": SCORE_CORTE,
        "posts_analisados_total": total,
        "posts_classificados": classificados,
        "temas_em_alta": temas,
        "temas_emergentes": top_outros,
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(temas)} temas salvos")


if __name__ == "__main__":
    main()
