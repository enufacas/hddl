# Troubleshooting the Monitor Server

## Issue: Server won't start

**Symptom**: `Error: Cannot find module 'express'`

**Fix**:
```bash
cd .vscode/scripts
npm install express
```

## Issue: "Permission denied" when fetching logs

**Symptom**: `curl http://localhost:3030/api/logs` returns 500 error with gcloud permission error

**Cause**: Current user lacks Cloud Logging read permissions

**Fix**:
```bash
# Check current authenticated user
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Verify permissions
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

Ensure your account has `roles/logging.viewer` or similar role.

## Issue: Server shows logs but they're outdated

**Symptom**: Dashboard shows old logs, not recent activity

**Cause**: Cloud Logging has ingestion delay (usually <1 minute)

**Solution**: Wait 1-2 minutes after API activity, then refresh

## Issue: Port 3030 already in use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3030`

**Fix**:
```bash
# Find process using port 3030 (Windows)
netstat -ano | findstr :3030

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in api-monitor-server.mjs
```

## Issue: Empty or incomplete log results

**Symptom**: API returns `{"requests": [], "summary": {}}`

**Possible causes**:
1. **No recent API activity** - Generate some scenarios to create logs
2. **Wrong GCP project** - Check `gcloud config get-value project`
3. **Service name mismatch** - Verify Cloud Run service is named `narrative-api`
4. **Time range issue** - Logs older than filter window (default is recent logs)

**Fix**:
```bash
# Verify service exists and has recent logs
gcloud run services describe narrative-api --region=us-central1

# Check Cloud Logging directly
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=narrative-api" --limit 10
```

## Issue: High latency when fetching logs

**Symptom**: `curl http://localhost:3030/api/logs/500` takes >10 seconds

**Cause**: Cloud Logging API can be slow for large queries

**Solutions**:
1. **Reduce log limit**: Fetch fewer logs (e.g., 100 instead of 500)
2. **Use caching**: Server may implement caching; wait a few seconds and retry
3. **Check network**: Slow internet connection to GCP

```bash
# Fetch fewer logs for faster response
curl http://localhost:3030/api/logs/100
```
