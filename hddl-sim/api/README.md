# Cloud Run Deployment - Implementation Summary

## ✅ What Was Implemented

### 1. Rate Limiting Protection
- **Package added:** `express-rate-limit@7.5.0`
- **Configuration:** 20 requests/hour per IP per instance
- **Effective limit:** 20-40 requests/hour (typical: 20)
- **Prevents:** Script abuse while allowing legitimate demo usage

### 2. Deployment Scripts
- **Bash script:** `scripts/deploy.sh` (macOS/Linux/WSL)
- **PowerShell script:** `scripts/deploy.ps1` (Windows)
- Both scripts handle deployment with proper Cloud Run configuration

### 3. Cloud Run Configuration
```bash
--max-instances=2        # Cost ceiling: ~$46/month
--concurrency=2          # 4 concurrent requests total
--memory=1Gi            # Enough for Vertex AI
--timeout=300s          # 5 minute max per request
--min-instances=0       # Scale to zero when idle
```

### 4. Comprehensive Documentation
- **File:** `docs/DEPLOY_API.md`
- **Covers:** Prerequisites, deployment, testing, monitoring, troubleshooting
- **Includes:** Cost projections, security considerations, rate limit details

---

## Protection Layers (Defense in Depth)

1. **Origin Validation:** Only GitHub Pages can access API (stops direct access)
2. **Rate Limiter:** 20/hour per IP (stops abusive users)
3. **Max Instances:** 2 instances max (cost ceiling)
4. **Vertex AI Quota:** 15 RPM project-wide (Google's safety net)
5. **Budget Alerts:** Email warnings (manual monitoring)

---

## Cost Projections

### Expected Scenarios
| Scenario | Users | Narratives | Cost |
|----------|-------|------------|------|
| Light interest | 30 | 50 total | $0.55 |
| Good engagement | 100 | 300 total | $3.30 |
| High interest | 200 | 800 total | $8.80 |
| High traffic | 500 | 2000 total | $22 |

### Absolute Worst Case
- Someone runs 24/7 automated abuse
- 2 instances × 40 req/hr × 720 hours = 57,600 requests
- Cost: ~$633 (but you'd notice within hours and shut it down)

### Realistic Worst Case
- Actual abuse runs for 2-3 hours before you notice
- Cost impact: ~$3-5

---

## Next Steps to Deploy

### 1. Install gcloud CLI (if not already installed)
**Windows:** https://cloud.google.com/sdk/docs/install  
**Verify:** `gcloud --version`

### 2. Configure GCP
```bash
# Set your project
gcloud config set project YOUR-PROJECT-ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

### 3. Set Budget Alert (Important!)
```bash
gcloud billing budgets create \
  --billing-account=YOUR-BILLING-ACCOUNT-ID \
  --display-name="HDDL API Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

Or via: https://console.cloud.google.com/billing/budgets

### 4. Deploy
```bash
cd hddl-sim/api
.\deploy.ps1    # Windows PowerShell
# OR
./deploy.sh     # macOS/Linux/WSL
```

**First deployment:** 3-5 minutes  
**Subsequent deployments:** 1-2 minutes

### 5. Test
```bash
# Get your URL from deploy output, then test:
curl https://YOUR-API-URL/health
curl https://YOUR-API-URL/scenarios
```

### 6. Monitor Usage
- ✅ Configure frontend to use API URL
- ✅ Test narrative generation
- ✅ Monitor costs for first few days
- ✅ Adjust limits if needed

---

## Files Changed/Created

### Modified Files
- `hddl-sim/package.json` - Added express-rate-limit dependency
- `hddl-sim/api/server.mjs` - Added rate limiting middleware

### New Files
- `hddl-sim/api/deploy.sh` - Bash deployment script
- `hddl-sim/api/deploy.ps1` - PowerShell deployment script
- `hddl-sim/api/GUIDE.md` - Complete deployment guide
- `hddl-sim/api/README.md` - Deployment quick start

---

## Monitoring After Deployment

### Check Logs
```bash
gcloud run services logs read narrative-api --region us-central1 --limit 50
```

### Check Costs (Daily)
https://console.cloud.google.com/billing/reports

### Rate Limit Telemetry
Rate limit headers in every response:
```
RateLimit-Limit: 20
RateLimit-Remaining: 15
RateLimit-Reset: <unix-timestamp>
```

---

## If You Need to Adjust

### Tighten Limits (More Conservative)
```bash
gcloud run services update narrative-api \
  --region us-central1 \
  --max-instances=1
```

Then update rate limit in code:
```javascript
max: 10  // Instead of 20
```

### Loosen Limits (If Safe)
```bash
gcloud run services update narrative-api \
  --region us-central1 \
  --max-instances=3
```

---

## Quick Reference

**Deploy:** `cd hddl-sim/api && .\deploy.ps1`  
**Logs:** `gcloud run services logs read narrative-api --region us-central1`  
**Delete:** `gcloud run services delete narrative-api --region us-central1`  
**Costs:** https://console.cloud.google.com/billing/reports  
**Full Guide:** `api/GUIDE.md`

---

## Ready to Deploy?

All code is committed and ready. Just need to:
1. ✅ Install gcloud CLI (if needed)
2. ✅ Set up GCP project
3. ✅ Run deployment script
4. ✅ Test the API
5. ✅ Configure frontend with API URL
