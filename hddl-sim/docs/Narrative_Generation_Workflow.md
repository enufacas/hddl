# Narrative Generation Workflow (Local + Pre-Generated Artifacts)

This document captures the end-to-end workflow for generating HDDL narratives:
- interactively from the UI (browser → API), and
- in batch to store pre-generated `*.narrative.json` artifacts in-repo.

It uses simple ASCII diagrams to show how the pieces fit.

---

## What Gets Produced

Scenario source files live here:
- `hddl-sim/src/sim/scenarios/<name>.scenario.json`

Pre-generated narrative artifacts are written alongside them:
- `hddl-sim/src/sim/scenarios/<name>.narrative.json`

Those `*.narrative.json` files are what the UI can load instantly without doing an LLM call.

---

## System Diagram (UI → API → Vertex)

```
+-------------------------+        POST /generate        +---------------------------+
| Browser UI              |  ------------------------->  | Narrative API (Express)    |
| Vite dev server :5173   |   Origin: http://localhost   | Docker container :8080     |
+-------------------------+                               +-------------+-------------+
                                                                    |
                                                                    | generateLLMNarrative(...)
                                                                    v
                                                         +---------------------------+
                                                         | Vertex AI (Gemini)        |
                                                         | Google Cloud credentials  |
                                                         +-------------+-------------+
                                                                    |
                                                                    v
                                                        { narrative, citations, metadata }
```

Notes:
- The API enforces an `Origin`/`Referer` check and will reject requests without an origin.
- Localhost origins are allowed (to support local dev).

---

## Batch Diagram (Pre-Generate + Store Artifacts)

```
+-----------------------------------+
| scripts/generate-narratives.mjs    |
+------------------+----------------+
                   |
                   | reads
                   v
        +----------------------------+
        | src/sim/scenarios/*.json   |
        |  - *.scenario.json         |
        +----------------------------+
                   |
                   | generates (fullContext)
                   v
        +----------------------------+
        | src/sim/scenarios/*.json   |
        |  - *.narrative.json        |
        +----------------------------+
```

The script supports two generation paths:

```
                 +------------------------------+
                 | scripts/generate-narratives  |
                 +--------------+---------------+
                                |
                +---------------+----------------+
                |                                |
                | direct mode                     | API mode (--use-api)
                v                                v
   +---------------------------+        +---------------------------+
   | api/narrative-generator   |        | api/server.mjs            |
   | (module call)             |        | POST /generate            |
   +-------------+-------------+        +-------------+-------------+
                 |                                |
                 v                                v
         +---------------+                +---------------+
         | Vertex AI     |                | Vertex AI     |
         +---------------+                +---------------+
```

---

## Recommended Local Workflow (Use the Container API)

### 1) Build the API image

From `hddl-sim/`:

```powershell
docker build -t narrative-api .
```

### 2) Run the container (PowerShell)

This mount passes your host `gcloud` credentials into the container.

```powershell
docker run -d -p 8080:8080 `
  -v "$env:APPDATA\gcloud:/root/.config/gcloud:ro" `
  -e GOOGLE_CLOUD_PROJECT=your-gcp-project-id `
  -e GOOGLE_CLOUD_LOCATION=us-central1 `
  --name narrative-api-test `
  narrative-api
```

Sanity check:

```powershell
curl http://localhost:8080/health
```

### 3) Regenerate pre-generated narratives via API mode

```powershell
cd hddl-sim
node scripts/generate-narratives.mjs --scenario default --force --use-api
node scripts/generate-narratives.mjs --scenario financial-lending --force --use-api
```

Defaults in API mode:
- `--api-url` defaults to `http://localhost:8080`
- `--origin` defaults to `http://localhost:5173`

---

## Direct (Non-API) Mode (When Host Env Has Credentials)

Direct mode calls `generateLLMNarrative(...)` without going through HTTP.

```powershell
cd hddl-sim
$env:GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
$env:GOOGLE_CLOUD_LOCATION="us-central1"
node scripts/generate-narratives.mjs --scenario default --force
```

---

## Common Failure Modes (and What They Mean)

### 403: “Access denied: No origin header”

The API blocks requests without `Origin` (or `Referer`).

Fix:
- If calling the API manually, include an `Origin` header.
- If using the script, set `--origin`.

Example:

```powershell
curl -X POST http://localhost:8080/generate `
  -H "Content-Type: application/json" `
  -H "Origin: http://localhost:5173" `
  -d '{"scenario":"default","fullContext":true}'
```

### Auth errors inside the container

Common symptom:
- `GoogleAuthError: Unable to authenticate`

Fix:
- Make sure you have run `gcloud auth login` on the host.
- Make sure the container is started with the `-v "$env:APPDATA\gcloud:/root/.config/gcloud:ro"` mount.

### Narrative exists and nothing happens

The generator skips existing artifacts unless you pass `--force`.

---

## Where the Prompts Live

- Narrative prompt construction and LLM call logic: `hddl-sim/api/narrative-generator.mjs`
  - API endpoint that uses it: `hddl-sim/api/server.mjs` (`POST /generate`)
- Scenario generation prompt + validation: `hddl-sim/api/scenario-generator.mjs`
  - API endpoint that uses it: `hddl-sim/api/server.mjs` (`POST /generate-scenario`)
