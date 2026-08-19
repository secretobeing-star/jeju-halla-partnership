@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo  Supabase 연결 설정 (Failed to fetch 해결)
echo ========================================
echo.
echo Supabase 대시보드 - Project Settings - API
echo   1) Project URL
echo   2) anon public key
echo.

set /p SUPABASE_URL="Project URL 입력: "
set /p SUPABASE_KEY="anon public key 입력: "

if "%SUPABASE_URL%"=="" goto empty
if "%SUPABASE_KEY%"=="" goto empty

(
  echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
  echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_KEY%
) > .env.local

echo.
echo [OK] .env.local 저장됨 (로컬 개발용)
echo.
echo --- Vercel 환경 변수 (아래를 cmd에 하나씩 실행) ---
echo.
echo echo %SUPABASE_URL%^| npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo echo %SUPABASE_KEY%^| npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo.
echo 또는 vercel.com - jeju-halla-partnership - Settings - Environment Variables
echo 에서 위 두 이름으로 등록 (Production 체크)
echo.
echo --- 재배포 ---
echo npx vercel --prod
echo.
echo --- 확인 ---
echo https://jeju-halla-partnership.vercel.app/api/config-check
echo   supabaseConfigured: true 이면 성공
echo.
pause
exit /b 0

:empty
echo 값이 비어 있습니다.
pause
exit /b 1
