@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. No model was contacted.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"
if errorlevel 1 (
  echo Please use Node.js 22 or newer. No model was contacted.
  pause
  exit /b 1
)
node scripts/model-eval/cli.js --interactive
set "RESULT=%ERRORLEVEL%"
echo.
echo Reports, when created, are in the evaluation-results folder.
pause
exit /b %RESULT%
