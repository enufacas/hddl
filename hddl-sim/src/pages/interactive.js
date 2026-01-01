// Interactive Scenario Page (Phase 2 - Experimental)

export function render(container) {
  container.innerHTML = ''

  const root = document.createElement('div')
  root.className = 'page-container'
  root.innerHTML = `
    <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 24px;">
      <span class="codicon codicon-debug-start" style="font-size: 28px; opacity: 0.5;"></span>
      <div>
        <h1 style="margin: 0;">Interactive Scenario</h1>
        <p style="margin: 0; opacity: 0.7;">Action-driven scenario progression</p>
      </div>
    </div>

    <div style="padding: 24px; border: 1px solid var(--vscode-widget-border); border-radius: 6px; background: var(--vscode-editor-background); text-align: center;">
      <span class="codicon codicon-info" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;"></span>
      <h2 style="margin: 0 0 8px 0; font-size: 16px;">Not Yet Implemented</h2>
      <p style="margin: 0; opacity: 0.7; font-size: 13px;">
        Interactive scenario features are planned for a future release.<br>
        This will allow action-driven progression through scenarios with real-time decision-making.
      </p>
    </div>
  `

  container.appendChild(root)
}
