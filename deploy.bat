@echo off
chcp 65001 > nul
echo =======================================
echo [jeju-halla-partnership] 자동 배포 시작
echo =======================================

cd /d "C:\Users\주호\jeju-halla-partnership"

echo [1/3] 변경 사항 추가 중 (git add)...
git add .

set /p msg="커밋 메시지를 입력하세요 (엔터 치면 기본 'update: deploy' 적용): "
if "%msg%"=="" set msg=update: deploy

echo [2/3] 커밋 중 (git commit)...
git commit -m "%msg%"

echo [3/3] GitHub 푸시 중 (git push)...
git push origin main

echo =======================================
echo 배포 푸시 완료! 창을 닫으려면 아무 키나 누르세요.
echo =======================================
pause