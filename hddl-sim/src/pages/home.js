// Home page - Decision Envelopes view
import { createEnvelopeDetailModal } from '../components/envelope-detail';
import { formatSimTime, getEnvelopeAtTime, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange } from '../sim/sim-state';

export function renderHome(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <span class="codicon codicon-shield" style="font-size: 28px;"></span>
        <div>
          <h1 style="margin: 0;">Decision Envelopes</h1>
          <p style="margin: 0; color: var(--vscode-statusBar-foreground);">Active envelopes ready for simulation replay</p>
        </div>
      </div>

      <div style="background: var(--vscode-notifications-background); border: 1px solid var(--vscode-notifications-border); padding: 12px; border-radius: 6px; margin-bottom: 24px; display: flex; align-items: start; gap: 12px;">
        <span class="codicon codicon-info" style="font-size: 20px; color: var(--status-info); flex-shrink: 0;"></span>
        <div style="font-size: 13px;">
          <strong>How to use this simulation:</strong> Use the timeline scrubber above to replay events. Switch personas (top-left dropdown) to see how different stewards experience the same decisions. Click any envelope to inspect details.
        </div>
      </div>

      <h2 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span class="codicon codicon-layers"></span>
        Active Envelopes
      </h2>
      
      <div id="envelope-grid" class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px;"></div>
    </div>
  `

  const grid = container.querySelector('#envelope-grid')

  function renderEnvelopeCards() {
    const scenario = getScenario()
    const atHour = getTimeHour()
    const envelopes = scenario?.envelopes ?? []

    grid.innerHTML = envelopes.map((env) => {
      const effective = getEnvelopeAtTime(scenario, env.envelopeId, atHour) || env
      const status = getEnvelopeStatus(env, atHour)
      const statusIcon = status === 'active' ? 'pass-filled' : status === 'pending' ? 'clock' : 'circle-slash'
      const statusColor = status === 'active' ? 'var(--status-success)' : status === 'pending' ? 'var(--status-muted)' : 'var(--status-muted)'
      const statusLabel = status === 'active'
        ? 'Active at selected time'
        : status === 'pending'
          ? `Starts: ${formatSimTime(env.createdHour)}`
          : `Ended: ${formatSimTime(env.endHour)}`

      return `
        <div class="envelope-card" data-envelope="${env.envelopeId}" style="--envelope-accent: ${env.accent || 'var(--status-muted)'}; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px; cursor: pointer; transition: border-color 0.2s;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${env.envelopeId}</div>
              <h3 style="margin: 4px 0;">${env.name}</h3>
            </div>
            <span class="codicon codicon-${statusIcon}" style="color: ${statusColor};"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
            <span class="codicon codicon-person"></span>
            <span>${env.ownerRole}</span>
          </div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">${statusLabel}</div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">Window: ${formatSimTime(env.createdHour)} -> ${formatSimTime(env.endHour)}</div>
          <div style="display: flex; gap: 8px; font-size: 11px; flex-wrap: wrap;">
            <span style="background: var(--status-info); opacity: 0.2; padding: 2px 6px; border-radius: 3px;">${(effective.constraints ?? []).length} constraints</span>
            <span style="background: var(--status-muted); opacity: 0.2; padding: 2px 6px; border-radius: 3px;">${env.domain}</span>
          </div>
        </div>
      `
    }).join('')

    // Attach handlers
    const envelopeCards = container.querySelectorAll('.envelope-card')
    envelopeCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--status-info)'
      })
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--vscode-sideBar-border)'
      })
      card.addEventListener('click', (e) => {
        e.stopPropagation()
        const envelopeId = card.dataset.envelope
        const modal = createEnvelopeDetailModal(envelopeId)
        const app = document.querySelector('#app')
        app.appendChild(modal)
      })
    })
  }

  renderEnvelopeCards()

  const unsubScenario = onScenarioChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderEnvelopeCards()
  })
  const unsubTime = onTimeChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderEnvelopeCards()
  })

}
