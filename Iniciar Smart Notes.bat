@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
if errorlevel 1 goto :erro
title Smart Notes 1.4.2

echo ================================================
echo              SMART NOTES 1.4.2
echo ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale o Node.js LTS e execute novamente.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERRO: O npm nao foi encontrado junto com o Node.js.
  echo Reinstale o Node.js LTS e execute novamente.
  pause
  exit /b 1
)

if not exist "%~dp0backend\Iniciar Backend.bat" (
  echo ERRO: Arquivo do backend nao encontrado:
  echo %~dp0backend\Iniciar Backend.bat
  goto :erro
)

if not exist "%~dp0frontend\Iniciar Frontend.bat" (
  echo ERRO: Arquivo do frontend nao encontrado:
  echo %~dp0frontend\Iniciar Frontend.bat
  goto :erro
)

if not exist "%~dp0backend\node_modules\express" (
  echo Instalando dependencias do backend...
  pushd "%~dp0backend"
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :erro_pop
  popd
)

if not exist "%~dp0frontend\node_modules\vite\bin\vite.js" (
  echo Instalando dependencias do frontend...
  pushd "%~dp0frontend"
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :erro_pop
  popd
)

echo Iniciando backend...
start "Smart Notes Backend" "%~dp0backend\Iniciar Backend.bat"
if errorlevel 1 goto :erro

echo Iniciando frontend...
start "Smart Notes Frontend" "%~dp0frontend\Iniciar Frontend.bat"
if errorlevel 1 goto :erro

echo Aguardando a interface ficar disponivel...
set "PRONTO="
for /L %%I in (1,1,45) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch {}; exit 1" >nul 2>&1
  if not errorlevel 1 (
    set "PRONTO=1"
    goto :abrir
  )
  timeout /t 1 /nobreak >nul
)

:abrir
if defined PRONTO (
  echo Smart Notes iniciado com sucesso.
) else (
  echo A interface ainda esta iniciando. O navegador sera aberto mesmo assim.
)
start "" "http://localhost:5173"
exit /b 0

:erro_pop
popd
:erro
echo.
echo Nao foi possivel iniciar o Smart Notes.
echo Confira a mensagem exibida acima.
pause
exit /b 1
