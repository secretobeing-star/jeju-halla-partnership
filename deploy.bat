@echo off
cd /d "%~dp0"
echo === npm install ===
call npm install
if errorlevel 1 exit /b 1
echo.
echo === npm run build ===
call npm run build
if errorlevel 1 exit /b 1
echo.
echo === Vercel deploy ===
call npx vercel --prod
pause
