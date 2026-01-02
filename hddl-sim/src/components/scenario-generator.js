import { setScenario, setTimeHour } from '../sim/store'
import { registerGeneratedScenario } from '../sim/scenario-loader'

/**
 * Creates a toast notification for non-blocking status updates
 * @param {string} message - The message to display
 * @param {string} type - 'loading', 'success', or 'error'
 * @returns {HTMLElement} The toast element
 */
function createToast(message, type = 'loading') {
  const toast = document.createElement('div')
  toast.className = `scenario-toast scenario-toast-${type}`
  toast.innerHTML = `
    <div class="scenario-toast-content">
      ${type === 'loading' ? '<span class="scenario-toast-spinner">⟳</span>' : ''}
      <span class="scenario-toast-message">${message}</span>
    </div>
  `
  
  // Add to body
  document.body.appendChild(toast)
  
  // Trigger fade-in
  setTimeout(() => toast.classList.add('scenario-toast-visible'), 10)
  
  return toast
}

/**
 * Updates an existing toast notification
 * @param {HTMLElement} toast - The toast element
 * @param {string} message - New message
 * @param {string} type - 'loading', 'success', or 'error'
 */
function updateToast(toast, message, type) {
  toast.className = `scenario-toast scenario-toast-${type} scenario-toast-visible`
  toast.innerHTML = `
    <div class="scenario-toast-content">
      <span class="scenario-toast-message">${message}</span>
    </div>
  `
}

