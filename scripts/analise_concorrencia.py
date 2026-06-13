"""
Script de Análise de Mercado — BaldezLabs
==========================================
Usa a API da Apify (Instagram Profile Scraper) para coletar
posts públicos de forma confiável, sem bloqueios do Instagram.

Variáveis de ambiente necessárias (GitHub Secrets):
  CONCORRENTES_LIST  — perfil1,perfil2,perfil3
  APIFY_TOKEN        — token da conta Apify (console.apify.com/account/integrations)

Custo estimado: ~$0.10 por execução semanal (plano gratuito $5/mês)
"""

import json
import os
import time
import requests
import statistics
from datetime import datetime
from collections import Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_JSON = os.path.join(BASE_DIR, "dados", "temas_em_alta.json")

CATEGORIAS_HASHTAGS = {
    "SM": ["salariomaternidade", "maternidade", "inssmaternidade", "beneficiomaternidade", "licencamaternidade"],
    "BPC": ["bpc", "autismo", "tea", "beneficioassistencial", "loas", "bpcautismo"],
    "AR": ["aposentadoriarural", "seguidorespecial", "trabalhadorarural", "agricultora", "pescador"],
    "AE": ["aposentadoriaespecial", "insalubre", "ppp", "tempoespecial", "periculosidade"],
    "AA": ["auxilioacidente", "acidentedetrabalho", "cat", "sequela", "invalidez"],
    "PM": ["pensaopormorte", "pensao", "dependente", "obito", "inventario"],
}

SCORE_CORTE = 8.6

APIFY_ACTOR = "apify~instagram-scraper"
APIFY_BASE_URL = f"https://api.apify.com/v2/acts/{APIFY_ACTOR}"


def carregar_perfis() -> list:
    raw = os.environ.get("CONCORRENTES_LIST", "").strip()
    if not raw:
        raise EnvironmentError("Variável CONCORRENTES_LIST não definida.")
    perfis = [p.strip() for p in raw.split(",") if p.strip()]
    print(f"📋 {len(perfis)} perfis carregados (confidencial)")
    return perfis


def coletar_via_apify(usernames: list, token: str) -> list:
    """
    Chama o Apify Instagram Profile Scraper e retorna todos os posts.
    Timeout de 5 minutos — suficiente para 10 perfis × 30 posts.
    """
    print(f"🌐 Chamando Apify para {len(usernames)} perfis...")
    # Monta lista de URLs dos perfis
    urls = [f"https://www.instagram.com/{u}/" for u in usernames]

    try:
        resp = requests.post(
            APIFY_RUN_URL,
            params={"token": token},
            json={
                "directUrls": urls,
                "resultsType": "posts",
                "resultsLimit": 30,
            },
            timeout=300,  # 5 minutos
        )
        resp.raise_for_status()
        items = resp.json()
        print(f"   {len(items)} posts recebidos da Apify")
        return items
    except requests.exceptions.Timeout:
        print("⚠️  Timeout na Apify. Tente novamente.")
        return []
    except Exception as e:
        print(f"⚠️  Erro Apify: {e}")
        return []


def analisar_hashtags(texto: str) -> list:
    if not texto:
        return []
    return [t.lower().lstrip("#") for t in texto.split() if t.startswith("#")]


def classificar_tema(hashtags: list) -> str:
    contagem = {area: 0 for area in CATEGORIAS_HASHTAGS}
    for tag in hashtags:
        for area, tags_area in CATEGORIAS_HASHTAGS.items():
            if any(t in tag for t in tags_area):
                contagem[area] += 1
    melhor = max(contagem, key=contagem.get)
    return melhor if contagem[melhor] > 0 else "OUTROS"


def calcular_score(likes_total, posts, frequencia, num_perfis) -> float:
    """
    Score 0–10 calibrado para contas de nicho (benchmark: 150 likes médios).
    Parâmetros:
      likes_score  (40%): engajamento médio — benchmark 150 likes = score máx
      freq_score   (35%): quantos perfis diferentes abordaram o tema
      sat_bonus    (15%): bônus para temas pouco explorados (<50% dos perfis)
      volume_score (10%): volume de posts sobre o tema
    """
    if posts == 0:
        return 0.0
    media_likes    = likes_total / posts
    likes_score    = min(media_likes / 150, 1.0) * 4.0   # benchmark 150 likes
    # Nota: quem chama pode passar mediana em vez de média para evitar distorção viral
    freq_score     = (frequencia / num_perfis) * 3.5
    saturacao      = frequencia / num_perfis
    sat_bonus      = (1 - saturacao) * 1.5 if saturacao > 0.5 else 1.5
    volume_score   = min(posts / 10, 1.0) * 1.0
    return round(min(likes_score + freq_score + sat_bonus + volume_score, 10.0), 1)


