@echo off
chcp 65001 >nul
cd /d "C:\Users\주호\jeju-halla-partnership"

echo.
echo === jeju-halla-partnership 재배포 ===
echo 폴더: %CD%
echo.

call npm run build
if errorlevel 1 (
  echo 빌드 실패. 위 오류를 확인하세요.
  pause
  exit /b 1
)

call npx vercel --prod --yes
echo.
echo 완료 후 관리자에서 "UI v5" 문구가 보이면 최신 버전입니다.
echo https://jeju-halla-partnership.vercel.app/admin
echo.
pause
