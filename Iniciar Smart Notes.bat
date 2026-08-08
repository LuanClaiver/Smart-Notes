@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Smart Notes 1.5.4

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Reinstale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)

node "%~dp0scripts\iniciar-smart-notes.js"
set "CODIGO=%ERRORLEVEL%"
if not "%CODIGO%"=="0" (
  echo.
  echo [ERRO] O Smart Notes foi encerrado com falha. Revise as mensagens acima.
  pause
)
exit /b %CODIGO%
