$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $root ".venv\Scripts\python.exe"

Set-Location $root

if (-not (Test-Path -LiteralPath "frontend\node_modules")) {
  npm install --prefix frontend
}

if (-not (Test-Path -LiteralPath $venvPython)) {
  python -m venv .venv
}

& $venvPython -m pip install -r backend\requirements.txt

$backend = Start-Job -Name purchase-larp-backend -ScriptBlock {
  param($root, $venvPython)
  $ErrorActionPreference = "Continue"
  Set-Location $root
  & $venvPython -m uvicorn backend.app:app --host 127.0.0.1 --port 8787
} -ArgumentList $root, $venvPython

$frontend = Start-Job -Name purchase-larp-frontend -ScriptBlock {
  param($root)
  $ErrorActionPreference = "Continue"
  Set-Location (Join-Path $root "frontend")
  npm run dev
} -ArgumentList $root

Write-Host ""
Write-Host "Backend:  http://localhost:8787"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Press Ctrl+C to stop both services."
Write-Host ""

try {
  while ($true) {
    Receive-Job -Job $backend, $frontend -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}
finally {
  Stop-Job -Job $backend, $frontend -ErrorAction SilentlyContinue
  Remove-Job -Job $backend, $frontend -Force -ErrorAction SilentlyContinue
}
