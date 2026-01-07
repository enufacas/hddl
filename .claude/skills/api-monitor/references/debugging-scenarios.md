# Common Debugging Scenarios

## Scenario 1: Investigating Recent Errors

**User says**: "The API is throwing errors" or "Scenario generation is failing"

**Workflow**:

1. **Fetch recent logs and check error summary**:
```bash
curl http://localhost:3030/api/logs/200 | jq '.summary.recentErrors'
```

2. **Analyze error patterns**:
   - Check `.summary.errorsByStatus` for status code distribution
   - Check `.summary.errorRate` for error percentage
   - Review `.summary.recentErrors` for specific error messages

3. **Common error interpretations**:

| Status | Likely Cause | Fix |
|--------|-------------|-----|
| 401 | Authentication failure | Re-run `gcloud auth login` |
| 403 | Permission denied | Check IAM roles for Cloud Run service |
| 500 | Internal server error | Check `.error` field for stack traces |
| 503 | Service unavailable | Cloud Run cold start or scaling issue |
| 504 | Timeout | Request took >60s (Cloud Run default timeout) |

4. **Report findings**:
   - Error count and rate
   - Most common error type
   - Recent error timestamps
   - Suggested fix

## Scenario 2: Analyzing API Costs

**User says**: "How much are we spending on the API?" or "Which scenarios are most expensive?"

**Workflow**:

1. **Fetch logs with cost data**:
```bash
curl http://localhost:3030/api/logs/500 | jq '.summary.totalCost'
```

2. **Break down by scenario**:
```bash
# Extract requests with cost data
curl http://localhost:3030/api/logs/500 | \
  jq '.requests[] | select(.cost != null) | {scenario, cost, citations, duration}'
```

3. **Calculate cost per scenario**:
   - Group by `.scenario` field
   - Sum `.cost` values
   - Average `.duration` and `.citations`

4. **Report**:
   - Total API cost
   - Cost per scenario
   - Most expensive operations
   - Avg citations/duration per request

## Scenario 3: Performance Analysis

**User says**: "Is the API slow?" or "Why is generation taking so long?"

**Workflow**:

1. **Check average duration**:
```bash
curl http://localhost:3030/api/logs/200 | jq '.summary.avgDuration'
```

2. **Find slowest requests**:
```bash
curl http://localhost:3030/api/logs/200 | \
  jq '.requests[] | select(.duration != null) | {timestamp, scenario, duration, citations}' | \
  jq -s 'sort_by(.duration) | reverse | .[0:10]'
```

3. **Analyze patterns**:
   - Is duration correlated with citation count?
   - Are certain scenarios consistently slower?
   - Are there latency spikes at specific times?

4. **Performance targets**:
   - **Good**: <15s for scenario generation
   - **Acceptable**: 15-30s
   - **Slow**: >30s (investigate)

5. **Report**:
   - Average duration
   - 95th percentile duration
   - Slowest scenarios
   - Potential bottlenecks

## Scenario 4: Usage Pattern Analysis

**User says**: "Who's using the API?" or "What scenarios are being generated?"

**Workflow**:

1. **Check unique IPs and repeat usage**:
```bash
curl http://localhost:3030/api/logs/500 | jq '.summary | {uniqueIPs, repeatIPs}'
```

2. **Review custom scenario prompts**:
```bash
curl http://localhost:3030/api/logs/500 | jq '.summary.customScenarioPrompts'
```

3. **Analyze endpoint distribution**:
```bash
curl http://localhost:3030/api/logs/500 | jq '.summary.endpointCounts'
```

4. **Report**:
   - Total API calls
   - Unique users (IPs)
   - Most active users
   - Popular scenarios
   - Custom generation requests

## Example: "What's going on with the narrative API today?"

**Claude's workflow**:

1. **Start server if needed**:
   ```bash
   curl http://localhost:3030/api/logs > /dev/null 2>&1 || \
     (cd .vscode/scripts && node api-monitor-server.mjs &)
   ```

2. **Fetch today's logs** (estimate ~500 logs):
   ```bash
   curl http://localhost:3030/api/logs/500 > api-analysis.json
   ```

3. **Extract key metrics**:
   ```bash
   cat api-analysis.json | jq '.summary'
   ```

4. **Report findings**:
   - "Total requests: 142"
   - "Total cost: $0.52"
   - "Average duration: 14.2s"
   - "Error rate: 2.1% (3 errors)"
   - "Most used scenario: insurance (45 requests)"
   - "3 unique IPs, mostly from 192.168.1.1"
   - "Recent errors: 2x 500 errors at 10:30 AM, 1x 503 at 11:15 AM"

5. **Recommend actions** if issues found:
   - High error rate → investigate error logs
   - High costs → analyze expensive scenarios
   - Slow performance → check duration by scenario
