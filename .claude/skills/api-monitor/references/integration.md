# Integration with Other Tools

## Combining with Docker Local API

The API monitor shows **Cloud Run** logs, while local Docker debugging uses container logs.

| Environment | Tool | When to Use |
|------------|------|-------------|
| Cloud Run (production) | API Monitor Server | Analyze production usage, costs, errors |
| Local Docker | `docker logs narrative-api-test` | Development debugging, auth testing |

### Workflow Pattern

```bash
# 1. Develop locally with Docker
docker run -d -p 8080:8080 \
  -v "$env:APPDATA\gcloud:/root/.config/gcloud:ro" \
  --name narrative-api-test \
  narrative-api

# 2. Test locally
curl http://localhost:8080/generate-scenario?scenario=minimal

# 3. Check local logs
docker logs narrative-api-test

# 4. Deploy to Cloud Run
gcloud run deploy narrative-api ...

# 5. Monitor production with API Monitor
cd .vscode/scripts && node api-monitor-server.mjs
curl http://localhost:3030/api/logs
```

## Using with Scenario Generation Harness

The scenario generation harness hits the Cloud Run API, so you can monitor those requests:

### Workflow

1. **Run harness** to generate scenarios and hit the API
   ```powershell
   .\hddl-sim\scripts\scenario-generation-harness.ps1
   ```

2. **Wait 1-2 minutes** for Cloud Logging ingestion delay

3. **Start API monitor** (if not already running)
   ```bash
   cd .vscode/scripts && node api-monitor-server.mjs
   ```

4. **Check API monitor** to see costs, durations, and any errors
   ```bash
   curl http://localhost:3030/api/logs/50 | jq '.summary'
   ```

5. **Analyze patterns** to optimize generation prompts
   - Which scenarios are most expensive?
   - Which take longest to generate?
   - Are there any failures?

### Example Analysis

```bash
# After running harness, analyze the latest batch of generations
curl http://localhost:3030/api/logs/20 | jq '.requests[] | select(.endpoint == "/generate-scenario") | {scenario, duration, cost, citations}'
```

This helps you:
- Validate harness is working correctly
- Identify expensive scenarios to optimize
- Track generation performance over time
- Spot errors in generated scenarios

## Integration with Vite Dev Server

**Important**: API Monitor is for Cloud Run, not the Vite dev server.

| Tool | Purpose | Logs Location |
|------|---------|---------------|
| Vite dev server | Frontend development | Browser console + terminal |
| API Monitor | Cloud Run API backend | Cloud Logging via monitor server |

Don't confuse them:
- **Frontend errors** (React, UI) → Check browser console
- **API errors** (scenario generation) → Check API Monitor
- **Build errors** (bundling) → Check terminal where `npm run dev` is running

## Example: Full-Stack Debugging

**User reports**: "Scenario generation is broken"

**Your workflow**:

1. **Check frontend** (Vite dev server):
   - Is the request being sent from UI?
   - Check browser Network tab for `/generate-scenario` calls
   - Check for CORS or network errors

2. **Check API** (Cloud Run via API Monitor):
   ```bash
   curl http://localhost:3030/api/logs/50 | jq '.summary.recentErrors'
   ```
   - Are requests reaching Cloud Run?
   - What status codes are returned?
   - What error messages appear?

3. **Check local Docker** (if testing locally):
   ```bash
   docker logs narrative-api-test --tail 50
   ```
   - Are there auth errors?
   - Is Vertex AI responding?
   - Are there code exceptions?

This layered approach helps you isolate where the issue is occurring.
