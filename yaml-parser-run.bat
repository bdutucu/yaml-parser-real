@echo off
cd /d "%~dp0backend"
start cmd /k "python app.py"
cd /d "%~dp0frontend"
start cmd /k "npm run dev"
echo you can close this window.
pause