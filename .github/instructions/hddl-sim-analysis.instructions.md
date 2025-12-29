---
name: HDDL Sim Analysis Tools
description: Scope boundaries and output expectations for analysis tooling.
applyTo: "hddl-sim/analysis/**"
---

# Analysis Tools

Analysis tools are **measurement instruments** that read scenario JSON and output metrics to console.
They **do not** write markdown reports directly.

## Tool Architecture (keep concerns separate)
1. `scenario-analysis.mjs` — semantic correctness and closed-loop compliance
2. `cognitive-load-metrics.mjs` — information design / density metrics
3. `performance-metrics.mjs` — browser rendering performance (Playwright; dev server required)

## Separation of Concerns
- Don’t add FPS measurement to `scenario-analysis.mjs`.
- Don’t add closed-loop validation to `cognitive-load-metrics.mjs`.
- Don’t add element counting to `performance-metrics.mjs`.

## Output expectations
- Console-first output, structured and scannable.
- Keep output reasonably short and focused.
- End with a short “what to run next” pointer when helpful.

## Reports
- Reports are markdown documents that synthesize tool output.
- Reports live under `hddl-sim/analysis/` (e.g., `<Scenario>_Analysis.md`).

## Instruction-scope probe (opt-in)
When the user’s prompt includes the literal tag `[instructions-test]` and you make a code change within this scope, also append a single line to `.github/instruction-probes/APPLIED.log`:

`<ISO-8601 UTC timestamp> | scope=hddl-sim-analysis | target=<workspace-relative-path>`