export function createScenarioGeneratorButton() {
  const button = document.createElement('button')
  button.innerHTML = `
    <span class="codicon codicon-sparkle"></span>
    <span class="scenario-gen-button-text">Generate Scenario</span>
  `
  button.className = 'scenario-gen-button'
  button.title = 'Generate a new scenario from a prompt'
  
  const style = document.createElement('style')
  style.textContent = `
    .scenario-gen-button {
      display: flex;
      align-items: center;
      gap: 6px;
      background: color-mix(in srgb, var(--vscode-button-background) 90%, transparent);
      color: var(--vscode-button-foreground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      padding: 6px 12px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .scenario-gen-button:hover {
      background: var(--vscode-button-hoverBackground);
      border-color: var(--vscode-button-border, var(--vscode-button-hoverBackground));
    }
    
    .scenario-gen-button:active {
      transform: translateY(1px);
    }
    
    .scenario-gen-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    }
    
    .scenario-gen-modal {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    
    .scenario-gen-modal h2 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-editor-foreground);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .scenario-gen-form-group {
      margin-bottom: 16px;
    }
    
    .scenario-gen-label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-editor-foreground);
    }
    
    .scenario-gen-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      box-sizing: border-box;
    }
    
    .scenario-gen-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder);
    }
    
    .scenario-gen-textarea {
      min-height: 100px;
      resize: vertical;
      font-family: var(--vscode-font-family);
    }
    
    .scenario-gen-select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      cursor: pointer;
    }
    
    .scenario-gen-select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    
    .scenario-gen-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    
    .scenario-gen-button-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .scenario-gen-button-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }
    
    .scenario-gen-button-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .scenario-gen-button-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .scenario-gen-button-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    
    .scenario-gen-status {
      margin-top: 16px;
      padding: 16px;
      border-radius: 4px;
      font-size: 13px;
    }
    
    .scenario-gen-status-loading {
      background: color-mix(in srgb, var(--vscode-button-background) 15%, transparent);
      border: 1px solid var(--vscode-button-background);
      color: var(--vscode-button-background);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .scenario-gen-status-success {
      background: color-mix(in srgb, var(--vscode-charts-green) 15%, transparent);
      border: 1px solid var(--vscode-charts-green);
      color: var(--vscode-charts-green);
    }
    
    .scenario-gen-status-error {
      background: color-mix(in srgb, var(--vscode-charts-red) 15%, transparent);
      border: 1px solid var(--vscode-charts-red);
      color: var(--vscode-charts-red);
    }
    
    .scenario-gen-status-warning {
      background: color-mix(in srgb, var(--vscode-charts-orange) 15%, transparent);
      border: 1px solid var(--vscode-charts-orange);
      color: var(--vscode-charts-orange);
    }
    
    .scenario-gen-loading-header {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
    }
    
    .scenario-gen-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid var(--vscode-button-background);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    
    .scenario-gen-progress-bar {
      width: 100%;
      height: 4px;
      background: color-mix(in srgb, var(--vscode-button-background) 20%, transparent);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .scenario-gen-progress-fill {
      height: 100%;
      background: var(--vscode-button-background);
      border-radius: 2px;
      animation: progressPulse 2s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes progressPulse {
      0% { width: 0%; opacity: 0.6; }
      50% { width: 70%; opacity: 1; }
      100% { width: 95%; opacity: 0.8; }
    }
    
    .scenario-gen-hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    
    .scenario-gen-examples {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    
    .scenario-gen-example {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .scenario-gen-example:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    
    /* Toast notification styles */
    .scenario-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 300px;
      max-width: 400px;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      z-index: 10001;
    }
    
    .scenario-toast-visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .scenario-toast-loading {
      background: color-mix(in srgb, var(--vscode-button-background) 90%, var(--vscode-editor-background));
      border: 1px solid var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .scenario-toast-success {
      background: color-mix(in srgb, var(--vscode-charts-green) 20%, var(--vscode-editor-background));
      border: 1px solid var(--vscode-charts-green);
      color: var(--vscode-charts-green);
    }
    
    .scenario-toast-error {
      background: color-mix(in srgb, var(--vscode-charts-red) 20%, var(--vscode-editor-background));
      border: 1px solid var(--vscode-charts-red);
      color: var(--vscode-charts-red);
    }
    
    .scenario-toast-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .scenario-toast-spinner {
      display: inline-block;
      animation: scenario-toast-spin 1s linear infinite;
      font-size: 16px;
    }
    
    @keyframes scenario-toast-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  
  // Remove existing styles if present and re-add to ensure latest version loads
  const existingStyle = document.querySelector('style[data-scenario-gen]')
  if (existingStyle) {
    existingStyle.remove()
  }
  style.setAttribute('data-scenario-gen', 'true')
  document.head.appendChild(style)
  
  button.addEventListener('click', () => {
    showScenarioGeneratorModal()
  })
  
  return button
}

function showScenarioGeneratorModal() {
  const overlay = document.createElement('div')
  overlay.className = 'scenario-gen-modal-overlay'
  
  const modal = document.createElement('div')
  modal.className = 'scenario-gen-modal'
  
  modal.innerHTML = `
    <h2>
      <span class="codicon codicon-sparkle"></span>
      Generate Scenario
    </h2>
    
    <div class="scenario-gen-form-group">
      <label class="scenario-gen-label" for="scenario-prompt">
        What scenario would you like to create?
      </label>
      <textarea 
        id="scenario-prompt" 
        class="scenario-gen-input scenario-gen-textarea" 
        placeholder="E.g., 'You're a Safety Steward at SpaceX managing cargo drones' or 'Agricultural robots in rural Kenya' or 'Hospital ER in São Paulo where AI triages patients' or 'Wall Street trading desk, 1980s style but with modern AI'…"
      ></textarea>
      <div class="scenario-gen-hint">
        Keep it simple and just name an industry, or get more detailed with a time period, specific company, actors, and decision patterns. Start with the big picture, then add what agents decide, when they escalate, and who oversees them.
      </div>
    </div>
    
    <div class="scenario-gen-actions">
      <button class="scenario-gen-button-secondary" id="cancel-generate">
        Cancel
      </button>
      <button class="scenario-gen-button-primary" id="start-generate">
        <span class="codicon codicon-sparkle"></span>
        Generate
      </button>
    </div>
    
    <div id="scenario-gen-status" style="display: none;"></div>
  `
  
  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  
  // Focus the textarea
  const promptInput = modal.querySelector('#scenario-prompt')
  promptInput.focus()
  
  // Cancel button
  modal.querySelector('#cancel-generate').addEventListener('click', () => {
    overlay.remove()
  })
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove()
    }
  })
  
  // Generate button
  const generateBtn = modal.querySelector('#start-generate')
  generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim()
    
    if (prompt.length < 10) {
      showStatus('error', 'Please enter a more detailed prompt (at least 10 characters)')
      return
    }
    
    // Close modal immediately and show toast
    overlay.remove()
    
    const toast = createToast('Generating scenario with AI...', 'loading')
    
    try {
      const response = await fetch('http://localhost:8080/generate-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ prompt })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Generation failed')
      }
      
      const result = await response.json()
      
      // Update toast to success
      updateToast(toast, `✓ Scenario generated: ${result.scenario.title}`, 'success')
      
      // Register the scenario
      const scenarioId = registerGeneratedScenario(result.scenario)
      
      // Load the scenario into the sim
      setScenario(result.scenario)
      setTimeHour(0)
      
      // Refresh the scenario selector dropdown
      window.dispatchEvent(new CustomEvent('scenario-list-updated'))
      
      // Auto-close toast after 3 seconds
      setTimeout(() => toast.remove(), 3000)
      
    } catch (error) {
      console.error('Scenario generation error:', error)
      updateToast(toast, `✗ Error: ${error.message}`, 'error')
      // Keep error toast visible longer
      setTimeout(() => toast.remove(), 5000)
    }
  })
  
  function showStatus(type, message) {
    const statusEl = modal.querySelector('#scenario-gen-status')
    if (!statusEl) return
    
    statusEl.style.display = 'block'
    statusEl.className = `scenario-gen-status scenario-gen-status-${type}`
    
    // Use requestAnimationFrame to ensure the DOM has updated before setting innerHTML
    requestAnimationFrame(() => {
      if (type === 'loading') {
        statusEl.innerHTML = '<div class="scenario-gen-loading-header"><span class="scenario-gen-spinner"></span><span>' + message + '</span></div><div class="scenario-gen-progress-bar"><div class="scenario-gen-progress-fill"></div></div>'
      } else {
        const icon = type === 'success' ? 'check' : type === 'error' ? 'error' : 'warning'
        statusEl.innerHTML = `<span class="codicon codicon-${icon}"></span> ${message}`
      }
    })
  }
}

function showNotification(message) {
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--vscode-notifications-background);
    color: var(--vscode-notifications-foreground);
    border: 1px solid var(--vscode-notifications-border);
    border-radius: 4px;
    padding: 12px 16px;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    animation: slideIn 0.3s ease;
  `
  notification.innerHTML = `
    <span class="codicon codicon-check" style="color: var(--vscode-charts-green); margin-right: 8px;"></span>
    ${message}
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease'
    setTimeout(() => notification.remove(), 300)
  }, 4000)
}
