@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Enviar Smart Notes ao GitHub
cd /d "%~dp0" || goto :erro

where git >nul 2>&1 || (
  echo ERRO: Git nao foi encontrado.
  echo Instale o Git for Windows e execute novamente.
  pause
  exit /b 1
)

if not exist "mobile-app\package.json" (
  echo ERRO: Execute este arquivo dentro da pasta 02 - GitHub - Repositorio Completo.
  pause
  exit /b 1
)

if not exist ".git" (
  git init || goto :erro
  git branch -M main
)

for /f "delims=" %%R in ('git remote 2^>nul') do set "TEM_REMOTE=1"
if not defined TEM_REMOTE (
  echo.
  set "REPO_URL=https://github.com/LuanClaiver/Smart-Notes.git"
  set /p "REPO_INFORMADO=Cole a URL HTTPS do repositorio [Enter para usar LuanClaiver/Smart-Notes]: "
  if defined REPO_INFORMADO set "REPO_URL=!REPO_INFORMADO!"
  git remote add origin "!REPO_URL!" || goto :erro
)

for /f "delims=" %%N in ('git config user.name 2^>nul') do set "GIT_NAME=%%N"
if not defined GIT_NAME (
  set /p "GIT_NAME=Seu nome para os commits: "
  if not defined GIT_NAME goto :erro
  git config user.name "!GIT_NAME!"
)

for /f "delims=" %%E in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%E"
if not defined GIT_EMAIL (
  set /p "GIT_EMAIL=Seu e-mail do GitHub: "
  if not defined GIT_EMAIL goto :erro
  git config user.email "!GIT_EMAIL!"
)

echo.
echo Sincronizando com o repositorio...
git fetch origin main >nul 2>&1
if not errorlevel 1 (
  git reset --mixed origin/main || goto :erro
) else (
  git branch -M main
)

git add -A || goto :erro
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova foi encontrada.
  pause
  exit /b 0
)

set "MENSAGEM=Smart Notes 1.4.2 - exportacao, navegacao e APK corrigidos"
set /p "PERSONALIZADA=Descricao do envio [Enter para usar a padrao]: "
if defined PERSONALIZADA set "MENSAGEM=!PERSONALIZADA!"

git commit -m "!MENSAGEM!" || goto :erro
git branch -M main
git push -u origin main || goto :erro

echo.
echo Smart Notes enviado com sucesso.
echo Abra a guia Actions no GitHub para baixar o APK.
pause
exit /b 0

:erro
echo.
echo ERRO: O envio nao foi concluido. Leia a mensagem acima.
pause
exit /b 1
