@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Smart Notes 1.5.4 - Enviar para GitHub

cd /d "%~dp0"

echo ============================================================
echo          SMART NOTES 1.5.4 - ENVIAR PARA GITHUB
echo ============================================================
echo.
echo Pasta que sera enviada:
echo %CD%
echo.

if not exist "backend\package.json" goto :sem_backend
if not exist "frontend\package.json" goto :sem_frontend
if not exist "mobile-app\package.json" goto :sem_mobile

where git >nul 2>&1
if errorlevel 1 goto :sem_git

git --version
echo.

if exist ".git\" goto :repo_pronto

echo [INFO] Inicializando o repositorio Git nesta pasta...
git init
if errorlevel 1 goto :erro

:repo_pronto
rem Se uma execucao anterior parou no meio de um rebase/merge, limpa somente
rem o estado Git interrompido antes de tentar novamente.
if exist ".git\rebase-merge\" goto :limpar_rebase
if exist ".git\rebase-apply\" goto :limpar_rebase
goto :verificar_merge

:limpar_rebase
echo [INFO] Foi encontrada uma sincronizacao anterior interrompida.
echo [INFO] Cancelando o rebase incompleto para continuar com seguranca...
git rebase --abort >nul 2>&1
if exist ".git\rebase-merge\" rmdir /s /q ".git\rebase-merge" >nul 2>&1
if exist ".git\rebase-apply\" rmdir /s /q ".git\rebase-apply" >nul 2>&1

:verificar_merge
if not exist ".git\MERGE_HEAD" goto :branch_main
echo [INFO] Foi encontrado um merge anterior interrompido. Cancelando...
git merge --abort >nul 2>&1

:branch_main
git branch -M main >nul 2>&1

rem Configura nome do autor apenas se ainda nao existir.
git config user.name >nul 2>&1
if not errorlevel 1 goto :email_git

echo.
set "GITNAME="
set /p "GITNAME=Digite seu nome para os commits: "
if defined GITNAME goto :salvar_nome
set "GITNAME=Smart Notes"

:salvar_nome
git config user.name "%GITNAME%"
if errorlevel 1 goto :erro

:email_git
git config user.email >nul 2>&1
if not errorlevel 1 goto :remote_git

echo.
set "GITEMAIL="
set /p "GITEMAIL=Digite seu e-mail usado no GitHub: "
if not defined GITEMAIL goto :email_vazio
git config user.email "%GITEMAIL%"
if errorlevel 1 goto :erro

:remote_git
git remote get-url origin >nul 2>&1
if not errorlevel 1 goto :remote_pronto

echo.
echo Cole abaixo a URL do seu repositorio GitHub.
echo Exemplo: https://github.com/SEU-USUARIO/Smart-Notes.git
echo.
set "REPOURL="
set /p "REPOURL=URL do repositorio: "
if not defined REPOURL goto :url_vazia

git remote add origin "%REPOURL%"
if errorlevel 1 goto :erro

:remote_pronto
echo.
echo Repositorio configurado:
git remote get-url origin
echo.

set "COMMITMSG=Smart Notes 1.5.4"

echo [1/4] Verificando a branch main do GitHub...
git ls-remote --exit-code --heads origin main >nul 2>&1
if errorlevel 1 goto :repositorio_vazio

echo [INFO] A branch main ja existe no GitHub.
echo [INFO] Baixando apenas o historico remoto, sem substituir seus arquivos...
git fetch origin main
if errorlevel 1 goto :erro_fetch

rem Em vez de pull/rebase, coloca os arquivos desta versao diretamente sobre
rem o ultimo commit remoto. Isso evita historicos nao relacionados e rebases presos.
git add -A
if errorlevel 1 goto :erro
git reset --soft origin/main
if errorlevel 1 goto :erro
git add -A
if errorlevel 1 goto :erro
goto :criar_commit

:repositorio_vazio
echo [INFO] O repositorio ainda nao possui a branch main.
git add -A
if errorlevel 1 goto :erro

:criar_commit
echo.
echo [2/4] Preparando o commit...
git diff --cached --quiet
if not errorlevel 1 goto :sem_alteracoes

set "DIGITADO="
set /p "DIGITADO=Mensagem do commit [Smart Notes 1.5.4]: "
if defined DIGITADO set "COMMITMSG=%DIGITADO%"

git commit -m "%COMMITMSG%"
if errorlevel 1 goto :erro
goto :enviar

:sem_alteracoes
echo [INFO] Nao ha diferencas novas em relacao ao GitHub.

:enviar
echo.
echo [3/4] Conferindo a conexao com o GitHub...
git remote -v

echo.
echo [4/4] Enviando para o GitHub...
git push -u origin main
if not errorlevel 1 goto :sucesso

echo.
echo [INFO] O GitHub mudou durante o envio. Tentando sincronizar uma vez...
git fetch origin main
if errorlevel 1 goto :erro_push

git reset --soft origin/main
if errorlevel 1 goto :erro_push
git add -A
if errorlevel 1 goto :erro_push
git diff --cached --quiet
if not errorlevel 1 goto :push_final

git commit -m "%COMMITMSG%"
if errorlevel 1 goto :erro_push

:push_final
git push -u origin main
if errorlevel 1 goto :erro_push

:sucesso
echo.
echo ============================================================
echo [OK] SMART NOTES 1.5.4 ENVIADO PARA O GITHUB COM SUCESSO.
echo ============================================================
echo.
pause
exit /b 0

:sem_backend
echo [ERRO] Este BAT precisa ficar na raiz dos arquivos do GitHub.
echo A pasta backend nao foi encontrada.
goto :erro_final

:sem_frontend
echo [ERRO] A pasta frontend nao foi encontrada.
goto :erro_final

:sem_mobile
echo [ERRO] A pasta mobile-app nao foi encontrada.
goto :erro_final

:sem_git
echo [ERRO] Git nao encontrado.
echo Instale o Git for Windows e marque a opcao para adiciona-lo ao PATH.
goto :erro_final

:email_vazio
echo [ERRO] O e-mail e obrigatorio para criar commits.
goto :erro_final

:url_vazia
echo [ERRO] Nenhuma URL informada.
goto :erro_final

:erro_fetch
echo.
echo [ERRO] Nao foi possivel baixar o historico da branch main do GitHub.
echo Verifique sua internet, autenticacao e a URL do repositorio.
goto :erro_final

:erro_push
echo.
echo [ERRO] O GitHub recusou o envio mesmo apos a nova sincronizacao.
echo Se o Git pedir autenticacao, conclua o login no navegador.
echo Em HTTPS, o Git Credential Manager normalmente abre o login.
goto :erro_final

:erro
echo.
echo [ERRO] Um comando Git falhou. Veja a mensagem acima.

:erro_final
echo.
echo ============================================================
echo [ERRO] O envio nao foi concluido.
echo ============================================================
echo.
pause
exit /b 1
