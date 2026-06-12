# ============================================================
# BaldezLabs — Setup GitHub
# ============================================================
# COMO EXECUTAR:
# 1. Abra o PowerShell
# 2. Navegue ate esta pasta:
#    cd "C:\Users\mikeb\OneDrive\Documents\Claude\Projects\Agencia de Marketing"
# 3. Execute:
#    .\SETUP_GITHUB.ps1
# ============================================================

# --- CONFIGURACAO: preencha antes de rodar ---
$GithubUsername  = "mBaldez"
$GithubToken     = "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"   # Token classico com escopo 'repo'
$RepoNome        = "baldezlabs-previdenciario"
$SeuNome         = "Michael Baldez"
$SeuEmail        = "mikebaldez75@gmail.com"
# ---------------------------------------------------

Write-Host "Iniciando configuracao do repositorio GitHub..." -ForegroundColor Cyan

# Pasta do projeto
$PastaLocal = $PSScriptRoot
Set-Location $PastaLocal

# 1. Remover .git quebrado se existir
if (Test-Path ".git") {
    Write-Host "Removendo .git anterior..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".git"
}

# 2. Inicializar git
git init
git config user.name  $SeuNome
git config user.email $SeuEmail
git branch -m main

# 2. Criar repositorio no GitHub via API
Write-Host "Criando repositorio no GitHub..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $GithubToken"
    "Accept"        = "application/vnd.github+json"
    "Content-Type"  = "application/json"
}

$bodyObj = @{
    name        = $RepoNome
    description = "Sistema de Marketing Digital - Direito Previdenciario | @baldezlabs"
    private     = $true
}
$body = $bodyObj | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://api.github.com/user/repos" `
    -Method POST `
    -Headers $headers `
    -Body $body

Write-Host "Repositorio criado: $($response.html_url)" -ForegroundColor Green

# 3. Adicionar remote e fazer push
$RemoteUrl = "https://${GithubUsername}:${GithubToken}@github.com/${GithubUsername}/${RepoNome}.git"
git remote add origin $RemoteUrl
git add .
git commit -m "Commit inicial - 6 temas previdenciarios + scripts de automacao"
git push -u origin main

Write-Host ""
Write-Host "Pronto! Repositorio publicado com sucesso." -ForegroundColor Green
Write-Host "Acesse: https://github.com/$GithubUsername/$RepoNome" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "   1. Adicione o token como GitHub Secret (Settings, Secrets, ACTIONS_TOKEN)"
Write-Host "   2. Instale Python e rode: pip install instaloader"
Write-Host "   3. Teste o script: python scripts/analise_concorrencia.py"
