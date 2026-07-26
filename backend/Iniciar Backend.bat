@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0" || exit /b 1
:loop
node apply-pending-import.js
if errorlevel 1 (
  echo Falha ao aplicar uma importacao pendente.
  pause
  exit /b 1
)
node server.js
set "CODIGO=!errorlevel!"
if "!CODIGO!"=="75" (
  echo [Banco] Reiniciando para concluir a importacao...
  timeout /t 2 /nobreak >nul
  goto :loop
)
echo O servidor foi encerrado com o codigo !CODIGO!.
pause
