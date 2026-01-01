# Deploying Narrative API to Cloud Run

This guide walks through deploying the HDDL Narrative Generation API to Google Cloud Run.

## Overview

**What you're deploying:**
- REST API for generating HDDL narratives from scenario JSON
- Powered by Vertex AI (Gemini Flash model)
- Rate-limited to prevent abuse (20 requests/hour per user)
- Auto-scales from 0 to 2 instances based on traffic

**Expected costs:**
- **Light usage** (10-50 users): $2-10 total over trial period
- **Moderate usage** (100+ users): $10-30/month
- **Cost ceiling**: ~$46/month maximum (with 2 instance limit)

---

## Prerequisites

### 1. Google Cloud Account Setup

1. **Create/Select a GCP Project:**
   ```bash
   gcloud projects create my-hddl-project --name="HDDL Demo"
   gcloud config set project my-hddl-project
   ```

2. **Enable Billing:**
   - Go to [GCP Console → Billing](https://console.cloud.google.com/billing)
   - Link your project to a billing account (free trial credits apply)

3. **Enable Required APIs:**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   ```

### 2. Install gcloud CLI

**Windows:**
- Download: https://cloud.google.com/sdk/docs/install
- Run installer, follow prompts

**macOS/Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Authenticate:**
```bash
gcloud auth login
gcloud auth application-default login
```

### 3. Set Budget Alerts (Recommended)

Protect your free trial credits:

```bash
# Get your billing account ID
gcloud billing accounts list

# Create $50/month budget with alerts
gcloud billing budgets create \
  --billing-account=YOUR-BILLING-ACCOUNT-ID \
  --display-name="HDDL API Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

Or via [GCP Console → Billing → Budgets & Alerts](https://console.cloud.google.com/billing/budgets).

---

## Deployment

### Quick Deploy

**From `hddl-sim/` directory:**

```bash
# Bash (macOS/Linux/WSL)
./scripts/deploy.sh

# PowerShell (Windows)
.\scripts\deploy.ps1
```

**What happens:**
1. Confirms your GCP project
2. Asks for confirmation
3. Builds Docker container from source
4. Deploys to Cloud Run with rate limiting configured
5. Returns your API URL

**First deployment takes 3-5 minutes** (Docker build + Cloud Run provisioning).

### Manual Deploy

If you need more control:

```bash
cd hddl-sim

gcloud run deploy narrative-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances=2 \
  --concurrency=2 \
  --memory=1Gi \
  --timeout=300s \
  --cpu=1 \
  --min-instances=0 \
  --set-env-vars GCP_PROJECT=$(gcloud config get-value project)
```

---

## Configuration Details

### Rate Limiting

**Built into the API:**
- 20 requests per hour per IP address
- Applies per Cloud Run instance
- Effective limit: 20-40 requests/hour (typical: 20)

**Why this is safe:**
- Legitimate users: Can generate 20 narratives/hour (plenty for demos)
- Script abuse: Limited to 40/hour max (~$0.44/hour vs $40/hour without limits)
- Cost protection: Prevents runaway charges

### Cloud Run Limits

**Cost ceiling configuration:**
```bash
--max-instances=2        # Maximum 2 instances (caps monthly cost at ~$46)
--concurrency=2          # 2 requests per instance (4 total concurrent)
--min-instances=0        # Scale to zero when idle (saves money)
--memory=1Gi             # Enough for Vertex AI calls
--timeout=300s           # 5 minute max (narratives take 10-30 seconds)
```

**What this means:**
- API can handle 4 concurrent narrative generations
- Scales to 0 when idle (no cost when not in use)
- Automatically scales up when traffic arrives
- Hard limit at 2 instances (prevents surprise costs)

---

## Testing Your Deployment

### Health Check
```bash
curl https://YOUR-API-URL/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

### List Available Scenarios
```bash
curl https://YOUR-API-URL/scenarios
```

### Generate a Narrative

**Basic request:**
```bash
curl -X POST https://YOUR-API-URL/generate \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"insurance-underwriting"}'
```

**With user context:**
```bash
curl -X POST https://YOUR-API-URL/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "scenario": "insurance-underwriting",
    "fullContext": true,
    "userAddendum": "Focus on how AI learns from human decisions"
  }'
```

**Expected response:**
```json
{
  "narrative": "In an insurance office...",
  "citations": [...],
  "metadata": {
    "modelUsed": "gemini-1.5-flash-002",
    "cost": 0.0034,
    "duration": 2847
  }
}
```

---

## Monitoring & Costs

### View Real-Time Logs

```bash
gcloud run services logs read narrative-api \
  --region us-central1 \
  --limit 50
```

### Check Current Costs

**Via gcloud:**
```bash
gcloud billing projects describe $(gcloud config get-value project)
```

**Via Console:**
- [GCP Console → Billing → Reports](https://console.cloud.google.com/billing/reports)
- Filter by service: "Cloud Run" and "Vertex AI"

### Expected Cost Breakdown

**Per narrative generation:**
- Cloud Run compute: ~$0.008 (30 seconds)
- Vertex AI (Gemini Flash): ~$0.003 (4K input + 8K output)
- **Total per narrative: ~$0.011**

**Monthly scenarios:**
- 50 narratives: ~$0.55
- 500 narratives: ~$5.50
- 5,000 narratives: ~$55

---

## Usage Limits & Protection

### Rate Limit Response

When a user hits the rate limit:

```json
{
  "error": "Rate limit reached",
  "limit": "20 narratives per hour",
  "note": "This is a demo API for HDDL narrative generation.",
  "retryAfter": 3600
}
```

**HTTP Headers (standard rate limit format):**
```
RateLimit-Limit: 20
RateLimit-Remaining: 15
RateLimit-Reset: 1735740000
```

### Protection Layers

1. **Origin validation:** Only requests from enufacas.github.io allowed (stops direct API access)
2. **In-app rate limiting:** 20 requests/hour per IP per instance
3. **Cloud Run max-instances:** 2 instances maximum (caps cost)
4. **Vertex AI quotas:** 15 RPM project-wide (Google's safety net)
5. **Budget alerts:** Email warnings at 50%, 90%, 100% of budget

---

## Updating the API

### Redeploy After Code Changes

```bash
cd hddl-sim
./scripts/deploy.sh
```

**Cloud Run automatically:**
- Builds new container
- Deploys with zero downtime
- Routes traffic to new version
- Keeps old version for rollback (for 1 hour)

### Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service narrative-api --region us-central1

# Rollback
gcloud run services update-traffic narrative-api \
  --region us-central1 \
  --to-revisions=narrative-api-00042-abc=100
```

---

## Troubleshooting

### "Service [narrative-api] not found"

Check region and project:
```bash
gcloud config get-value project
gcloud run services list --region us-central1
```

### "Error: quota exceeded"

Vertex AI hit project-wide limits (15 RPM). Wait 1 minute and retry.

### "503 Service Unavailable"

Cold start (first request after idle). Takes 2-4 seconds. Retry immediately.

### High costs

Check instance count and logs:
```bash
# View active instances
gcloud run services describe narrative-api \
  --region us-central1 \
  --format 'value(status.conditions)'

# Check request volume
gcloud run services logs read narrative-api \
  --region us-central1 \
  --limit 100
```

If costs are high, reduce max-instances:
```bash
gcloud run services update narrative-api \
  --region us-central1 \
  --max-instances=1
```

---

## Shutdown / Cleanup

### Delete the Service

```bash
gcloud run services delete narrative-api --region us-central1
```

### Delete the Project (Complete Cleanup)

```bash
gcloud projects delete $(gcloud config get-value project)
```

**Warning:** This deletes everything in the project (all resources, data, settings).

---

## Security Considerations

### Authentication Options

**Current setup:** `--allow-unauthenticated` (anyone can use)

**For restricted access:**
```bash
gcloud run services update narrative-api \
  --region us-central1 \
  --no-allow-unauthenticated
```

Then require Cloud IAM authentication or API keys.

### API Keys (Future Enhancement)

To track users or add paid tiers, implement API key middleware:

```javascript
// api/server.mjs
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  // Validate key against database/store
  if (!validKey(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

app.post('/generate', requireApiKey, limiter, handler);
```

---

## Next Steps

**For deployment:**
1. ✅ Deploy with above instructions
2. ✅ Test with a few narratives
3. ✅ Set up budget alerts
4. ✅ Configure frontend to use API URL
5. ✅ Monitor costs for first week

**For production use:**
- Add Redis for coordinated rate limiting
- Implement API key system
- Set up API Gateway
- Add analytics/monitoring
- Consider paid tiers

---

## Support

**Issues with deployment?**
- [Cloud Run documentation](https://cloud.google.com/run/docs)
- [Vertex AI quotas](https://cloud.google.com/vertex-ai/docs/quotas)
- Check `gcloud run services logs` for errors

**Questions about HDDL?**
- See [main README](../README.md)
- Review [Implementers Guide](../../docs/spec/Implementers_Guide.md)
