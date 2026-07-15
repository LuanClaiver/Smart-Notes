@echo off

start cmd /k "cd /d C:\Temp\BRINCANDO-VS-CODE\Notas-web\backend && node server.js"

start cmd /k "cd /d C:\Temp\BRINCANDO-VS-CODE\Notas-web\frontend && npm run dev"

timeout /t 5 > nul

start http://localhost:5173