def processar_posts(items: list, num_perfis: int) -> list:
    """Processa a resposta da Apify e calcula scores por área."""
    por_area = {}

    hashtags_outros = []   # hashtags de posts não classificados

    for item in items:
        caption  = item.get("caption") or item.get("alt") or ""
        likes    = item.get("likesCount") or item.get("likes") or 0
        owner    = item.get("ownerUsername") or item.get("username") or ""
        hashtags = analisar_hashtags(caption)
        area     = classificar_tema(hashtags)

        if area == "OUTROS":
            hashtags_outros.extend(hashtags)
            continue

        if area not in por_area:
            por_area[area] = {"posts": 0, "likes_lista": [], "hashtags": [], "perfis": set()}

        por_area[area]["posts"]       += 1
        por_area[area]["likes_lista"].append(likes)
        por_area[area]["hashtags"]    += hashtags
        por_area[area]["perfis"].add(owner)

    NOMES_AREAS = {
        "SM": "Salário Maternidade",
        "BPC": "BPC / LOAS",
        "AR": "Aposentadoria Rural",
        "AE": "Aposentadoria Especial",
        "AA": "Auxílio Acidente",
        "PM": "Pensão por Morte",
    }

    temas = []
    for area, d in por_area.items():
        freq  = len(d["perfis"])
        score = calcular_score(d["likes"], d["posts"], freq, num_perfis)
        top_tags = [f"#{t}" for t, _ in Counter(d["hashtags"]).most_common(5)]

        media_l = round(d["likes"] / max(d["posts"], 1))
        temas.append({
            "tema": NOMES_AREAS.get(area, area),
            "area": area,
            "score_estimado": score,
            "motivo": f"{d['posts']} posts analisados · média {media_l} likes · {freq} perfis abordaram o tema",
            "hashtags_relacionadas": top_tags,
        })

    temas_ordenados = sorted(temas, key=lambda x: x["score_estimado"], reverse=True)

    # Diagnóstico
    top_outros = [f"#{t}" for t, c in Counter(hashtags_outros).most_common(15)
                  if len(t) > 4 and t not in ("inss","previdencia","advogado","direito","brasil")]

    print("\n📊 Scores detectados:")
    for t in temas_ordenados:
        flag = "✅" if t["score_estimado"] >= SCORE_CORTE else "  "
        print(f"   {flag} {t['area']}: {t['score_estimado']} — {t['motivo']}")
    print(f"\n🔎 Posts não classificados: {len(hashtags_outros)} hashtags → top emergentes: {top_outros[:5]}")

    # Sempre retorna top 6 (nunca vazio); aplica corte só se houver temas acima dele
    acima_corte = [t for t in temas_ordenados if t["score_estimado"] >= SCORE_CORTE]
    return (acima_corte if acima_corte else temas_ordenados[:6]), top_outros


def main():
    print("🔍 Iniciando análise de mercado via Apify...")

    token = os.environ.get("APIFY_TOKEN", "").strip()
    if not token:
        raise EnvironmentError(
            "Variável APIFY_TOKEN não definida.\n"
            "Obtenha em: https://console.apify.com/account/integrations\n"
            "GitHub: Settings → Secrets → APIFY_TOKEN"
        )

    perfis = carregar_perfis()
    items  = coletar_via_apify(perfis, token)

    temas, top_outros = processar_posts(items, len(perfis))

    output = {
        "gerado_em": datetime.now().strftime("%Y-%m-%d"),
        "fonte": "apify_instagram_scraper",
        "proxima_atualizacao": "automatica_via_github_actions",
        "score_corte": SCORE_CORTE,
        "temas_em_alta": temas,
        "temas_emergentes": top_outros,
        "posts_analisados_total": len(items),
        "posts_classificados": sum(d["posts"] for d in por_area.values()),
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(temas)} temas salvos (corte {SCORE_CORTE})")


if __name__ == "__main__":
    main()
