# UX Review Harness (AI-led)

Goal: generate a deterministic **outside-in** review bundle (screenshots + DOM/accessibility snapshots + structured JSON) so an AI reviewer can critique the sim *only from what’s visible*.

## Run

- `npm run ux:review`

Outputs a timestamped folder under `review/artifacts/`.

## What gets captured

- Full-page screenshots for key user-journey steps
- Light DOM snapshots (HTML) for each step
- A11y snapshot JSON (Playwright accessibility tree)
- `run.json` containing the step list + captured context (route/time/persona/story-mode)

## How to use

1. Run `npm run ux:review`.
2. Share the generated `run.json` + screenshots (or attach them in chat).
3. Iterate on UI/data based on the critique.
