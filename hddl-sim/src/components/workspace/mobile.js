import { navigateTo } from '../../router'
import { formatSimTime, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange } from '../../sim/sim-state'
import { getStewardColor, toSemver } from '../../sim/steward-colors'
import { navItems } from './sidebar'

export function createMobileNavDrawer() {
  const drawer = document.createElement('nav')
  drawer.className = 'mobile-nav-drawer'
  drawer.setAttribute('role', 'navigation')
  drawer.setAttribute('aria-label', 'Main navigation')

  const header = document.createElement('div')
  header.className = 'mobile-nav-header'
  header.innerHTML = `
    <div class="mobile-nav-brand">
      <span class="codicon codicon-pulse" style="font-size: 20px; color: var(--status-info);"></span>
      <span class="mobile-nav-title">Navigation</span>
    </div>
    <button class="mobile-nav-close" aria-label="Close navigation">
      <span class="codicon codicon-close"></span>
    </button>
  `

  header.querySelector('.mobile-nav-close').addEventListener('click', () => {
    document.body.classList.remove('mobile-nav-open')
  })

  const navContent = document.createElement('div')
  navContent.className = 'mobile-nav-content'

  const sections = {
    primary: { title: 'Primary Views', items: [] },
    secondary: { title: 'Secondary', items: [] },
    reference: { title: 'Reference', items: [] }
  }

  navItems.forEach(item => {
    if (sections[item.section]) {
      sections[item.section].items.push(item)
    }
  })

  Object.entries(sections).forEach(([, section]) => {
    if (section.items.length === 0) return

    const sectionEl = document.createElement('div')
    sectionEl.className = 'mobile-nav-section'

    const sectionTitle = document.createElement('div')
    sectionTitle.className = 'mobile-nav-section-title'
    sectionTitle.textContent = section.title
    sectionEl.appendChild(sectionTitle)

    const itemsList = document.createElement('ul')
    itemsList.className = 'mobile-nav-items'

    section.items.forEach(item => {
      const li = document.createElement('li')
      const link = document.createElement('a')
      link.className = 'mobile-nav-item'
      link.href = item.route
      link.dataset.route = item.route
      if (item.disabled) link.classList.add('disabled')
      if (item.experimental) link.classList.add('experimental')

      link.innerHTML = `
        <span class="codicon codicon-${item.icon}" aria-hidden="true"></span>
        <span class="mobile-nav-item-label">${item.label}</span>
        ${item.experimental ? '<span class="mobile-nav-badge">Beta</span>' : ''}
      `

      link.addEventListener('click', (e) => {
        e.preventDefault()
        if (item.disabled) return
        navigateTo(item.route)
        document.body.classList.remove('mobile-nav-open')
      })

      li.appendChild(link)
      itemsList.appendChild(li)
    })

    sectionEl.appendChild(itemsList)
    navContent.appendChild(sectionEl)
  })

  const footer = document.createElement('div')
  footer.className = 'mobile-nav-footer'
  footer.innerHTML = `
    <div class="mobile-nav-version">Simulation v1.0</div>
  `

  drawer.appendChild(header)
  drawer.appendChild(navContent)
  drawer.appendChild(footer)

  return drawer
}

export function createMobileNavOverlay() {
  const overlay = document.createElement('div')
  overlay.className = 'mobile-nav-overlay'
  overlay.setAttribute('aria-hidden', 'true')

  overlay.addEventListener('click', () => {
    document.body.classList.remove('mobile-nav-open')
  })

  return overlay
}

export function createMobileSidebarOverlay() {
  const overlay = document.createElement('div')
  overlay.className = 'mobile-sidebar-overlay'
  overlay.setAttribute('aria-hidden', 'true')

  overlay.addEventListener('click', () => {
    document.body.classList.remove('mobile-sidebar-open')
  })

  return overlay
}

