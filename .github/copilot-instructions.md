# Copilot Instructions for HDDL Project

## Development Workflow

### Iteration Speed Priority
- **Use Vite dev server** at `localhost:5173` for hot module replacement (HMR)
- **Do NOT run Playwright tests** after each change during active iteration
- Tests are for validation checkpoints, not continuous feedback
- Rely on browser hot reload to verify UI changes immediately

### Starting Dev Server
```bash
cd hddl-sim && npm run dev
```

### When to Run Tests
- Before committing
- After completing a feature set
- When explicitly requested
- NOT after every small UI tweak

## Code Patterns

### Steward Colors
Use shared utility for consistent steward coloring:
```js
import { getStewardColor, toSemver } from '../sim/steward-colors.js'
```

### CSS Variables
Prefer VS Code theme variables for consistency:
- `var(--vscode-editor-background)`
- `var(--vscode-sideBar-background)`
- `var(--status-success)`, `var(--status-warning)`, etc.

### Color Tinting Pattern
For subtle background tints based on dynamic colors:
```js
`color-mix(in srgb, ${color} 10%, var(--vscode-sideBar-background))`
```

## Project Structure
- `hddl-sim/src/components/` - UI components (workspace.js, hddl-map.js)
- `hddl-sim/src/pages/` - Page layouts (home.js)
- `hddl-sim/src/sim/` - Simulation logic and utilities
- `hddl-sim/schemas/` - JSON schemas for scenarios

## Communication Guidelines

### Never Fabricate Project History
- **DO NOT** make up timelines, development duration, or effort estimates
- **DO NOT** add phrases like "months of work", "weeks of iteration", "extensive development"
- **DO NOT** invent project history or milestones that didn't happen
- Stick to observable facts: features present, tests passing, code structure
- If asked about project history, only reference git commit history or explicitly documented facts
