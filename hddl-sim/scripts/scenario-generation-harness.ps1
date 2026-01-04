param(
  [Parameter(Mandatory = $false)]
  [string]$Name = "generated-harness-" + (Get-Date -Format "yyyyMMdd-HHmmss"),

  [Parameter(Mandatory = $false)]
  [string]$Prompt = "Healthcare triage decisioning for an urgent care network with staffing shortages, escalation boundaries, and policy revisions based on outcomes.",

  [Parameter(Mandatory = $false)]
  [int]$Port = 8080,

  [Parameter(Mandatory = $false)]
  [string]$ContainerName = "narrative-api-test",

  [Parameter(Mandatory = $false)]
  [string]$ImageName = "narrative-api",

  [Parameter(Mandatory = $false)]
  [string]$Project,

  [Parameter(Mandatory = $false)]
  [string]$Location,

  [Parameter(Mandatory = $false)]
  [string]$EnvFile,

  [Parameter(Mandatory = $false)]
  [int]$HealthTimeoutSeconds = 30,

  [switch]$NoBuild,
  [switch]$NoRestart,
  [switch]$SkipAnalyze,
  [switch]$KeepResponse
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-GcloudDefaultProject {
  $cfg = Join-Path $env:APPDATA 'gcloud\configurations\config_default'
  if (!(Test-Path $cfg)) { return $null }

  $lines = Get-Content $cfg
  foreach ($line in $lines) {
    if ($line -match '^project\s*=\s*(.+)\s*$') {
      return $matches[1].Trim()
    }
  }

  return $null
}

function Import-DotEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (!(Test-Path $Path)) { return }

  $lines = Get-Content -LiteralPath $Path
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0) { continue }
    if ($trimmed.StartsWith('#')) { continue }

    if ($trimmed -match '^([^=]+)=(.*)$') {
      $key = $matches[1].Trim()
      $value = $matches[2]

      # Strip optional surrounding quotes
      if ($value -match '^"(.*)"$') { $value = $matches[1] }
      elseif ($value -match "^'(.*)'$") { $value = $matches[1] }

      if ($key.Length -gt 0) {
        [Environment]::SetEnvironmentVariable($key, $value)
      }
    }
  }
}

function Invoke-HealthCheck {
  param(
    [string]$BaseUrl,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-RestMethod -Method Get -Uri ($BaseUrl + '/health')
      if ($resp -and $resp.status -eq 'ok') {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

# Ensure we run from hddl-sim root regardless of where invoked
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$hddlSimRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $hddlSimRoot

# Load .env (if present) so we don't hardcode project/location
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $hddlSimRoot '.env'
}
Import-DotEnv -Path $EnvFile

$baseUrl = "http://localhost:$Port"

if (![string]::IsNullOrWhiteSpace($Project)) {
  $projectId = $Project
} elseif (![string]::IsNullOrWhiteSpace($env:GOOGLE_CLOUD_PROJECT)) {
  $projectId = $env:GOOGLE_CLOUD_PROJECT
} else {
  $projectId = Get-GcloudDefaultProject
}

if (![string]::IsNullOrWhiteSpace($Location)) {
  $locationId = $Location
} elseif (![string]::IsNullOrWhiteSpace($env:GOOGLE_CLOUD_LOCATION)) {
  $locationId = $env:GOOGLE_CLOUD_LOCATION
} else {
  $locationId = 'us-central1'
}

if ([string]::IsNullOrWhiteSpace($projectId)) {
  throw "Missing GCP project. Set -Project, or set GOOGLE_CLOUD_PROJECT, or run 'gcloud config set project <id>' so config_default has a project."
}

Write-Host "=== Scenario Generation Harness ==="
Write-Host "Root: $hddlSimRoot"
Write-Host "Name: $Name"
Write-Host "API:  $baseUrl"
Write-Host "Env:  $EnvFile"
Write-Host "GCP:  $projectId ($locationId)"

if (-not $NoBuild) {
  Write-Host ""
  Write-Host "[1/4] Building Docker image: $ImageName"
  docker build -t $ImageName . | Out-Host
}

if (-not $NoRestart) {
  Write-Host ""
  Write-Host "[2/4] Restarting container: $ContainerName"
  try { docker rm -f $ContainerName | Out-Null } catch { }

  $gcloudMount = "$env:APPDATA\gcloud:/root/.config/gcloud:ro"
  docker run -d -p "$Port`:8080" -v $gcloudMount -e "GOOGLE_CLOUD_PROJECT=$projectId" -e "GOOGLE_CLOUD_LOCATION=$locationId" --name $ContainerName $ImageName | Out-Null
}

Write-Host ""
Write-Host "[3/4] Waiting for /health"
$ok = Invoke-HealthCheck -BaseUrl $baseUrl -TimeoutSeconds $HealthTimeoutSeconds
if (-not $ok) {
  Write-Host "Container logs:" -ForegroundColor Yellow
  docker logs --tail 200 $ContainerName | Out-Host
  throw "API did not become healthy within ${HealthTimeoutSeconds}s at $baseUrl/health"
}

Write-Host ""
Write-Host "[4/4] Generating scenario via /generate-scenario"

$headers = @{ Origin = 'http://localhost:5173' }
$bodyObj = @{ prompt = $Prompt }
$jsonBody = $bodyObj | ConvertTo-Json -Depth 20

$respPath = Join-Path $hddlSimRoot ("temp-${Name}-response.json")
$scenarioPath = Join-Path $hddlSimRoot ("src\sim\scenarios\${Name}.scenario.json")

try {
  $resp = Invoke-RestMethod -Method Post -Uri ($baseUrl + '/generate-scenario') -Headers $headers -ContentType 'application/json' -Body $jsonBody
} catch {
  Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
  }
  throw
}

# Save full response (best-effort)
try {
  $resp | ConvertTo-Json -Depth 50 | Out-File -FilePath $respPath -Encoding utf8
} catch {
  Write-Host "Warning: could not serialize full response JSON (PowerShell depth limit)." -ForegroundColor Yellow
}

# Save scenario JSON without BOM (Node JSON.parse friendly)
$scenarioJson = ($resp.scenario | ConvertTo-Json -Depth 50)
[System.IO.File]::WriteAllText($scenarioPath, $scenarioJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote response: $respPath"
Write-Host "Wrote scenario:  $scenarioPath"

if (-not $SkipAnalyze) {
  $date = Get-Date -Format 'yyyy-MM-dd'
  $reportPath = Join-Path $hddlSimRoot ("analysis\${Name}_Scenario_Analysis_${date}.md")

  "# Generated Scenario Analysis: $Name`n`nDate: $date`n`nScenario file: src/sim/scenarios/${Name}.scenario.json`n" | Out-File -FilePath $reportPath -Encoding utf8
  '```text' | Out-File -FilePath $reportPath -Append -Encoding utf8
  node .\analysis\scenario-analysis.mjs $Name 2>&1 | Out-File -FilePath $reportPath -Append -Encoding utf8
  '```' | Out-File -FilePath $reportPath -Append -Encoding utf8

  Write-Host "Wrote analysis:  $reportPath"
}

if (-not $KeepResponse) {
  try {
    Remove-Item -LiteralPath $respPath -Force
    Write-Host "Deleted temp response: $respPath"
  } catch {
    Write-Host "Warning: could not delete temp response: $respPath" -ForegroundColor Yellow
  }
}