export function createMobileBottomSheet() {
  const sheet = document.createElement('div')
  sheet.className = 'mobile-bottom-sheet'
  sheet.setAttribute('role', 'region')
  sheet.setAttribute('aria-label', 'Telemetry')

  const handle = document.createElement('div')
  handle.className = 'mobile-bottom-sheet-handle'
  handle.setAttribute('aria-label', 'Drag to expand')

  const tabs = [
    { id: 'envelope', label: 'Envelope' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'quality', label: 'Quality' },
    { id: 'stewardship', label: 'Stewards' },
  ]

  const tabsContainer = document.createElement('div')
  tabsContainer.className = 'mobile-bottom-sheet-tabs'
  tabsContainer.setAttribute('role', 'tablist')

  let activeTab = 'envelope'

  const content = document.createElement('div')
  content.className = 'mobile-bottom-sheet-content'
  content.setAttribute('role', 'tabpanel')

  tabs.forEach(tab => {
    const button = document.createElement('button')
    button.className = 'mobile-bottom-sheet-tab'
    button.textContent = tab.label
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-selected', tab.id === activeTab ? 'true' : 'false')
    button.dataset.tab = tab.id
    if (tab.id === activeTab) button.classList.add('active')

    button.addEventListener('click', () => {
      activeTab = tab.id
      tabsContainer.querySelectorAll('.mobile-bottom-sheet-tab').forEach(btn => {
        const isActive = btn.dataset.tab === tab.id
        btn.classList.toggle('active', isActive)
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false')
      })
      updateBottomSheetContent(content, tab.id)
    })

    tabsContainer.appendChild(button)
  })

  updateBottomSheetContent(content, activeTab)

  let startY = 0
  let currentY = 0
  let isDragging = false

  const handleStart = (y) => {
    startY = y
    currentY = y
    isDragging = true
    handle.style.cursor = 'grabbing'
  }

  const handleMove = (y) => {
    if (!isDragging) return
    currentY = y
    const deltaY = currentY - startY

    if (deltaY > 0) {
      sheet.style.transform = `translateY(calc(100% - 48px + ${Math.min(deltaY, 200)}px))`
    } else {
      sheet.style.transform = `translateY(${Math.max(deltaY, -50)}px)`
    }
  }

  const handleEnd = () => {
    if (!isDragging) return
    isDragging = false
    handle.style.cursor = 'grab'

    const deltaY = currentY - startY

    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        sheet.classList.remove('expanded')
        sheet.style.transform = ''
      } else {
        sheet.classList.add('expanded')
        sheet.style.transform = ''
      }
    } else {
      sheet.style.transform = ''
    }
  }

  handle.addEventListener('mousedown', (e) => handleStart(e.clientY))
  document.addEventListener('mousemove', (e) => handleMove(e.clientY))
  document.addEventListener('mouseup', handleEnd)

  handle.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientY)
      e.preventDefault()
    }
  })
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      handleMove(e.touches[0].clientY)
      e.preventDefault()
    }
  }, { passive: false })
  document.addEventListener('touchend', handleEnd)

  handle.addEventListener('click', () => {
    sheet.classList.toggle('expanded')
  })

  sheet.appendChild(handle)
  sheet.appendChild(tabsContainer)
  sheet.appendChild(content)

  onTimeChange(() => updateBottomSheetContent(content, activeTab))
  onScenarioChange(() => updateBottomSheetContent(content, activeTab))

  return sheet
}

