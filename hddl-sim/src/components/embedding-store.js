// Embedding Vector Space Visualization Component

import { getScenario, getTimeHour, onTimeChange, onScenarioChange } from '../sim/sim-state'

/**
 * Create embedding vector space visualization
 * Shows embeddings being stored and retrieved from decision memory
 */
export function createEmbeddingStore() {
  const container = document.createElement('div')
  container.className = 'embedding-store'
  container.style.cssText = `
    background: var(--vscode-editor-background);
    border-top: 2px solid var(--vscode-panel-border);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 140px;
    position: relative;
    overflow: hidden;
  `

  const header = document.createElement('div')
  header.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--vscode-foreground); opacity: 0.9;'
  
  const headerIcon = document.createElement('span')
  headerIcon.className = 'codicon codicon-database'
  headerIcon.style.fontSize = '16px'
  
  const headerText = document.createElement('span')
  headerText.textContent = 'Embedding Vector Space'
  
  const headerBadge = document.createElement('span')
  headerBadge.className = 'embedding-count-badge'
  headerBadge.style.cssText = `
    background: color-mix(in srgb, var(--vscode-charts-blue) 20%, transparent);
    color: var(--vscode-charts-blue);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  `
  headerBadge.textContent = '0 vectors'
  
  header.appendChild(headerIcon)
  header.appendChild(headerText)
  header.appendChild(headerBadge)

  const visualSpace = document.createElement('div')
  visualSpace.className = 'embedding-visual-space'
  visualSpace.style.cssText = `
    flex: 1;
    background: color-mix(in srgb, var(--vscode-input-background) 50%, transparent);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    position: relative;
    min-height: 80px;
    overflow: hidden;
  `

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 100
  canvas.style.cssText = 'width: 100%; height: 100%; opacity: 0.3;'
  visualSpace.appendChild(canvas)

  // Draw subtle grid pattern
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--vscode-input-border')
    ctx.lineWidth = 0.5
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }
  }

  const embeddingContainer = document.createElement('div')
  embeddingContainer.className = 'embedding-icons-container'
  embeddingContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  `
  visualSpace.appendChild(embeddingContainer)

  container.appendChild(header)
  container.appendChild(visualSpace)

  // Track active embeddings
  let embeddingElements = []
  let embeddingCount = 0

  function createFloatingEmbedding(event, fromX, fromY) {
    const embeddingEl = document.createElement('div')
    embeddingEl.className = 'floating-embedding'
    embeddingEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="4">
        <rect x="40" y="40" width="120" height="120" rx="8" stroke-width="4"/>
        <line x1="70" y1="20" x2="70" y2="40"/>
        <circle cx="70" cy="10" r="6"/>
        <line x1="100" y1="20" x2="100" y2="40"/>
        <circle cx="100" cy="10" r="6"/>
        <line x1="130" y1="20" x2="130" y2="40"/>
        <circle cx="130" cy="10" r="6"/>
        <line x1="70" y1="160" x2="70" y2="180"/>
        <circle cx="70" cy="190" r="6"/>
        <line x1="100" y1="160" x2="100" y2="180"/>
        <circle cx="100" cy="190" r="6"/>
        <line x1="130" y1="160" x2="130" y2="180"/>
        <circle cx="130" cy="190" r="6"/>
        <line x1="20" y1="70" x2="40" y2="70"/>
        <circle cx="10" cy="70" r="6"/>
        <line x1="20" y1="100" x2="40" y2="100"/>
        <circle cx="10" cy="100" r="6"/>
        <line x1="20" y1="130" x2="40" y2="130"/>
        <circle cx="10" cy="130" r="6"/>
        <line x1="160" y1="70" x2="180" y2="70"/>
        <circle cx="190" cy="70" r="6"/>
        <line x1="160" y1="100" x2="180" y2="100"/>
        <circle cx="190" cy="100" r="6"/>
        <line x1="160" y1="130" x2="180" y2="130"/>
        <circle cx="190" cy="130" r="6"/>
        <text x="100" y="115" font-size="60" font-family="monospace" text-anchor="middle" fill="currentColor" stroke="none">&lt;/&gt;</text>
      </svg>
    `
    
    const targetX = Math.random() * 80 + 10 // 10-90% of width
    const targetY = Math.random() * 60 + 20 // 20-80% of height
    
    embeddingEl.style.cssText = `
      position: absolute;
      left: ${fromX}%;
      top: ${fromY}%;
      width: 24px;
      height: 24px;
      color: var(--vscode-charts-blue);
      opacity: 0;
      filter: drop-shadow(0 0 4px var(--vscode-charts-blue));
      transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    `
    
    embeddingContainer.appendChild(embeddingEl)
    
    // Trigger animation
    requestAnimationFrame(() => {
      embeddingEl.style.opacity = '0.8'
      embeddingEl.style.left = `${targetX}%`
      embeddingEl.style.top = `${targetY}%`
      embeddingEl.style.transform = 'scale(0.7)'
    })
    
    // Fade to permanent position
    setTimeout(() => {
      embeddingEl.style.opacity = '0.4'
      embeddingEl.style.transform = 'scale(0.6)'
    }, 1200)
    
    embeddingElements.push({
      element: embeddingEl,
      event: event,
      timestamp: Date.now()
    })
    
    embeddingCount++
    updateBadge()
    
    // Limit to 50 visible embeddings
    if (embeddingElements.length > 50) {
      const oldest = embeddingElements.shift()
      if (oldest && oldest.element.parentNode) {
        oldest.element.style.opacity = '0'
        setTimeout(() => {
          if (oldest.element.parentNode) {
            oldest.element.parentNode.removeChild(oldest.element)
          }
        }, 500)
      }
    }
  }

  function updateBadge() {
    headerBadge.textContent = `${embeddingCount} vector${embeddingCount !== 1 ? 's' : ''}`
  }

  function renderEmbeddings() {
    const scenario = getScenario()
    const currentHour = getTimeHour()
    
    if (!scenario) return
    
    // Clear existing
    embeddingContainer.innerHTML = ''
    embeddingElements = []
    embeddingCount = 0
    
    // Find all embedding events up to current time
    const embeddingEvents = scenario.events
      .filter(e => e.type === 'embedding' && e.hour <= currentHour)
      .sort((a, b) => a.hour - b.hour)
    
    embeddingEvents.forEach((event, index) => {
      const fromX = 50 // Start from center
      const fromY = -10 // Start above visible area
      
      setTimeout(() => {
        createFloatingEmbedding(event, fromX, fromY)
      }, index * 100) // Stagger animations
    })
  }

  // Re-render when time changes
  onTimeChange(() => {
    renderEmbeddings()
  })

  // Re-render when scenario changes
  onScenarioChange(() => {
    renderEmbeddings()
  })

  // Initial render
  renderEmbeddings()

  return container
}
