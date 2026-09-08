@echo off
setlocal
cd /d "%~dp0"
echo WARNING: Trusted LAN only. This game has no authentication.
echo Do not publish its address, expose it through a tunnel, or forward the port.
pause
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required.
  pause
  exit /b 1
)
if "%PORT%"=="" set "PORT=4173"
set "HOST=0.0.0.0"
echo Starting Briarwatch V4 on trusted LAN port %PORT%.
node server.js
pause
