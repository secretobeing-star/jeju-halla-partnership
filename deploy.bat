@echo off
chcp 65001 > nul
echo =======================================
echo [jeju-halla-partnership] 자동 배포 시작
echo =======================================

cd /d "C:\Users\주호\jeju-halla-partnership"

echo [1/4] 변경 사항 추가 중 (git add)...
git add .

set /p msg="커밋 메시지를 입력하세요 (엔터 치면 기본 'update: deploy' 적용): "
if "%msg%"=="" set msg=update: deploy

echo [2/4] 커밋 중 (git commit)...
git commit -m "%msg%"

echo [3/4] GitHub 푸시 중 (git push)...
git push origin main

echo [4/4] Vercel 배포 (joho3 / halla-benefit, edsf4444)...
call npx vercel deploy --prod --force --yes --scope joho3 --project halla-benefit

echo =======================================
echo 배포 완료: https://chu-c.kro.kr
echo =======================================
pause