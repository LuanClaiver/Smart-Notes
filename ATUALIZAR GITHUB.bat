@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Atualizar Smart Notes no GitHub
cd /d "%~dp0" || goto :erro

if not exist ".git" (
  echo Esta pasta ainda nao esta conectada ao GitHub.
  echo Execute primeiro ENVIAR REPOSITORIO COMPLETO.bat.
  pause
  exit /b 1
)

set "MENSAGEM=Atualizar Smart Notes"
set /p "PERSONALIZADA=Descricao da atualizacao [Enter para usar a padrao]: "
if defined PERSONALIZADA set "MENSAGEM=!PERSONALIZADA!"

git add -A || goto :erro
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova foi encontrada.
  pause
  exit /b 0
)

git commit -m "!MENSAGEM!" || goto :erro
git push || goto :erro

echo Atualizacao enviada. Acompanhe a geracao na guia Actions.
pause
exit /b 0

:erro
echo ERRO: Nao foi possivel atualizar o GitHub.
pause
exit /b 1
