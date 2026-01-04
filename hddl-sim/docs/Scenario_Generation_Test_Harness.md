# Scenario Generation Test Harness

This project’s scenario generation loop is **not a normal unit test**. It spans:

- **Local container runtime** (Docker)
- **External dependency** (Vertex AI via your local `gcloud` credentials)
- **Contract-ish output requirements** (generator invariants + schema expectations)
- **Analyzer validation** (`analysis/scenario-analysis.mjs`)

Because it sits between *contract API testing*, *end-to-end*, and *AI quality testing*, we keep a small **repeatable harness** to run the same commands consistently and capture artifacts.

## What This Harness Covers

The harness script runs this loop:

1. `docker build` the local API image
2. `docker run` the API container with your gcloud credential mount
3. Call `POST /generate-scenario` with an Origin header compatible with local UI
4. Save:
   - the full API response (best-effort)
   - the generated scenario JSON (UTF-8 no BOM)
5. Run `node analysis/scenario-analysis.mjs <scenario-name>` and save output to a markdown report

## What This Harness Does NOT Cover

- UI correctness (use Vite + browser, and Playwright as a checkpoint)
- Deterministic “green” results every run (the LLM is stochastic)
- CI-ready testing (requires credentials + billable external API)

## Prerequisites

- Docker Desktop running
- Google Cloud SDK installed
- You have authenticated locally:
  - `gcloud auth login`
  - `gcloud config set project <your-project>`
- Vertex AI API enabled for the project

Optional but recommended:
- Create `hddl-sim/.env` with at least:
  - `GOOGLE_CLOUD_PROJECT=your-project-id`
  - `GOOGLE_CLOUD_LOCATION=us-central1`

## Usage

From the repo root or from `hddl-sim/`:

```powershell
# Basic run (build, restart container, generate, analyze)
.\hddl-sim\scripts\scenario-generation-harness.ps1

# Explicit name + prompt
.\hddl-sim\scripts\scenario-generation-harness.ps1 -Name generated-healthcare-triage-v4 -Prompt "Healthcare triage under staffing shortage; escalation boundaries; policy revisions based on outcomes."

# Skip rebuild/restart when iterating quickly
.\hddl-sim\scripts\scenario-generation-harness.ps1 -NoBuild -NoRestart -Name generated-healthcare-triage-v5

# Use an explicit .env file
.\hddl-sim\scripts\scenario-generation-harness.ps1 -EnvFile .\hddl-sim\.env

# Generate without running analyzer
.\hddl-sim\scripts\scenario-generation-harness.ps1 -SkipAnalyze

# Override project/location (still supported)
.\hddl-sim\scripts\scenario-generation-harness.ps1 -Project hddl-narrative-gen -Location us-central1
```

## Outputs (Artifacts)

The script writes:

- `hddl-sim/temp-<Name>-response.json` (temporary; deleted by default)
- `hddl-sim/src/sim/scenarios/<Name>.scenario.json`
- `hddl-sim/analysis/<Name>_Scenario_Analysis_YYYY-MM-DD.md`

To keep the raw response JSON (useful for debugging API metadata), run with `-KeepResponse`.

These files are intentionally easy to diff and attach to bug reports.

## Interpreting Results

- **Analyzer errors** (`Errors: N`) are “hard” failures: scenario is structurally inconsistent.
- **Analyzer warnings** are “soft” quality issues (retrieval realism, semantic overlap, embedding coverage, etc.).

A common workflow is:

- Tighten generator contract/validation until analyzer errors are consistently zero.
- Then address warnings by improving prompt quality and semantic coherence.

## Troubleshooting

### API never becomes healthy

- Run: `docker logs --tail 200 narrative-api-test`
- Common cause: missing credential mount or not logged into `gcloud`.

### Vertex auth errors

- Ensure the mount exists:
  - Windows host: `%APPDATA%\gcloud` must exist
- Ensure you’re logged in:
  - `gcloud auth login`

### PowerShell JSON depth warnings

PowerShell’s `ConvertTo-Json` has a max depth. The harness saves the scenario and analyzer output reliably; the “full response JSON” capture is best-effort.
