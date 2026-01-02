# Deploy Narrative Generation API to Google Cloud Run (PowerShell version)
# 
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Google Cloud project configured
#   - Billing enabled
#
# Usage:
#   .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "======================================"
Write-Host "Deploying Narrative API to Cloud Run"
Write-Host "======================================"
Write-Host ""

# Get current project
$PROJECT_ID = gcloud config get-value project 2>$null

if ([string]::IsNullOrEmpty($PROJECT_ID)) {
  Write-Host "❌ Error: No GCP project configured" -ForegroundColor Red
  Write-Host "Run: gcloud config set project YOUR-PROJECT-ID"
  exit 1
}

Write-Host "Project: $PROJECT_ID"
Write-Host "Region: us-central1"
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Deploy to Cloud Run? (y/n)"
if ($confirmation -ne 'y') {
  Write-Host "Deployment cancelled"
  exit 0
}

Write-Host ""
Write-Host "Deploying..."
Write-Host ""

# Change to parent directory (hddl-sim) for deployment
$parentDir = Split-Path -Parent $PSScriptRoot
Write-Host "Deploying from: $parentDir"
Write-Host ""
Push-Location $parentDir

try {
  # Deploy to Cloud Run
  gcloud run deploy narrative-api `
    --source . `
    --region us-central1 `
    --platform managed `
    --allow-unauthenticated `
    --max-instances=2 `
    --concurrency=2 `
    --memory=1Gi `
    --timeout=300s `
    --cpu=1 `
    --min-instances=0 `
    --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GCP_PROJECT=$PROJECT_ID"

  # Get the service URL
  $SERVICE_URL = gcloud run services describe narrative-api `
    --region us-central1 `
    --format 'value(status.url)' 2>$null
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "======================================"
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "======================================"
Write-Host ""
Write-Host "API URL: $SERVICE_URL"
Write-Host ""
Write-Host "Test endpoints:"
Write-Host "  Health: curl $SERVICE_URL/health"
Write-Host "  Scenarios: curl $SERVICE_URL/scenarios"
Write-Host ""
Write-Host "Generate narrative:"
Write-Host "  curl -X POST $SERVICE_URL/generate \"
Write-Host "    -H 'Content-Type: application/json' \"
Write-Host "    -d '{`"scenario`":`"insurance-underwriting`"}'"
Write-Host ""
Write-Host "Generate scenario:"
Write-Host "  curl -X POST $SERVICE_URL/generate-scenario \"
Write-Host "    -H 'Content-Type: application/json' \"
Write-Host "    -d '{`"prompt`":`"Insurance agent learning bundle discount approval`",`"domain`":`"insurance`"}'"
Write-Host ""
Write-Host "Abuse protection:"
Write-Host "  - 20 requests per hour per IP (application-level)"
Write-Host "  - 1MB request size limit"
Write-Host "  - 120s timeout for scenario generation"
Write-Host "  - Input sanitization (path traversal, injection)"
Write-Host ""
Write-Host "Cost protection:"
Write-Host "  - 2 max instances (cost ceiling: ~`$46/month)"
Write-Host "  - 2 concurrent requests per instance"
Write-Host "  - Scales to zero when idle"
Write-Host ""
