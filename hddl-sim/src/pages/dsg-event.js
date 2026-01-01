import {
  formatSimTime,
  getEnvelopeAtTime,
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  getActiveDSGSession,
} from '../sim/sim-state'
import { initGlossaryInline } from '../components/glossary'
import { navigateTo } from '../router'

export function renderDSGEvent(container) {
  container.innerHTML = `
    <div class="page-container" data-testid="dsg-page">
      <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 24px;">
        <span class="codicon codicon-file-binary" style="font-size: 28px; opacity: 0.5;"></span>
        <div>
          <h1 style="margin: 0;">Domain Steward Group</h1>
          <p style="margin: 0; opacity: 0.7;">Cross-domain governance and arbitration</p>
        </div>
      </div>

      <div style="padding: 24px; border: 1px solid var(--vscode-widget-border); border-radius: 6px; background: var(--vscode-editor-background); text-align: center;">
        <span class="codicon codicon-info" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;"></span>
        <h2 style="margin: 0 0 8px 0; font-size: 16px;">Not Yet Implemented</h2>
        <p style="margin: 0; opacity: 0.7; font-size: 13px;">
          Domain Steward Group review features are planned for a future release.<br>
          This will provide cross-domain arbitration artifacts and governance decisions.
        </p>
      </div>
    </div>
  `
}
