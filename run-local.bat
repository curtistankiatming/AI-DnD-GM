@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "saves" mkdir "saves"
if "%PORT%"=="" set "PORT=4173"
set "HOST=127.0.0.1"

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
if %NODE_MAJOR% LSS 22 (
  echo Node.js 22 or newer is required. Detected:
  node -v
  pause
  exit /b 1
)

echo Starting AI Dungeon Master V4 at http://localhost:%PORT%
echo Press Ctrl+C in this window to stop the server.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:%PORT%'"
node server.js

if errorlevel 1 (
  echo.
  echo The server stopped with an error.
  pause
)
