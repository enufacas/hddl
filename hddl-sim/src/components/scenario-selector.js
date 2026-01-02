import { getScenarioList, getCurrentScenarioId, setCurrentScenarioId, loadScenarioAsync } from '../sim/scenario-loader'
import { setScenario, setTimeHour } from '../sim/store'

export function createScenarioSelector() {
  const container = document.createElement('div')
  container.className = 'scenario-selector'
  
  const style = document.createElement('style')
  style.textContent = `
    .scenario-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      margin-left: 16px;
      padding: 4px 12px;
      background: color-mix(in srgb, var(--vscode-titleBar-activeForeground) 8%, var(--vscode-titleBar-activeBackground));
      border-radius: 4px;
      border: 2px solid var(--vscode-charts-blue);
      box-shadow: 0 0 8px 2px rgba(75, 150, 255, 0.4), 0 0 4px rgba(75, 150, 255, 0.3);
    }
    
    .scenario-selector-label {
      color: var(--vscode-titleBar-activeForeground);
      font-size: 11px;
      font-weight: 600;
      opacity: 1;
      white-space: nowrap;
    }
    
    .scenario-selector select {
      background: color-mix(in srgb, var(--vscode-titleBar-activeForeground) 12%, transparent);
      color: var(--vscode-titleBar-activeForeground);
      border: 2px solid var(--vscode-statusBar-foreground, #ffffff);
      border-radius: 3px;
      padding: 4px 26px 4px 10px;
      font-family: var(--vscode-font-family);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      min-width: 260px;
      appearance: none;
      color-scheme: dark;
      background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 3L5 6L8 3' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
    }
    
    .scenario-selector select option {
      background: #1e1e1e;
      color: #cccccc;
      padding: 6px 8px;
    }
    
    .scenario-selector select option:hover {
      background: #2a2d2e;
      color: #ffffff;
    }
    
    .scenario-selector select option:checked {
      background: #094771;
      color: #ffffff;
      font-weight: 600;
    }
    
    .scenario-selector select:hover {
      background: color-mix(in srgb, var(--vscode-titleBar-activeForeground) 18%, transparent);
      border-color: color-mix(in srgb, var(--vscode-titleBar-activeForeground) 35%, transparent);
    }
    
    .scenario-selector select:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
      background: color-mix(in srgb, var(--vscode-titleBar-activeForeground) 15%, transparent);
    }
    
    .scenario-selector-info {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .scenario-tag {
      display: inline-block;
      padding: 2px 6px;
      background: color-mix(in srgb, var(--vscode-charts-blue) 20%, transparent);
      border: 1px solid var(--vscode-charts-blue);
      border-radius: 3px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 600;
      color: var(--vscode-charts-blue);
    }
    
    .scenario-tag.safety-critical {
      background: color-mix(in srgb, var(--vscode-charts-red) 20%, transparent);
      border-color: var(--vscode-charts-red);
      color: var(--vscode-charts-red);
    }
    
    .scenario-tag.regulated {
      background: color-mix(in srgb, var(--vscode-charts-orange) 20%, transparent);
      border-color: var(--vscode-charts-orange);
      color: var(--vscode-charts-orange);
    }
    

  `
  container.appendChild(style)
  
  const label = document.createElement('span')
  label.className = 'scenario-selector-label'
  label.textContent = 'Scenario'
  
  const select = document.createElement('select')
  const scenarios = getScenarioList()
  const currentId = getCurrentScenarioId()
  
  scenarios.forEach(scenario => {
    const option = document.createElement('option')
    option.value = scenario.id
    option.textContent = scenario.title
    option.selected = scenario.id === currentId
    select.appendChild(option)
  })
  
  select.addEventListener('change', async (e) => {
    const newScenarioId = e.target.value
    setCurrentScenarioId(newScenarioId)
    
    // Show loading state
    select.disabled = true
    const originalText = select.options[select.selectedIndex].textContent
    select.options[select.selectedIndex].textContent = '⏳ Loading...'
    
    try {
      const scenarioData = await loadScenarioAsync(newScenarioId)
      setScenario(scenarioData)
      setTimeHour(0) // Reset timeline to start of new scenario
      
      // Restore select
      select.options[select.selectedIndex].textContent = originalText
      select.disabled = false
      
      // Show notification
      const notification = document.createElement('div')
      notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 12px 20px;
        background: var(--vscode-notifications-background);
        border: 1px solid var(--vscode-notifications-border);
        border-radius: 6px;
        color: var(--vscode-notifications-foreground);
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 12px;
        animation: slideInRight 0.3s ease-out;
      `
      const scenarioMeta = scenarios.find(s => s.id === newScenarioId)
      notification.textContent = `Loaded: ${scenarioMeta?.title || newScenarioId}`
      document.body.appendChild(notification)
      setTimeout(() => {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s'
        setTimeout(() => notification.remove(), 300)
      }, 2000)
    } catch (err) {
      console.error('Failed to load scenario:', err)
      select.options[select.selectedIndex].textContent = originalText
      select.disabled = false
      alert(`Failed to load scenario: ${err.message}`)
    }
  })
  
  container.appendChild(label)
  container.appendChild(select)
  
  // Listen for custom event to refresh the selector
  const refreshHandler = () => {
    const scenarios = getScenarioList()
    const currentId = getCurrentScenarioId()
    
    // Save current selection
    const previousValue = select.value
    
    // Rebuild options
    select.innerHTML = ''
    scenarios.forEach(scenario => {
      const option = document.createElement('option')
      option.value = scenario.id
      option.textContent = scenario.title
      option.selected = scenario.id === currentId
      select.appendChild(option)
    })
    
    // Restore or set current selection
    if (currentId && Array.from(select.options).some(opt => opt.value === currentId)) {
      select.value = currentId
    }
  }
  
  window.addEventListener('scenario-list-updated', refreshHandler)
  
  // Store cleanup function on the container
  container._cleanup = () => {
    window.removeEventListener('scenario-list-updated', refreshHandler)
  }
  
  return container
}
