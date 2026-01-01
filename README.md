<div align="center">
  <img src="hddl-sim/public/hddl-icon.png" alt="HDDL" width="200"/>
</div>

# HDDL - Human-Derived Decision Layer

HDDL (Human-Derived Decision Layer) is a thought experiment and specification concept for reasoning about how Human-in-the-Loop (HITL) scales with autonomous agent fleets.

The core idea is simple: systems can execute fast, but they should only *decide* inside clearly defined bounds ("decision envelopes")—and escalate to humans when they're outside those bounds.

## Start Here: Interactive SIM

Open the interactive simulation:

- https://enufacas.github.io/hddl/

Then click **"Explain this to me"** in the top bar to start the guided tour.

What you'll see:

- **Decision envelopes** (the current operating boundaries)
- **Boundary interactions** (where an agent hits a limit and escalates)
- **Envelope revisions** (how humans update the boundaries over time)
- **Decision memory** (embeddings and retrieval events that make past judgments usable)
- **DTS / DSG views** (the query-first event log and stewardship sessions)

The SIM includes multiple scenarios across different industries (e.g., insurance, lending, healthcare, SaaS, aviation/defense, and more) so you can see how the same governance mechanics show up in different domains.

It also has an **AI-Generated Narrative** panel that can generate a scenario-aligned story to help the concepts land. You can add optional extra instructions to steer the narrative (they're appended to the base prompt).

## Spec / Format

If you want the "real" definitions, start here:

- **Canon Registry:** [docs/Canon_Registry.md](docs/Canon_Registry.md)
- **What's normative vs illustrative:** [docs/spec/Authority_Order.md](docs/spec/Authority_Order.md)
- **Implementer entrypoint:** [docs/spec/Implementers_Guide.md](docs/spec/Implementers_Guide.md)
- **Scenario replay wire format:** [docs/spec/Scenario_Replay_Wire_Format.md](docs/spec/Scenario_Replay_Wire_Format.md)
- **Canonical event patterns (feedback cycles):** [docs/spec/Canonical_Event_Patterns.md](docs/spec/Canonical_Event_Patterns.md)
- **Scenario JSON Schema:** [hddl-sim/schemas/hddl-scenario.schema.json](hddl-sim/schemas/hddl-scenario.schema.json)

## Run Locally (Optional)

```bash
cd hddl-sim
npm install
npm run dev
```

## Repo Map

- **Interactive simulation:** [hddl-sim/](hddl-sim/)
- **Scenario library:** [hddl-sim/src/sim/scenarios/](hddl-sim/src/sim/scenarios/) and [hddl-sim/src/sim/scenarios/README.md](hddl-sim/src/sim/scenarios/README.md)
- **Tests (unit + Playwright):** [hddl-sim/tests/README.md](hddl-sim/tests/README.md)
- **Analytics tooling:** [hddl-sim/analysis/](hddl-sim/analysis/) (scenario analysis, cognitive load metrics, performance metrics)

