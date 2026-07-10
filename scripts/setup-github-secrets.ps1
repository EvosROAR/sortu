# Setup GitHub Actions secrets untuk auto-deploy Sortu web
# Jalankan sekali dari folder sortu:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-github-secrets.ps1

$ErrorActionPreference = 'Stop'
$repo = 'EvosROAR/sortu'
$envFile = (Join-Path (Join-Path $PSScriptRoot '..') '.env') | Resolve-Path

if (-not (Test-Path $envFile)) {
  Write-Error "File .env tidak ditemukan. Copy dari .env.example dulu."
}

Write-Host "Mengunggah EXPO_PUBLIC_* ke GitHub secrets ($repo)..."

Get-Content $envFile | Where-Object {
  $_ -match '^\s*EXPO_PUBLIC_' -and $_ -notmatch '^\s*#'
} | ForEach-Object {
  $parts = $_ -split '=', 2
  if ($parts.Length -ne 2) { return }
  $name = $parts[0].Trim()
  $value = $parts[1].Trim()
  if (-not $value) {
    Write-Warning "Lewati $name (kosong)"
    return
  }
  gh secret set $name --body $value --repo $repo | Out-Null
  Write-Host "  OK $name"
}

if (-not (gh secret list --repo $repo | Select-String 'FIREBASE_TOKEN')) {
  Write-Host ""
  Write-Host "FIREBASE_TOKEN belum ada. Jalankan perintah ini (buka link di browser):"
  Write-Host "  firebase login:ci"
  Write-Host ""
  Write-Host "Lalu set token:"
  Write-Host '  gh secret set FIREBASE_TOKEN --body "PASTE_TOKEN_DI_SINI" --repo EvosROAR/sortu'
  Write-Host ""
} else {
  Write-Host "  OK FIREBASE_TOKEN (sudah ada)"
}

Write-Host ""
Write-Host "Selesai. Cek: gh secret list --repo $repo"
Write-Host "Trigger deploy: gh workflow run deploy-web.yml --repo $repo"
