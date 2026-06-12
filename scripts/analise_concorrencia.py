"""
Script de Análise de Concorrência — BaldezLabs
===============================================
Lê a lista de perfis em concorrentes/perfis.json
Coleta dados públicos do Instagram (via scraping ético)
Gera dados/temas_em_alta.json com os temas em alta

COMO EXECUTAR:
    pip install instaloader
    python scripts/analise_concorrencia.py

AGENDAMENTO (GitHub Actions):
    Ver .github/workflows/analise_concorrentes.yml

ATENÇÃO:
    - Use apenas perfis públicos
    - Respeite os limites de requisição do Instagram
    - Este script coleta apenas dados públicos (legendas e hashtags)
"""

import json
import os
from datetime import datetime
from collections import Counter

# ── Dependências opcionais ──────────────────────────────────────
try:
    import instaloader
    INSTALOADER_DISPONIVEL = True
except ImportError:
    INSTALOADER_DISPONIVEL = False
    print("⚠️  instaloader não instalado. Execute: pip install instaloader")

# ── Caminhos ────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERFIS_JSON = os.path.join(BASE_DIR, "concorrentes", "perfis.json")
OUTPUT_JSON = os.path.join(BASE_DIR, "dados", "temas_em_alta.json")

# ── Hashtags relacionadas a temas previdenciários ───────────────
CATEGORIAS_HASHTAGS = {
    "SM": ["salariomaternidade", "maternidade", "inssmaternidade", "beneficiomaternidade"],
    "BPC": ["bpc", "autismo", "tea", "beneficioassistencial", "loas"],
    "AR": ["aposentadoriarural", "seguidorespecial", "trabalhadorarural", "roça"],
    "AE": ["aposentadoriaespecial", "insalubre", "ppp", "tempoespecial"],
    "AA": ["auxilioacidente", "acidentedetrabalho", "cat", "sequela"],
    "PM": ["pensaopormorte", "pensao", "dependente", "obito"],
}


def carregar_perfis():
    """Lê a lista de perfis do JSON."""
    with open(PERFIS_JSON, "r", encoding="utf-8") as f:
        dados = json.load(f)
    return [p["username"] for p in dados["perfis"] if p.get("ativo")]


def analisar_hashtags_post(legenda: str) -> list:
    """Extrai hashtags de uma legenda."""
    if not legenda:
        return []
    return [
        tag.lower().lstrip("#")
        for tag in legenda.split()
        if tag.startswith("#")
    ]


def classificar_tema(hashtags: list) -> str:
    """Classifica um post em uma área temática com base nas hashtags."""
    contagem = {area: 0 for area in CATEGORIAS_HASHTAGS}
    for tag in hashtags:
        for area, tags_area in CATEGORIAS_HASHTAGS.items():
            if any(t in tag for t in tags_area):
                contagem[area] += 1
    melhor = max(contagem, key=contagem.get)
    return melhor if contagem[melhor] > 0 else "OUTROS"


def coletar_posts_perfil(username: str, loader, max_posts: int = 30) -> list:
    """Coleta os últimos N posts de um perfil público."""
    posts = []
    try:
        perfil = instaloader.Profile.from_username(loader.context, username)
        for i, post in enumerate(perfil.get_posts()):
            if i >= max_posts:
                break
            hashtags = analisar_hashtags_post(post.caption)
            posts.append({
                "shortcode": post.shortcode,
                "data": post.date_utc.strftime("%Y-%m-%d"),
                "likes": post.likes,
                "comentarios": post.comments,
                "area": classificar_tema(hashtags),
                "hashtags": hashtags[:10],
            })
    except Exception as e:
        print(f"  ⚠️  Erro ao coletar {username}: {e}")
    return posts


def gerar_temas_em_alta(todos_posts: list) -> list:
    """Agrega posts por área e calcula score de popularidade."""
    por_area = {}
    for post in todos_posts:
        area = post["area"]
        if area not in por_area:
            por_area[area] = {"posts": 0, "likes": 0, "hashtags": []}
        por_area[area]["posts"] += 1
        por_area[area]["likes"] += post.get("likes", 0)
        por_area[area]["hashtags"].extend(post.get("hashtags", []))

    temas = []
    for area, dados in por_area.items():
        if area == "OUTROS":
            continue
        score = round(dados["likes"] / max(dados["posts"], 1) / 100, 1)
        top_hashtags = [f"#{tag}" for tag, _ in Counter(dados["hashtags"]).most_common(5)]
        temas.append({
            "area": area,
            "posts_analisados": dados["posts"],
            "media_likes": round(dados["likes"] / max(dados["posts"], 1)),
            "score_estimado": min(score, 10.0),
            "hashtags_mais_usadas": top_hashtags,
        })

    return sorted(temas, key=lambda x: x["score_estimado"], reverse=True)


def main():
    print("🔍 Iniciando análise de concorrentes...")

    if not INSTALOADER_DISPONIVEL:
        print("❌ Instale as dependências: pip install instaloader")
        return

    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        quiet=True,
    )

    perfis = carregar_perfis()
    print(f"📋 {len(perfis)} perfis carregados")

    todos_posts = []
    for username in perfis:
        print(f"  📥 Coletando @{username}...")
        posts = coletar_posts_perfil(username, loader)
        todos_posts.extend(posts)
        print(f"     {len(posts)} posts coletados")

    temas = gerar_temas_em_alta(todos_posts)

    output = {
        "gerado_em": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fonte": "github_actions_automatico",
        "perfis_analisados": len(perfis),
        "posts_analisados": len(todos_posts),
        "temas_em_alta": temas,
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Arquivo gerado: {OUTPUT_JSON}")
    print(f"📊 {len(temas)} áreas analisadas")
    for tema in temas[:3]:
        print(f"   🔥 {tema['area']} — score {tema['score_estimado']}")


if __name__ == "__main__":
    main()
