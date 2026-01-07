---
name: api-monitor
description: Monitor and analyze narrative API logs from Google Cloud Run. Use when (1) Investigating Cloud Run API errors or failures, (2) Analyzing API usage costs and optimizing spend, (3) Measuring scenario generation performance (duration, citations), (4) Reviewing custom scenario generation requests, (5) Understanding user/IP access patterns, (6) Debugging production issues. DO NOT use for local Docker debugging (use docker logs), real-time monitoring (Cloud Logging has 1-2min delay), or Vite dev server logs (use browser console).
allowed-tools: Bash(node:*), Bash(gcloud:*), Bash(curl:*), Read, Grep, WebFetch
---

# API Monitor Skill

Monitor and debug the narrative-api service running on Google Cloud Run using the API monitor server.

## What the API Monitor Does

The API monitor server (`C:\Users\enufa\hddl\.vscode\scripts\api-monitor-server.mjs`):

1. **Fetches logs** from Google Cloud Logging for the `narrative-api` Cloud Run service
2. **Processes logs** to extract HTTP requests, narrative generation metrics, errors
3. **Provides analytics** via REST API at `http://localhost:3030`
4. **Serves dashboard** at `http://localhost:3030/api-monitor-dashboard.html`

## Starting the API Monitor Server

### Prerequisites

Verify authentication and project:

```bash
# Check gcloud authentication
gcloud auth list

# Check current GCP project
gcloud config get-value project

# Verify narrative-api service exists
gcloud run services list --filter="narrative-api"
```

If auth fails: `gcloud auth login`

### Start the Server

```bash
cd .vscode/scripts
node api-monitor-server.mjs
```

**Expected output**:
```
🚀 API Monitor Dashboard Server running at http://localhost:3030
📊 Open http://localhost:3030/api-monitor-dashboard.html in your browser
```

### Verify Server is Running

```bash
curl http://localhost:3030/api/logs
```

Should return JSON with `requests` and `summary` fields.

## Basic Usage

### Fetch Recent Logs

```bash
# Default: last 100 logs
curl http://localhost:3030/api/logs

# Custom limit: last 200 logs
curl http://localhost:3030/api/logs/200

# Save to file for analysis
curl http://localhost:3030/api/logs/500 > recent-api-logs.json
```

### Response Structure

```json
{
  "requests": [
    {
      "timestamp": "2025-01-05T10:30:00.000Z",
      "method": "POST",
      "url": "/generate-scenario?...",
      "endpoint": "/generate-scenario",
      "status": 200,
      "latency": "18.5s",
      "scenario": "insurance",
      "duration": 18500,
      "citations": 17,
      "cost": 0.009374,
      "error": null
    }
  ],
  "summary": {
    "totalRequests": 45,
    "totalCost": "0.4231",
    "avgDuration": 12500,
    "scenarios": ["insurance", "minimal"],
    "errorCount": 2,
    "errorRate": "4.4",
    "recentErrors": [...]
  }
}
```

## Quick Analysis Commands

```bash
# Check error summary
curl http://localhost:3030/api/logs/200 | jq '.summary.recentErrors'

# Check total cost
curl http://localhost:3030/api/logs/500 | jq '.summary.totalCost'

# Check average duration
curl http://localhost:3030/api/logs/200 | jq '.summary.avgDuration'

# List custom scenario prompts
curl http://localhost:3030/api/logs/500 | jq '.summary.customScenarioPrompts'

# Check server health
curl http://localhost:3030/api/logs > /dev/null && echo "Server OK" || echo "Server DOWN"
```

## Common Error Status Codes

| Status | Likely Cause | Fix |
|--------|-------------|-----|
| 401 | Authentication failure | Re-run `gcloud auth login` |
| 403 | Permission denied | Check IAM roles for Cloud Run service |
| 500 | Internal server error | Check `.error` field for stack traces |
| 503 | Service unavailable | Cloud Run cold start or scaling issue |
| 504 | Timeout | Request took >60s (Cloud Run default timeout) |

## Performance Targets

- **Good**: <15s for scenario generation
- **Acceptable**: 15-30s
- **Slow**: >30s (investigate)

## Advanced Workflows

For detailed debugging scenarios, troubleshooting guides, integration patterns, and example analysis workflows, see:

- [references/debugging-scenarios.md](references/debugging-scenarios.md) - Common debugging workflows
- [references/troubleshooting.md](references/troubleshooting.md) - Server and permission issues
- [references/integration.md](references/integration.md) - Using with Docker, scenario harness

## Dashboard Usage

The HTML dashboard provides visual interface at `http://localhost:3030/api-monitor-dashboard.html`:
- Auto-refresh logs
- Visual analytics (charts for costs, duration, errors)
- Interactive filtering (by scenario, IP, status code)

**Note**: Claude Code cannot view the dashboard directly, but can fetch and analyze the underlying API data using curl.

---

**Remember**: This skill is for **Cloud Run production API monitoring**. For local Docker debugging, use `docker logs` instead.
