# API Security & Abuse Protection

## Overview

The HDDL narrative and scenario generation API is deployed to Google Cloud Run with comprehensive abuse protection to prevent misuse while keeping costs under control.

## Protection Layers

### 1. Origin Validation (Application-Level)
**File:** `api/server.mjs`

- **Purpose:** Prevent direct API access via curl/Postman/scripts
- **Implementation:** Validates `Origin` and `Referer` headers
- **Allowed origins:**
  - `https://enufacas.github.io` (GitHub Pages)
  - `localhost` (development only)
- **Response:** 403 Forbidden for unauthorized origins

### 2. Rate Limiting (Application-Level)
**File:** `api/server.mjs`

- **Limit:** 20 requests per hour per IP address
- **Scope:** Applies to both `/generate` and `/generate-scenario` endpoints
- **Implementation:** `express-rate-limit` middleware
- **Response:** 429 Too Many Requests with `retryAfter` header

### 3. Request Size Limits
- **Limit:** 1MB maximum request body
- **Implementation:** `express.json({ limit: '1mb' })`
- **Purpose:** Prevent memory exhaustion attacks

### 4. Input Validation & Sanitization

#### Narrative Generation (`/generate`)
- **scenario field:**
  - Required, must be string
  - Max length: 200 characters
  - Path traversal protection (no `..`, `/`, `\` characters)
- **userAddendum field:**
  - Optional string
  - Max length: 4000 characters
  - Null byte removal (`\u0000`)

#### Scenario Generation (`/generate-scenario`)
- **prompt field:**
  - Required, must be at least 10 characters
  - Max length: 1000 characters

### 5. Timeout Protection
- **Limit:** 120 seconds (2 minutes)
- **Implementation:** `Promise.race()` with timeout promise
- **Response:** 504 Gateway Timeout with helpful hint
- **Purpose:** Prevent long-running requests from consuming resources

### 6. Cloud Run Infrastructure Limits
**File:** `api/deploy.ps1`

- **Max instances:** 2 (hard ceiling on concurrent load)
- **Concurrency:** 2 requests per instance (4 total concurrent requests max)
- **Auto-scaling:** Scales to zero when idle (no cost when unused)
- **Timeout:** 300 seconds (5 minutes hard limit)
- **Memory:** 1GB per instance
- **CPU:** 1 vCPU per instance

## Cost Protection

### Cost Ceiling
- **2 max instances × ~$23/month** = ~$46/month maximum
- **Scales to zero** when idle (no minimum cost)
- **Rate limiting** prevents runaway API costs from Vertex AI

### Per-Request Costs (Vertex AI)
- **Narrative generation:** ~$0.01-0.05 per request
- **Scenario generation:** ~$0.02-0.10 per request
- **Max daily cost at rate limit:** 20 req/hour × 24 hours × $0.10 = ~$48/day worst case

## Monitoring

### Logs
All requests are logged with:
- Timestamp
- IP address (via `req.ip`)
- Request type (narrative vs scenario)
- Generation duration
- Vertex AI token counts and costs
- Rate limit hits
- Validation failures

### Cloud Run Metrics
- Request count
- Request latency (p50, p95, p99)
- Instance count
- Error rate
- CPU/memory usage

## Deployment

```powershell
# Deploy with security settings
.\api\deploy.ps1
```

## Testing

```bash
# Health check (no rate limit)
curl https://your-api-url/health

# List scenarios (no rate limit)
curl https://your-api-url/scenarios

# Generate narrative (rate limited)
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://enufacas.github.io" \
  -d '{"scenario":"insurance-underwriting"}'

# Generate scenario (rate limited)
curl -X POST https://your-api-url/generate-scenario \
  -H "Content-Type: application/json" \
  -H "Origin: https://enufacas.github.io" \
  -d '{"prompt":"Insurance agent learning bundle discount approval","domain":"insurance"}'
```

## Future Enhancements

### Recommended (if scaling up)
1. **Redis-backed rate limiting** - Replace in-memory map with Redis for multi-instance rate limits
2. **API keys** - Add authentication for known users
3. **Request queuing** - Add job queue (Cloud Tasks) for batch processing
4. **Caching** - Cache common scenarios/narratives (Cloud Storage)
5. **WAF** - Add Cloud Armor for DDoS protection

### Not recommended (over-engineering for demo)
- OAuth/JWT authentication (adds friction)
- Per-user accounts (maintenance burden)
- Complex billing/metering (unnecessary complexity)

## Security Contact

For security issues or abuse reports, open an issue on GitHub:
https://github.com/enufacas/hddl/issues
