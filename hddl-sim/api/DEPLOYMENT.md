# Deployment Checklist

## Pre-Deployment

- [ ] GCP project configured
- [ ] Billing enabled on GCP project
- [ ] `gcloud` CLI installed and authenticated
- [ ] Docker installed (for local testing)
- [ ] Google Cloud credentials mounted for Vertex AI access

## Security Verification

- [ ] Origin validation enabled in `api/server.mjs`
- [ ] Rate limiting configured (20 req/hour)
- [ ] Input validation added to both endpoints
- [ ] Timeout protection (120s) implemented
- [ ] Request size limit set (1MB)
- [ ] Domain whitelist validated

## Local Testing

### Prerequisites
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set your GCP project: `gcloud config set project YOUR-PROJECT-ID`
4. Enable Vertex AI API: `gcloud services enable aiplatform.googleapis.com`
5. **Create `.env` file:**
   ```bash
   cd hddl-sim
   cp .env.example .env
   # Edit .env and set GOOGLE_CLOUD_PROJECT=your-actual-project-id
   ```

### Test with Docker (Recommended)
```bash
cd hddl-sim

# Load environment variables from .env file
source .env  # Linux/Mac
# OR for PowerShell:
Get-Content .env | ForEach-Object { if ($_ -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }

docker build -t narrative-api .

# Run with env vars from .env
docker run -d -p 8080:8080 \
  -v "$env:APPDATA\gcloud:/root/.config/gcloud:ro" \
  -e GOOGLE_CLOUD_PROJECT=$env:GOOGLE_CLOUD_PROJECT \
  -e GOOGLE_CLOUD_LOCATION=us-central1 \
  --name narrative-api-test \
  narrative-api
```

### Scenario Generation Harness (Recommended)

For a repeatable local loop that:
- rebuilds/restarts the Docker API,
- calls `POST /generate-scenario`, and
- runs `analysis/scenario-analysis.mjs` while capturing artifacts,

use:

```powershell
.\scripts\scenario-generation-harness.ps1
```

Docs: `hddl-sim/docs/Scenario_Generation_Test_Harness.md`

Visit: `http://localhost:8080/health`

Test rate limiting:
```bash
# Run 21 requests to trigger rate limit
for i in {1..21}; do
  curl -X POST http://localhost:8080/generate-scenario \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}'
  echo "\n---"
done
```

### Note on Local Development

```bash
# Build image
docker build -t narrative-api .

# Load .env file into shell
Get-Content .env | ForEach-Object { 
  if ($_ -match '^([^=]+)=(.*)$') { 
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) 
  } 
}

# Run locally
docker run -p 8080:8080 \
  -v "$env:APPDATA\gcloud:/root/.config/gcloud:ro" \
  -e GOOGLE_CLOUD_PROJECT=$env:GOOGLE_CLOUD_PROJECT \
  narrative-api

# Test
curl http://localhost:8080/health
curl http://localhost:8080/scenarios
```

## Deploy to Cloud Run

```powershell
cd api
.\deploy.ps1
```

Follow prompts and confirm deployment.

## Post-Deployment Validation

### 1. Health Check
```bash
curl https://YOUR-API-URL/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### 2. Scenarios List
```bash
curl https://YOUR-API-URL/scenarios
```
Expected: List of available scenarios

### 3. Narrative Generation (Rate Limited)
```bash
curl -X POST https://YOUR-API-URL/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://enufacas.github.io" \
  -d '{"scenario":"insurance-underwriting"}'
```
Expected: Narrative markdown with citations

### 4. Scenario Generation (Rate Limited)
```bash
curl -X POST https://YOUR-API-URL/generate-scenario \
  -H "Content-Type: application/json" \
  -H "Origin: https://enufacas.github.io" \
  -d '{"prompt":"Insurance agent learning fraud detection","domain":"insurance"}'
```
Expected: Complete scenario JSON with metadata

### 5. Origin Validation Test
```bash
# Should be blocked (no origin header)
curl -X POST https://YOUR-API-URL/generate \
  -H "Content-Type: application/json" \
  -d '{"scenario":"insurance-underwriting"}'
```
Expected: `403 Forbidden - Access denied: No origin header`

### 6. Rate Limit Test
```bash
# Run 21 requests rapidly
for i in {1..21}; do
  curl -X POST https://YOUR-API-URL/generate-scenario \
    -H "Content-Type: application/json" \
    -H "Origin: https://enufacas.github.io" \
    -d '{"prompt":"test '$i'","domain":"insurance"}'
  sleep 1
done
```
Expected: Request 21 returns `429 Too Many Requests`

### 7. Input Validation Tests

**Path traversal attempt:**
```bash
curl -X POST https://YOUR-API-URL/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://enufacas.github.io" \
  -d '{"scenario":"../../etc/passwd"}'
```
Expected: `400 Bad Request - Invalid characters in scenario name`

**Oversized prompt:**
```bash
curl -X POST https://YOUR-API-URL/generate-scenario \
  -H "Content-Type: application/json" \
  -H "Origin: https://enufacas.github.io" \
  -d "{\"prompt\":\"$(python -c 'print("A"*1001)')\"}"
```
Expected: `400 Bad Request - Prompt too long`

## Monitoring

### Cloud Run Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=narrative-api" --limit 50
```

### Cost Monitoring
- Visit: https://console.cloud.google.com/billing
- Check: Cloud Run charges (~$46/month max)
- Check: Vertex AI API charges (per-request)

### Metrics Dashboard
- Visit: https://console.cloud.google.com/run
- Select: `narrative-api` service
- View: Request count, latency, error rate

## Rollback Plan

If issues arise:

1. **Immediate rollback:**
   ```bash
   gcloud run services update narrative-api \
     --region us-central1 \
     --revision <PREVIOUS-REVISION-ID>
   ```

2. **Emergency shutdown:**
   ```bash
   gcloud run services update narrative-api \
     --region us-central1 \
     --max-instances 0
   ```

3. **Full revert:**
   ```bash
   git revert HEAD
   .\api\deploy.ps1
   ```

## Update GitHub Pages

Update the frontend to use the new API URL:

1. Edit `hddl-sim/src/config.js` (if exists) or relevant component
2. Replace API URL with Cloud Run service URL
3. Test locally with `npm run dev`
4. Deploy to GitHub Pages: `git push`

## Documentation

- [ ] Update README with API URL
- [ ] Document rate limits in user-facing docs
- [ ] Add SECURITY.md to repository root (link to api/SECURITY.md)
- [ ] Update API documentation with new endpoints

## Success Criteria

✅ All validation tests pass
✅ Rate limiting works as expected
✅ Origin validation blocks unauthorized access
✅ Timeout protection prevents runaway requests
✅ Input sanitization blocks malicious input
✅ Cost ceiling enforced (2 max instances)
✅ Monitoring/logging functional
✅ Frontend successfully calls API

## Troubleshooting

### "GoogleAuthError: Unable to authenticate"
- Check gcloud credentials: `gcloud auth list`
- Re-authenticate: `gcloud auth login`
- Verify volume mount in docker run command

### "Rate limit reached" errors in logs
- Expected! This means rate limiting is working
- Check if legitimate user is hitting limit (20 req/hour is generous)

### "Generation timeout" errors
- Prompt may be too complex
- Check Vertex AI quotas
- Consider increasing timeout (but adds cost risk)

### High costs
- Check rate limiting is working
- Review Cloud Run logs for unusual traffic
- Consider lowering max-instances if needed
