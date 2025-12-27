# HDDL Scenario Library

This directory contains plug-and-play scenario files that demonstrate HDDL principles across different domains.

## Storage Structure

```
hddl-sim/src/sim/scenarios/
├── default.scenario.json           # Foundational 4-fleet scenario
├── medical-diagnosis.scenario.json # Healthcare stewardship
├── autonomous-vehicles.scenario.json # Transportation safety & ethics
└── financial-lending.scenario.json  # Financial services compliance
```

## Schema Compliance

All scenarios conform to `hddl-sim/schemas/hddl-scenario.schema.json` (v2):

- **Required fields**: `schemaVersion`, `id`, `title`, `durationHours`, `envelopes`, `fleets`, `events`
- **Envelopes**: Must specify `ownerRole`, `createdHour`, `endHour`, `assumptions`, `constraints`
- **Events**: Must include `type`, `hour`, and type-specific fields
- **Validation**: Automatic schema validation on load via `normalizeScenario()`

## Scenario Metadata

Each scenario in the catalog (`scenario-loader.js`) includes:

```javascript
{
  id: 'unique-scenario-id',
  title: 'Human-Readable Title',
  description: 'Brief summary of the scenario focus',
  data: scenarioJSONObject,
  tags: ['domain', 'characteristics'] // e.g., ['healthcare', 'safety-critical']
}
```

## Adding New Scenarios

### 1. Create JSON File

Place in `hddl-sim/src/sim/scenarios/your-scenario.scenario.json`:

```json
{
  "schemaVersion": 2,
  "id": "scenario-your-domain-001",
  "title": "Your Scenario Title",
  "durationHours": 72,
  "envelopes": [...],
  "fleets": [...],
  "events": [...]
}
```

### 2. Register in Scenario Loader

Edit `hddl-sim/src/sim/scenario-loader.js`:

```javascript
import yourScenario from './scenarios/your-scenario.scenario.json'

export const SCENARIOS = {
  // ...existing scenarios
  'your-domain': {
    id: 'your-domain',
    title: 'Your Scenario Title',
    description: 'Brief summary of what this scenario demonstrates',
    data: yourScenario,
    tags: ['your-domain', 'relevant-tags']
  }
}
```

### 3. Validate

Run schema validation:

```bash
npm run conformance
```

Test in browser: Scenario selector dropdown will automatically include your new scenario.

## Scenario Design Guidelines

### Decision Envelopes

- **Ownership**: Clearly assign `ownerRole` (steward responsible for bounds)
- **Lifecycle**: Define `createdHour` (promotion) and `endHour` (expiration)
- **Assumptions**: List human judgment starting points (can be challenged)
- **Constraints**: Define hard boundaries (must be enforced by agents)

### Events

Create meaningful event sequences:

1. **envelope_promoted**: Authority becomes active
2. **decision**: Agent executes within bounds
3. **boundary_interaction**: Agent approaches/touches constraint
4. **signal**: Monitoring data indicates drift or stability
5. **revision**: Steward adjusts bounds based on evidence
6. **dsg_session**: Group review and calibration

### Realism & Pedagogy

- **Realistic timescales**: Use appropriate durations (hours/days for most workflows)
- **Diverse outcomes**: Include allowed decisions, boundary touches, and escalations
- **Steward actions**: Show human judgment in revision and DSG events
- **Evidence-driven**: Signal events should precede revisions

## Example Scenarios

### Default (Multi-Domain Foundation)
- **Duration**: 48 hours
- **Domains**: Customer Service, HR, Sales, Data Stewardship
- **Focus**: Foundational HDDL patterns across typical enterprise operations

### Medical Diagnosis Support
- **Duration**: 72 hours  
- **Domains**: Clinical Diagnostics, Pharmacy Safety, Emergency Care
- **Focus**: High-stakes healthcare with patient safety constraints

### Autonomous Vehicle Operations
- **Duration**: 96 hours
- **Domains**: Vehicle Safety, Navigation Ethics, UX, Maintenance
- **Focus**: Physical safety, ethical edge cases, multi-fleet coordination

### Consumer Lending Decisions
- **Duration**: 120 hours
- **Domains**: Credit Underwriting, Fraud Detection, Collections, Compliance
- **Focus**: Fairness, regulatory compliance, financial risk management

## Testing

Scenarios are automatically validated against the schema on load. Run Playwright tests:

```bash
cd hddl-sim
npm test
```

Tests verify:
- Schema conformance
- Event chronology (monotonic time)
- Envelope lifecycle validity
- Fleet-envelope relationships

## UI Integration

The scenario selector appears in the top-right corner of the simulation UI:

- **Dropdown**: Select any registered scenario
- **Auto-reload**: Switching scenarios resets timeline and refreshes all views
- **Persistence**: Current selection saved to `localStorage`
- **Hover info**: Tooltip shows description and tags

## API Reference

### Loading Scenarios Programmatically

```javascript
import { loadScenario, getScenarioList, getCurrentScenarioId } from '../sim/scenario-loader'
import { setScenario, setTimeHour } from '../sim/store'

// Get all available scenarios
const scenarios = getScenarioList()

// Load a specific scenario
const scenarioData = loadScenario('medical-diagnosis')
setScenario(scenarioData)
setTimeHour(0)

// Get current scenario
const currentId = getCurrentScenarioId() // 'default', 'medical-diagnosis', etc.
```

### Schema Validation

```javascript
import { normalizeScenario } from '../sim/scenario-schema'

const report = normalizeScenario(scenarioData)
if (report.errors.length > 0) {
  console.error('Schema errors:', report.errors)
}
// report.scenario contains validated/normalized data
```

## Future Enhancements

Potential improvements to the scenario system:

- **Cloud storage**: Fetch scenarios from remote URLs
- **User-generated**: Allow custom scenario upload/editing in UI
- **Templates**: Scenario generation wizard with common patterns
- **Variations**: Parameterized scenarios with configurable difficulty/complexity
- **Branching**: Multiple outcome paths based on steward decisions
- **Integration tests**: Automated scenario replay with assertions
