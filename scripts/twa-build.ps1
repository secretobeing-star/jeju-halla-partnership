$ErrorActionPreference = "Stop"

$twaDir = Join-Path $PSScriptRoot ".." "twa" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $twaDir) {
  Write-Host "twa/ 폴더가 없습니다. 먼저 npm run twa:init 을 실행하세요."
  exit 1
}
$twaDir = $twaDir.Path

bubblewrap --version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Bubblewrap CLI가 없습니다. 먼저 실행하세요: npm install -g @bubblewrap/cli"
  exit 1
}

Push-Location $twaDir
try {
  bubblewrap build
  Write-Host ""
  Write-Host "완료. AAB 파일을 twa/ 폴더에서 확인한 뒤 Play Console 내부 테스트에 업로드하세요."
} finally {
  Pop-Location
}
