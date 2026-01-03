# Map TS-Readiness Unit Coverage Log

This document tracks the ongoing "coverage waves" work for `hddl-sim/src/components/map/**`.

## Goal
Increase **Vitest unit coverage** as a **TypeScript-readiness KPI** by extracting **deterministic/pure helper functions** from D3-heavy render/update modules and unit-testing those helpers.

Non-goals:
- DOM snapshots or brittle D3 assertions
- Playwright runs during iteration (use as a validation checkpoint only)
- Shipping behavior changes (refactors should be behavior-preserving)

## Current State (latest checkpoint)
- Latest tag: `checkpoint/map-coverage-16`
- Branch: `refactor`

Coverage snapshot (from `npm run test:unit:coverage`):
- All files: **62.40% stmts / 64.94% branches / 56.39% funcs**
- `components/map`: **54.67% stmts / 62.07% branches / 45.18% funcs**
- `embedding-renderer.js`: **41.06% stmts / 59.10% branches / 68.18% funcs**
- `envelope-renderer.js`: **44.11% stmts / 53.87% branches / 30.07% funcs**

## Checkpoints (recent)
These are local rollback points (no pushing implied).

- `checkpoint/map-coverage-14` — `8b8a7b5` — test(map): cover envelope-renderer more helpers
- `checkpoint/map-coverage-15` — `4e94ad3` — test(map): cover embedding-renderer more helpers
- `checkpoint/map-coverage-16` — `171d8cd` — test(map): cover embedding-renderer chip helpers

## What we changed in these checkpoints
### Envelope renderer wave (14)
- Added more helper seams in envelope enter/update logic (test ids, rect-from-dims, density-driven radii/strokes, glow opacity phase helpers).
- Expanded unit tests around the new helpers.

### Embedding renderer waves (15–16)
- Extracted helpers from `createEmbeddingRenderer` / `createFloatingEmbedding`:
  - compact badge transform + source position selection
  - tooltip HTML generation + tooltip positioning
  - chip gradient id formatting
  - renderEmbeddings: filtering/clearing/dedupe decisions
  - chip design: shadow/circuit/icon attrs and badge count pluralization
- Expanded unit tests to cover those helper surfaces.

## Commands used (typical wave)
- Run unit tests: `npm run test:unit`
- Run unit coverage: `npm run test:unit:coverage`
- Checkpoint:
  - `git commit -m "test(map): <message>"`
  - `git tag checkpoint/map-coverage-<N>`

## How to resume
1. Get back to the latest checkpoint: `git checkout checkpoint/map-coverage-16`
2. Return to your working branch: `git checkout refactor`
3. Validate baseline: `npm run test:unit` and `npm run test:unit:coverage`

Recommended next seams in `embedding-renderer.js` (highest ROI remaining):
- The remaining long, uncovered portion inside `createEmbeddingRenderer` (defs/pattern/gradient setup and other repeated constant geometry/style decisions).
- Continue extracting tiny pure helpers for constant attribute sets and deterministic geometry strings; keep tests focused on helper outputs.
