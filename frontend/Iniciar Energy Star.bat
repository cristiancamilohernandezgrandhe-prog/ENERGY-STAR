@echo off
setlocal

set "FRONTEND_DIR=%~dp0"
set "BACKEND_DIR=%~dp0..\backend"

start "Energy Star - Backend" /D "%BACKEND_DIR%" cmd /k node src\server.js
start "Energy Star - Frontend" /D "%FRONTEND_DIR%" cmd /k npm run dev -- --host localhost

endlocal
