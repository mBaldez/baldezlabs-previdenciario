"""
Script de Análise de Mercado — BaldezLabs
==========================================
Requer login no Instagram para contornar bloqueio de IPs de servidor.
Use uma conta SECUNDÁRIA dedicada — nunca a conta principal.

Variáveis de ambiente necessárias (GitHub Secrets):
  CONCORRENTES_LIST  — perfil1,perfil2,perfil3
  IG_USER            — usuario_conta_secundaria
  IG_PASS            — senha_conta_secundaria
"""

import json
import os
from datetime import datetime
from collections import Counter

try:
    import instaloader
    INSTALOADER_DISPONIVEL = True
except ImportError:
    INSTALOADER_DISPONIVEL = False
    print("❌ Execute: pip install instaloader")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_JSON = os.path.join(BASE_DIR, "dados", "temas_em_alta.json")

CATEGORIAS_HASHTAGS = {
    "SM": ["salariomaternidade", "maternidade", "inssmaternidade", "beneficiomaternidade"],
    "BPC": ["bpc", "autismo", "tea", "beneficioassistencial", "loas"],
    "AR": ["aposentadoriarural", "seguidorespecial", "trabalhadorarural"],
    "AE": ["aposentadoriaespecial", "insalubre", "ppp", "tempoespecial"],
    "AA": ["auxilioacidente", "acidentedetrabalho", "cat", "sequela"],
    "PM": ["pensaopormorte", "pensao", "dependente", "obito"],
}

SCORE_CORTE = 8.6


def carregar_perfis() -> list:
    raw = os.environ.get("CONCORRENTES_LIST", "").strip()
    if not raw:
        raise EnvironmentError("Variável CONCORRENTES_LIST não definida.")
    perfis = [p.strip() for p in raw.split(",") if p.strip()]
    print(f"📋 {len(perfis)} perfis carregados (confidencial)")
    return perfis


def criar_loader() -> "instaloader.Instaloader":
    """Cria loader com login. Usa IG_USER e IG_PASS dos secrets."""
    ig_user = os.environ.get("IG_USER", "").strip()
    ig_pass = os.environ.get("IG_PASS", "").strip()

    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        quiet=True,
    )

    if ig_user and ig_pass:
        try:
            loader.login(ig_user, ig_pass)
            print(f"✅ Login realizado com conta secundária")
        except Exception as e:
            print(f"⚠️  Falha no login: {e}. Tentando sem autenticação...")
    else:
        print("⚠️  IG_USER/IG_PASS não definidos. Coleta pode falhar.")

    return loader


def analisar_hashtags_post(legenda: str) -> list:
    if not legenda:
        return []
    return [tag.lower().lstrip("#") for tag in legenda.split() if tag.startswith("#")]


def classificar_tema(hashtags: list) -> str:
    contagem = {area: 0 for area in CATEGORIAS_HASHTAGS}
    for tag in hashtags:
        for area, tags_area in CATEGORIAS_HASHTAGS.items():
            if any(t in tag for t in tags_area):
                contagem[area] += 1
    melhor = max(contagem, key=contagem.get)
    return melhor if contagem[melhor] > 0 else "OUTROS"


def coletar_posts_perfil(username: str, loader, max_posts: int = 30) -> list:
    posts = []
    try:
        perfil = instaloader.Profile.from_username(loader.context, username)
        for i, post in enumerate(perfil.get_posts()):
            if i >= max_posts:
                break
            hashtags = analisar_hashtags_post(post.caption)
            posts.append({
                "data": post.date_utc.strftime("%Y-%m-%d"),
                "likes": post.likes,
                "area": classificar_tema(hashtags),
                "hashtags": hashtags[:10],
            })
    except Exception as e:
        print(f"  ⚠️  Erro: {e}")
    return posts


def calcular_score(likes_total, posts, frequencia, num_perfis) -> float:
    if posts == 0:
        return 0.0
    media_likes = likes_total / posts
    likes_score    = min(media_likes / 500, 1.0) * 4.0
    freq_score     = (frequencia / num_perfis) * 3.0
    saturacao      = frequencia / num_perfis
    sat_bonus      = (1 - saturacao) * 2.0 if saturacao > 0.7 else 2.0
    volume_score   = min(posts / 20, 1.0) * 1.0
    return round(min(likes_score + freq_score + sat_bonus + volume_score, 10.0), 1)


def gerar_temas_em_alta(todos_posts: list, num_perfis: int) -> list:
    por_area = {}
    for post in todos_posts:
        area = post["area"]
        if area == "OUTROS":
            continue
        if area not in por_area:
            por_area[area] = {"posts": 0, "likes": 0, "hashtags": [], "perfis": set()}
        por_area[area]["posts"] += 1
        por_area[area]["likes"] += post.get("likes", 0)
        por_area[area]["hashtags"].extend(post.get("hashtags", []))
        por_area[area]["perfis"].add(post.get("_perfil_idx", 0))

    NOMES_AREAS = {
        "SM": "Salário Maternidade",
        "BPC": "BPC / LOAS",
        "AR": "Aposentadoria Rural",
        "AE": "Aposentadoria Especial",
        "AA": "Auxílio Acidente",
        "PM": "Pensão por Morte",
    }

    temas = []
    for area, dados in por_area.items():
        frequencia = len(dados["perfis"])
        score = calcular_score(dados["likes"], dados["posts"], frequencia, num_perfis)
        top_tags = [f"#{t}" for t, _ in Counter(dados["hashtags"]).most_common(5)]
        if score >= SCORE_CORTE:
            temas.append({
                "tema": NOMES_AREAS.get(area, area),
                "area": area,
                "score_estimado": score,
                "motivo": f"{dados['posts']} posts analisados · média {round(dados['likes']/max(dados['posts'],1))} likes · {frequencia} perfis abordaram o tema",
                "hashtags_relacionadas": top_tags,
            })

    return sorted(temas, key=lambda x: x["score_estimado"], reverse=True)


def main():
    print("🔍 Iniciando análise de mercado...")
    if not INSTALOADER_DISPONIVEL:
        return

    perfis = carregar_perfis()
    loader = criar_loader()

    todos_posts = []
    for idx, username in enumerate(perfis):
        print(f"  📥 Coletando perfil {idx+1}/{len(perfis)}...")
        posts = coletar_posts_perfil(username, loader)
        for p in posts:
            p["_perfil_idx"] = idx
        todos_posts.extend(posts)
        print(f"     {len(posts)} posts coletados")

    temas = gerar_temas_em_alta(todos_posts, len(perfis))

    output = {
        "gerado_em": datetime.utcnow().strftime("%Y-%m-%d"),
        "fonte": "github_actions_automatico",
        "proxima_atualizacao": "automatica_via_github_actions",
        "score_corte": SCORE_CORTE,
        "temas_em_alta": temas,
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(temas)} temas acima do corte {SCORE_CORTE}")


if __name__ == "__main__":
    main()
