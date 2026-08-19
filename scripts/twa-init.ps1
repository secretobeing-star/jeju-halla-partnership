$ErrorActionPreference = "Stop"

$manifestUrl = if ($env:TWA_MANIFEST_URL) { $env:TWA_MANIFEST_URL } else { "https://chu-p.kro.kr/manifest.json" }
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$twaDir = Join-Path $repoRoot "twa"

Write-Host "TWA manifest: $manifestUrl"
Write-Host "Repository: $repoRoot"

bubblewrap --version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Bubblewrap CLI가 없습니다. 먼저 실행하세요: npm install -g @bubblewrap/cli"
  exit 1
}

if (-not (Test-Path $twaDir)) {
  New-Item -ItemType Directory -Path $twaDir -Force | Out-Null
}

Set-Location $twaDir
bubblewrap init --manifest=$manifestUrl
