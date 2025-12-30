<div align="center">
  <img src="hddl-sim/public/hddl-icon.png" alt="HDDL" width="200"/>
</div>

# HDDL - Human-Derived Decision Layer

An exploratory framework for reasoning about who is allowed to decide what in automated and AI-assisted systems.

**🚀 [Try the Interactive Simulation](https://enufacas.github.io/hddl/)**

Explore decision authority hierarchies, steward capability tracking, and real-time decision telemetry through an interactive visualization platform.

## Quick Start

### For Implementers
Building HDDL-compatible tools or integrations? Start here:

1. **[Implementers Guide](docs/spec/Implementers_Guide.md)** - How to build with HDDL
2. **[Scenario Replay Wire Format](docs/spec/Scenario_Replay_Wire_Format.md)** - Normative interchange format
3. **[Canonical Event Patterns](docs/spec/Canonical_Event_Patterns.md)** - Required feedback loop patterns
4. **Schema:** `hddl-sim/schemas/hddl-scenario.schema.json`
5. **Conformance:** `npm run conformance` in `hddl-sim/`

### For Learning
Understanding HDDL concepts? Start here:

1. **[System Overview](docs/foundations/HDDL_System_Overview.md)** - Architecture and core concepts
2. **[Foundational Principles](docs/foundations/Human_Derived_Decision_Layer_Foundational_Principles.md)** - Why HDDL exists
3. **[Glossary](docs/Glossary.md)** - Canonical terminology
4. **[Narratives](docs/narratives/)** - Real-world scenarios

### For Contributors
Working on HDDL specifications or implementations:

1. **[Canon Registry](docs/Canon_Registry.md)** - Authoritative index of all canonical documents
2. **[Authority Order](docs/spec/Authority_Order.md)** - What's normative vs illustrative
3. **[Agent Learning Feedback Loop](docs/spec/Agent_Learning_Feedback_Loop.md)** - How agents learn from decisions
4. **[Copilot Instructions](.github/copilot-instructions.md)** - Development patterns and canonical requirements

## Key Concepts

### Closed Loop Requirements
HDDL scenarios demonstrate **complete feedback loops** for agent learning:

- **Every revision MUST have an embedding** - Policy changes are retrievable
- **Every boundary interaction MUST have an embedding** - Escalation patterns teach boundaries
- **Retrievals MUST be chronologically consistent** - Can't retrieve future knowledge
- **Scenarios SHOULD include historical baseline** - Agents start with pre-existing knowledge

See [Canonical Event Patterns](docs/spec/Canonical_Event_Patterns.md) for the complete 6-event feedback cycle.

### What Makes HDDL Different
Traditional audit logs record "what happened." HDDL scenarios with closed loops demonstrate:

- **Agent learning:** Retrieval events show agents "thinking with memory"
- **Policy evolution:** Revision embeddings store WHY rules changed
- **Feedback mechanism:** Complete cycles from boundary → decision → revision → embedding
- **Chronological consistency:** Time-aware retrieval prevents paradoxes
- **Historical baseline:** Agents start with realistic pre-existing knowledge

## Validation

Run conformance checks to validate scenarios:

```bash
cd hddl-sim
npm install
npm run conformance
```

This validates:
- ✅ Canon Registry entries exist
- ✅ Scenarios conform to JSON schema
- ✅ Closed loop requirements (revisions/boundaries have embeddings)
- ✅ Chronological consistency (retrievals reference existing embeddings)

**📖 See [hddl-sim/VALIDATION.md](hddl-sim/VALIDATION.md) for comprehensive validation documentation.**

## Project Structure

```
docs/
  ├── spec/                          # Normative specifications
  │   ├── Canonical_Event_Patterns.md
  │   ├── Scenario_Replay_Wire_Format.md
  │   ├── Agent_Learning_Feedback_Loop.md
  │   ├── Implementers_Guide.md
  │   └── Authority_Order.md
  ├── foundations/                   # Core architecture
  ├── narratives/                    # Teaching scenarios
  ├── Canon_Registry.md              # Authoritative document index
  └── Glossary.md                    # Canonical terminology
hddl-sim/
  ├── schemas/                       # JSON schemas
  │   └── hddl-scenario.schema.json
  ├── scripts/                       # Conformance validation
  │   ├── validate-closed-loops.mjs
  │   └── conformance.mjs
  └── src/sim/scenarios/             # Example scenarios
```

## Deployment

This project is deployed to GitHub Pages as a Single Page Application (SPA). To enable deep-linking and direct navigation to any route (e.g., `/specification`, `/authority`), the build process generates a `404.html` file that mirrors `index.html`. This allows GitHub Pages to serve the SPA shell for any unmatched path, letting the client-side router handle the routing.

