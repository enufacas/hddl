# Run coverage
param([switch]$SkipOpen, [switch]$Verbose)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $PSCommandPath))
Write-Host "`n=== Coverage Report Generator ===`n" -ForegroundColor Yellow
if (Test-Path .nyc_output) { Remove-Item -Recurse -Force .nyc_output }
if (Test-Path coverage) { Remove-Item -Recurse -Force coverage }
Write-Host "[Step] Starting dev server..." -ForegroundColor Cyan
$env:VITE_COVERAGE = 'true'
$job = Start-Job -ScriptBlock {
    param($p)
    Set-Location $p
    $env:VITE_COVERAGE = 'true'
    npm run dev 2>&1
} -ArgumentList $PWD
Write-Host "[Step] Waiting for server..." -ForegroundColor Cyan
for ($i=1; $i -le 30; $i++) {
    Start-Sleep 1
    $out = Receive-Job $job 2>&1 | Out-String
    if ($out -match "ready in") {
        Write-Host "[OK] Server ready" -ForegroundColor Green
        break
    }
    if ($job.State -eq "Failed") { Write-Host "[ERROR] Server failed" -ForegroundColor Red; exit 1 }
}
try {
    Write-Host "[Step] Running tests..." -ForegroundColor Cyan
    $testOut = npx playwright test --reporter=line 2>&1
    if ($testOut -match "(\d+) passed") { Write-Host "[OK] $($matches[1]) passed" -ForegroundColor Green }
    Write-Host "[Step] Checking coverage data..." -ForegroundColor Cyan
    if (-not (Test-Path .nyc_output)) { Write-Host "[ERROR] No coverage data" -ForegroundColor Red; exit 1 }
    Write-Host "[Step] Generating report..." -ForegroundColor Cyan
    npx nyc report --reporter=html --reporter=text | Out-Null
    Write-Host "[OK] Report generated" -ForegroundColor Green
    if (-not $SkipOpen) { Start-Process (Resolve-Path coverage/index.html) }
    Write-Host "`nComplete! See coverage/index.html`n" -ForegroundColor Green
} finally {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
}
