@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Smart Notes Frontend

cd /d "%~dp0"
if errorlevel 1 (
  echo ERRO: Nao foi possivel acessar a pasta do frontend:
  echo %~dp0
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale o Node.js LTS e execute novamente.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias do frontend...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo ERRO: Nao foi possivel instalar as dependencias do frontend.
    pause
    exit /b 1
  )
)

echo Iniciando interface em http://localhost:5173 ...
call npm run dev -- --host 0.0.0.0
set "CODIGO=%errorlevel%"
echo.
echo O frontend foi encerrado com o codigo %CODIGO%.
pause
exit /b %CODIGO%
