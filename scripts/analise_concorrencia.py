"""
Script de Análise de Mercado — BaldezLabs
==========================================
Lê a lista de perfis monitorados via variável de ambiente CONCORRENTES_LIST
(nunca armazenada no repositório público).

Coleta dados públicos do Instagram (via scraping ético)
Gera dados/temas_em_alta.json com os temas em alta

COMO EXECUTAR LOCALMENTE:
    pip install instaloader
    set CONCORRENTES_LIST=perfil1,perfil2,perfil3
    python scripts/analise_concorrencia.py

AGENDAMENTO (GitHub Actions):
    Ver .github/workflows/analise_concorrentes.yml
    Configurar secret CONCORRENTES_LIST em:
    Settings → Secrets and variables → Actions → New repository secret

ATENÇÃO:
    - Use apenas perfis públicos
    - Respeite os limites de requisição do Instagram
    - Este script coleta apenas dados públicos (legendas e hashtags)
    - Os usernames monitorados nunca ficam visíveis no código público
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

SCORE_CORTE = 8.6  # Apenas temas acima deste score aparecem no dashboard


def carregar_perfis() -> list:
    """
    Lê usernames da variável de ambiente CONCORRENTES_LIST.
    Formato: 'perfil1,perfil2,perfil3'
    Os nomes NUNCA ficam gravados no repositório público.
    """
    raw = os.environ.get("CONCORRENTES_LIST", "").strip()
    if not raw:
        raise EnvironmentError(
            "Variável CONCORRENTES_LIST não definida.\n"
            "Localmente: set CONCORRENTES_LIST=perfil1,perfil2\n"
            "No GitHub: Settings → Secrets → CONCORRENTES_LIST"
        )
    perfis = [p.strip() for p in raw.split(",") if p.strip()]
    print(f"📋 {len(perfis)} perfis carregados (confidencial)")
    return perfis


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
        print(f"  ⚠️  Erro ao coletar perfil: {e}")
    return posts


def calcular_score(likes_total: int, posts: int, frequencia: int, num_perfis: int) -> float:
    """
    Score 0–10 baseado em 4 parâmetros:
      - media_likes     (40%): engajamento médio dos posts sobre o tema
      - frequencia      (30%): quantos perfis diferentes abordaram o tema
      - saturacao       (20%): penaliza temas abordados por muitos (>70% dos perfis)
      - volume          (10%): volume total de posts

    Corte padrão: SCORE_CORTE = 8.6
    """
    if posts == 0:
        return 0.0

    media_likes = likes_total / posts
    # Normaliza média de likes (benchmark: 500 likes = score máximo)
    likes_score = min(media_likes / 500, 1.0) * 4.0

    # Frequência entre perfis monitorados
    freq_score = (frequencia / num_perfis) * 3.0

    # Saturação — penaliza se >70% dos perfis já falam disso
    saturacao = frequencia / num_perfis
    saturacao_bonus = (1 - saturacao) * 2.0 if saturacao > 0.7 else 2.0

    # Volume de posts
    volume_score = min(posts / 20, 1.0) * 1.0

    total = likes_score + freq_score + saturacao_bonus + volume_score
    return round(min(total, 10.0), 1)


def gerar_temas_em_alta(todos_posts: list, num_perfis: int) -> list:
    """Agrega posts por área, calcula score e filtra pelo corte."""
    por_area = {}
    perfis_por_area = {}

    for post in todos_posts:
        area = post["area"]
        if area == "OUTROS":
            continue
        if area not in por_area:
            por_area[area] = {"posts": 0, "likes": 0, "hashtags": [], "perfis": set()}
        por_area[area]["posts"] += 1
        por_area[area]["likes"] += post.get("likes", 0)
        por_area[area]["hashtags"].extend(post.get("hashtags", []))
        # Nota: não gravamos qual perfil — só contamos quantos perfis diferentes
        por_area[area]["perfis"].add(post.get("_perfil_idx", 0))

    temas = []
    for area, dados in por_area.items():
        frequencia = len(dados["perfis"])
        score = calcular_score(dados["likes"], dados["posts"], frequencia, num_perfis)
        top_hashtags = [f"#{tag}" for tag, _ in Counter(dados["hashtags"]).most_common(5)]

        if score >= SCORE_CORTE:
            temas.append({
                "area": area,
                "score_estimado": score,
                "posts_analisados": dados["posts"],
                "media_likes": round(dados["likes"] / max(dados["posts"], 1)),
                "hashtags_relacionadas": top_hashtags,
            })

    return sorted(temas, key=lambda x: x["score_estimado"], reverse=True)


def main():
    print("🔍 Iniciando análise de mercado...")

    if not INSTALOADER_DISPONIVEL:
        print("❌ Instale as dependências: pip install instaloader")
        return

    perfis = carregar_perfis()

    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        quiet=True,
    )

    todos_posts = []
    for idx, username in enumerate(perfis):
        print(f"  📥 Coletando perfil {idx + 1}/{len(perfis)}...")
        posts = coletar_posts_perfil(username, loader)
        # Adiciona índice do perfil (sem revelar o username)
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

    print(f"\n✅ {len(temas)} temas acima do corte {SCORE_CORTE} salvos em dados/temas_em_alta.json")


if __name__ == "__main__":
    main()
