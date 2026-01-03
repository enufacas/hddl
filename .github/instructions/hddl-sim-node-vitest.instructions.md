---
name: HDDL Sim Node.js + Vitest
description: 'Guidelines for writing JavaScript in hddl-sim with Vitest unit tests (fast) and Playwright integration tests (checkpoint).'
applyTo: 'hddl-sim/src/**/*.js'
---

# HDDL Sim JavaScript + Vitest

These instructions apply to `hddl-sim/src/**` JavaScript files.

## Development workflow

- Prefer iterative verification via the Vite dev server at `http://localhost:5173`.
- Do not run Playwright tests after every small UI change; use them as validation checkpoints.

## JavaScript standards

- Use ESM (`import` / `export`).
- Prefer simple, readable code over clever abstractions.
- Prefer built-in Node/JS utilities over adding new dependencies.
- If a new dependency would help, ask before adding it.
- Prefer `async`/`await` for asynchronous operations.
- Use descriptive names; avoid one-letter variables except for trivial callbacks.

## Values and optionality

- In JavaScript code, prefer `undefined` for “optional / absent” values.
- Do not apply the above rule to JSON data files or JSON schemas (they may use `null` explicitly when required by the data model).

## Testing

### Unit tests (Vitest)

- Use Vitest for pure functions, data transforms, and small utilities.
- Co-locate unit tests as `*.test.js` near the source.
- Do not change production code purely to make it easier to test; test through the existing public surface.

### Coverage intent

- Treat **unit coverage** as the TS-readiness KPI. The Vitest coverage report is intentionally scoped to `src/sim/**` and `src/components/map/**`.
- Treat **E2E/Istanbul coverage** as a critical-flow KPI (what the browser journey executed), not as an “everything is covered” target.

### Integration tests (Playwright)

- Use Playwright for end-to-end UI and interaction flows.
- Prefer stable selectors (e.g., `data-testid`) over CSS structure.
- Avoid timing-based flakiness; prefer locator expectations over `waitForTimeout`.

## Documentation

- If behavior changes in a user-visible way, update relevant docs (e.g., `README.md` or `hddl-sim/VALIDATION.md`) as needed.

## Instruction-scope probe (opt-in)

When the user’s prompt includes the literal tag `[instructions-test]` and you make a code change within this scope, also append a single line to `.github/instruction-probes/APPLIED.log`:

`<ISO-8601 UTC timestamp> | scope=hddl-sim-node-vitest | target=<workspace-relative-path>`