function updateBottomSheetContent(container, tabId) {
  const scenario = getScenario()
  const timeHour = getTimeHour()
  const envelopes = scenario?.envelopes ?? []
  const activeEnvelopes = envelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')

  if (tabId === 'envelope') {
    if (activeEnvelopes.length === 0) {
      container.innerHTML = '<div style="color: var(--vscode-statusBar-foreground); text-align: center; padding: 20px;">No active envelopes</div>'
      return
    }

    container.innerHTML = activeEnvelopes.map(env => {
      const stewardColor = getStewardColor(env.ownerRole)
      return `
        <div style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${stewardColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${stewardColor}; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${env.name}</div>
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground);">${env.ownerRole}</div>
        </div>
      `
    }).join('')
  } else if (tabId === 'metrics') {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 12px; background: var(--vscode-sideBar-background); border-radius: 4px;">
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px;">ACTIVE</div>
          <div style="font-size: 20px; font-weight: 600;">${activeEnvelopes.length}</div>
        </div>
        <div style="padding: 12px; background: var(--vscode-sideBar-background); border-radius: 4px;">
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px;">TOTAL</div>
          <div style="font-size: 20px; font-weight: 600;">${envelopes.length}</div>
        </div>
      </div>
    `
  } else {
    container.innerHTML = '<div style="color: var(--vscode-statusBar-foreground); text-align: center; padding: 20px;">Coming soon</div>'
  }
}

export function createMobilePanelFAB() {
  const fab = document.createElement('button')
  fab.className = 'mobile-panel-fab'
  fab.setAttribute('aria-label', 'Open DTS Stream')
  fab.innerHTML = '<span class="codicon codicon-database"></span>'

  fab.addEventListener('click', () => {
    const modal = document.querySelector('.mobile-panel-modal')
    if (modal) {
      modal.classList.add('active')
      modal.style.display = 'flex'
    }
  })

  return fab
}

export function createMobilePanelModal() {
  const modal = document.createElement('div')
  modal.className = 'mobile-panel-modal'

  const content = document.createElement('div')
  content.className = 'mobile-panel-modal-content'

  const header = document.createElement('div')
  header.className = 'mobile-panel-modal-header'
  header.innerHTML = `
    <h3 style="margin: 0;">Decision Telemetry Stream</h3>
    <button class="codicon codicon-close" aria-label="Close" style="background: none; border: none; color: var(--vscode-editor-foreground); font-size: 20px; cursor: pointer; padding: 4px;"></button>
  `

  const body = document.createElement('div')
  body.className = 'mobile-panel-modal-body'
  body.style.padding = '0'
  body.style.overflow = 'auto'

  // Function to render DTS events
  function renderDTSContent() {
    const scenario = getScenario()
    const currentHour = getTimeHour()
    const allEvents = scenario?.events || []
    
    // Filter events up to current time and get most recent 20
    const recentEvents = allEvents
      .filter(event => event.hour === undefined || event.hour <= currentHour)
      .sort((a, b) => (b.hour || 0) - (a.hour || 0))
      .slice(0, 20)
    
    if (recentEvents.length === 0) {
      body.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--vscode-statusBar-foreground);">
          No events in timeline yet
        </div>
      `
      return
    }
    
    body.innerHTML = recentEvents.map(event => {
      const timestamp = event.hour !== undefined ? formatSimTime(event.hour) : '—'
      const eventType = event.type || 'unknown'
      const envelope = event.envelopeId || '—'
      
      // Actor with color
      const actorColor = event.actorRole ? getStewardColor(event.actorRole) : '#666'
      const actorDisplay = event.actorRole || '—'
      
      // Build message
      let message = event.label || event.detail || ''
      if (!message) {
        if (eventType === 'decision') {
          message = `Decision ${event.status || ''}`
        } else if (eventType === 'boundary_interaction') {
          message = `Boundary ${event.boundary_kind || 'interaction'}`
          if (event.reason) message += `: ${event.reason}`
        } else if (eventType === 'signal') {
          message = `Signal ${event.signalKey || ''}`
        } else if (eventType === 'revision') {
          const v = event.envelope_version
          message = v == null ? 'Revision' : `Revision v${toSemver(v)}`
        } else {
          message = eventType.replace('_', ' ')
        }
      }
      
      // Get type color
      const typeColors = {
        decision: 'var(--status-info)',
        boundary_interaction: 'var(--status-warning)',
        signal: 'var(--vscode-charts-blue)',
        revision: 'var(--vscode-charts-purple)',
        dsg_session: 'var(--status-error)',
        envelope_promoted: 'var(--status-success)'
      }
      const typeColor = typeColors[eventType] || 'var(--vscode-statusBar-foreground)'
      
      return `
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--vscode-sideBar-border); background: var(--vscode-editor-background);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: var(--vscode-statusBar-foreground);">${timestamp}</span>
            <span style="padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; text-transform: uppercase; background: color-mix(in srgb, ${typeColor} 25%, transparent); color: ${typeColor}; border: 1px solid ${typeColor};">
              ${eventType.replace('_', ' ')}
            </span>
          </div>
          <div style="font-size: 12px; margin-bottom: 4px; color: var(--vscode-editor-foreground);">
            ${message}
          </div>
          <div style="display: flex; gap: 12px; font-size: 11px; color: var(--vscode-statusBar-foreground);">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: ${actorColor};"></span>
              <span>${actorDisplay}</span>
            </div>
            <div style="color: var(--vscode-charts-purple); font-weight: 600;">${envelope}</div>
          </div>
        </div>
      `
    }).join('')
  }
  
  // Initial render
  renderDTSContent()
  
  // Listen for state changes
  const unsubscribeTime = onTimeChange(() => renderDTSContent())
  const unsubscribeScenario = onScenarioChange(() => renderDTSContent())
  
  content.appendChild(header)
  content.appendChild(body)
  modal.appendChild(content)

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active')
      setTimeout(() => modal.style.display = 'none', 300)
    }
  })

  header.querySelector('.codicon-close').addEventListener('click', () => {
    modal.classList.remove('active')
    setTimeout(() => modal.style.display = 'none', 300)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active')
      setTimeout(() => modal.style.display = 'none', 300)
    }
  })

  return modal
}
