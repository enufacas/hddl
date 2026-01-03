// Workspace layout component
import { navigateTo } from '../router';
import { formatSimTime, getBoundaryInteractionCounts, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange, getStewardFilter, onFilterChange, getEnvelopeAtTime, getRevisionDiffAtTime, setTimeHour } from '../sim/sim-state'
import { getCurrentScenarioId } from '../sim/scenario-loader'
import { initGlossaryInline } from './glossary'
import { getStewardColor, toSemver } from '../sim/steward-colors'
import { ResizablePanel, initPanelKeyboardShortcuts, PANEL_DEFAULTS, loadPanelWidth, savePanelWidth } from './resizable-panel'
import { createEnvelopeDetailModal } from './envelope-detail'
import { HDDL_GLOSSARY } from './workspace/glossary'
import {
  escapeHtml,
  escapeAttr,
  displayEnvelopeId,
  isNarratableEventType,
  buildNarrativeEventKey,
  narrativePrimaryObjectType,
  loadLayoutState,
  saveLayoutState,
  getDefaultLayoutState
} from './workspace/utils'
import { mountAINarrative } from './workspace/ai-narrative'
import { createSidebar, navItems } from './workspace/sidebar'
import { createActivityBar, createAuxiliaryBar, createBottomPanel, setAuxCollapsed, setBottomCollapsed, setUpdateTelemetry } from './workspace/panels'
import { telemetrySectionState } from './workspace/state'
import { updateTelemetry, computeTelemetry, buildTelemetryNarrative, createTelemetrySection } from './workspace/telemetry'

const STORAGE_KEY = 'hddl:layout'

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value)
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-hidden', Boolean(collapsed))
  
  // Remove inline CSS variable set by layout manager to let CSS rules take effect
  if (!collapsed) {
    document.documentElement.style.removeProperty('--sidebar-width')
  }
  
  const state = loadLayoutState()
  saveLayoutState({ ...state, sidebarCollapsed: Boolean(collapsed) })
}

// createSidebar, createCollapsibleEnvelopeSection, renderEnvelopeDetails extracted to workspace/sidebar.js

function createStewardFleetsPanel() {
  const root = document.createElement('div')
  root.className = 'sidebar-fleets'
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Steward fleets')
  root.innerHTML = `
    <div class="sidebar-fleets__hdr">
      <span class="codicon codicon-organization" aria-hidden="true"></span>
      <span class="sidebar-fleets__title">Steward Fleets</span>
      <span class="sidebar-fleets__meta" id="fleets-meta"></span>
    </div>
    <div class="sidebar-fleets__body" data-testid="steward-fleets"></div>
  `
  return root
}

function renderStewardFleets(panelEl, scenario, timeHour) {
  const body = panelEl.querySelector('.sidebar-fleets__body')
  const meta = panelEl.querySelector('#fleets-meta')
  if (!body) return

  const envelopes = scenario?.envelopes ?? []
  const fleets = Array.isArray(scenario?.fleets) ? scenario.fleets : []

  const activeEnvelopeIds = new Set(
    envelopes
      .filter(e => getEnvelopeStatus(e, timeHour) === 'active')
      .map(e => e.envelopeId)
      .filter(Boolean)
  )

  if (meta) meta.textContent = activeEnvelopeIds.size ? `Active @ t: ${activeEnvelopeIds.size}` : 'Active @ t: 0'

  if (!fleets.length) {
    body.innerHTML = `<div class="sidebar-fleets__empty">No fleet data in this scenario.</div>`
    return
  }

  body.innerHTML = fleets
    .map(fleet => {
      const stewardRole = fleet?.stewardRole || 'Steward'
      const agents = Array.isArray(fleet?.agents) ? fleet.agents : []
      const activeAgents = agents.filter(a => (a?.envelopeIds ?? []).some(id => activeEnvelopeIds.has(id))).length
      const anyActive = activeAgents > 0

      const chips = agents
        .map(agent => {
          const name = agent?.name || agent?.agentId || 'Agent'
          const agentId = agent?.agentId || name
          const envelopeIds = Array.isArray(agent?.envelopeIds) ? agent.envelopeIds : []
          const isActive = envelopeIds.some(id => activeEnvelopeIds.has(id))
          const title = envelopeIds.length
            ? `${name} - envelopes: ${envelopeIds.join(', ')}${agent?.role ? ` - ${agent.role}` : ''}`
            : `${name}${agent?.role ? ` - ${agent.role}` : ''}`

          return `
            <span
              class="fleet-agent ${isActive ? 'active' : ''}"
              data-agent-id="${escapeAttr(agentId)}"
              title="${escapeAttr(title)}"
              aria-label="${escapeAttr(name)}"
            >${escapeHtml(name)}</span>
          `
        })
        .join('')

      return `
        <div class="fleet-group ${anyActive ? 'active' : ''}" data-steward-role="${escapeAttr(stewardRole)}">
          <div class="fleet-group__hdr">
            <span class="fleet-group__name">${escapeHtml(stewardRole)}</span>
            <span class="fleet-group__count">${activeAgents}/${agents.length}</span>
          </div>
          <div class="fleet-group__chips">${chips || '<span class="sidebar-fleets__empty">No agents</span>'}</div>
        </div>
      `
    })
    .join('')
}

// Update view based on persona selection
function updatePersonaView(persona) {
  console.log('Viewing as:', persona);
  
  // Update auxiliary bar title and emphasis
  const auxTitle = document.querySelector('.auxiliarybar h3');
  if (auxTitle) {
    const personaTitles = {
      'domain-engineer': 'INCIDENT ALIGNMENT',
      'hr-steward': 'PEOPLE-AFFECTING DECISIONS',
      'customer-steward': 'TRUST & EXPERIENCE',
      'executive': 'RISK EXPOSURE',
      'data-steward': 'TELEMETRY BOUNDARIES'
    };
    auxTitle.textContent = personaTitles[persona] || 'AI NARRATIVE';
  }
  
  // Store selected persona for page rendering
  window.currentPersona = persona;
  
  // Trigger a visual update
  document.body.setAttribute('data-persona', persona);
}

// createAuxiliaryBar extracted to workspace/panels.js
// telemetrySectionState imported from workspace/state.js
// Telemetry functions extracted to workspace/telemetry.js

// Inject updateTelemetry into panels module (dependency injection pattern)
setUpdateTelemetry(updateTelemetry)

// Create complete workspace with resizable panels
export function createWorkspace() {
  const persisted = loadLayoutState()

  // Restore sizes first.
  if (typeof persisted.sidebarWidth === 'number') setCssVar('--sidebar-width', `${persisted.sidebarWidth}px`)
  if (typeof persisted.auxWidth === 'number') setCssVar('--auxiliarybar-width', `${persisted.auxWidth}px`)
  if (typeof persisted.panelHeight === 'number') setCssVar('--panel-height', `${persisted.panelHeight}px`)

  // AI Narrative panel: always default to open for desktop users.
  setAuxCollapsed(false)

  setSidebarCollapsed(persisted.sidebarCollapsed !== undefined ? persisted.sidebarCollapsed : false)
  // Always start with bottom panel collapsed (ignore persisted state).
  setBottomCollapsed(true)

  const workbench = document.createElement('div');
  workbench.className = 'split-view-container workbench';
  
  const activitybar = createActivityBar();
  const sidebar = createSidebar();
  
  // Resize handle between sidebar and editor
  const sash1 = createSash('vertical', 'sidebar-resize');
  
  const editorArea = document.createElement('div');
  editorArea.className = 'part editor editor-area';
  editorArea.id = 'editor-area';
  editorArea.setAttribute('role', 'main');

  // NOTE: Peek handles for collapsed panels are created by router.js after initial navigation
  // This ensures they persist across route changes
  
  // Resize handle between editor and auxiliary bar
  const sash2 = createSash('vertical', 'auxiliary-resize');
  
  // Create placeholder for auxiliary bar (will be populated lazily)
  const auxiliarybar = document.createElement('div')
  auxiliarybar.className = 'part auxiliarybar'
  auxiliarybar.style.display = 'none' // Hidden until populated

  // Resize handle between main area and bottom panel
  const sash3 = createSash('horizontal', 'panel-resize');

  const bottomPanel = createBottomPanel()
  
  workbench.appendChild(activitybar);
  workbench.appendChild(sidebar);
  workbench.appendChild(sash1);
  workbench.appendChild(editorArea);
  workbench.appendChild(sash2);
  workbench.appendChild(auxiliarybar);
  workbench.appendChild(sash3);
  workbench.appendChild(bottomPanel);

  // Add mobile components
  // NOTE: Mobile hamburger menu is now created in titlebar (main.js) for improved layout consistency
  const mobileNavDrawer = createMobileNavDrawer()
  const mobileNavOverlay = createMobileNavOverlay()
  const mobileSidebarOverlay = createMobileSidebarOverlay()
  const mobileBottomSheet = createMobileBottomSheet()
  const mobilePanelFAB = createMobilePanelFAB()
  const mobilePanelModal = createMobilePanelModal()
  
  document.body.appendChild(mobileNavDrawer)
  document.body.appendChild(mobileNavOverlay)
  document.body.appendChild(mobileSidebarOverlay)
  document.body.appendChild(mobileBottomSheet)
  document.body.appendChild(mobilePanelFAB)
  document.body.appendChild(mobilePanelModal)

  // Route-aware auto-open: Evidence now lives in the bottom panel.
  window.addEventListener('hddl:navigate', (e) => {
    const path = e?.detail?.path || window.location.pathname || '/'
    // Only auto-open if we are in review layout
    const activeLayout = localStorage.getItem('hddl:layout:active') || 'default'
    const isReviewMode = activeLayout === 'review'
    
    if (isReviewMode && (path === '/decision-telemetry' || path === '/dsg-event')) {
      setBottomCollapsed(false)
      document.querySelector('.panel-tab[data-tab="evidence"]')?.click()
    }
    // Close mobile nav on navigation
    document.body.classList.remove('mobile-nav-open')
    document.body.classList.remove('mobile-sidebar-open')
  })

  // Auto-open bottom panel during log-heavy flows (import/generation).
  // NOTE: No longer auto-open on playback — keep collapsed by default for cleaner view.
  window.addEventListener('hddl:log-heavy', () => {
    setBottomCollapsed(false)
  })
  
  // Initialize keyboard shortcuts for panel management
  initPanelKeyboardShortcuts({
    sidebar: {
      toggle: () => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const currentWidth = parseInt(getComputedStyle(sidebar).width);
        const config = PANEL_DEFAULTS.sidebar || { min: 180, default: 300 };
        const newWidth = currentWidth <= config.min + 20 ? config.default : config.min;
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      }
    },
    auxiliary: {
      toggle: () => {
        const isCollapsed = document.body.classList.contains('aux-hidden');
        setAuxCollapsed(!isCollapsed);
      }
    },
    bottom: {
      toggle: () => {
        const isCollapsed = document.body.classList.contains('panel-hidden');
        setBottomCollapsed(!isCollapsed);
      }
    }
  });
  
  // Lazy-load auxiliary bar after initial render (non-blocking)
  // This defers telemetry panel creation to improve initial load time
  setTimeout(() => {
    const auxBar = createAuxiliaryBar()
    const placeholder = document.querySelector('.part.auxiliarybar')
    if (placeholder && auxBar) {
      placeholder.replaceWith(auxBar)
    }
  }, 100) // Small delay after first paint
  
  return workbench;
}

// createBottomPanel extracted to workspace/panels.js

// Create mobile hamburger menu
function createMobileHamburger() {
  const hamburger = document.createElement('button')
  hamburger.className = 'mobile-hamburger'
  hamburger.setAttribute('aria-label', 'Open navigation menu')
  hamburger.innerHTML = '<span class="codicon codicon-menu"></span>'
  
  hamburger.addEventListener('click', () => {
    document.body.classList.toggle('mobile-nav-open')
  })
  
  return hamburger
}

// Create mobile navigation drawer (Google-style)
function createMobileNavDrawer() {
  const drawer = document.createElement('nav')
  drawer.className = 'mobile-nav-drawer'
  drawer.setAttribute('role', 'navigation')
  drawer.setAttribute('aria-label', 'Main navigation')
  
  // Header with logo and close button
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
  
  // Navigation sections
  const navContent = document.createElement('div')
  navContent.className = 'mobile-nav-content'
  
  // Group items by section
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
  
  // Render sections
  Object.entries(sections).forEach(([sectionId, section]) => {
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
  
  // Footer with version info
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

// Create mobile nav overlay
function createMobileNavOverlay() {
  const overlay = document.createElement('div')
  overlay.className = 'mobile-nav-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  
  overlay.addEventListener('click', () => {
    document.body.classList.remove('mobile-nav-open')
  })
  
  return overlay
}

// Create mobile sidebar overlay (legacy - kept for compatibility)
function createMobileSidebarOverlay() {
  const overlay = document.createElement('div')
  overlay.className = 'mobile-sidebar-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  
  overlay.addEventListener('click', () => {
    document.body.classList.remove('mobile-sidebar-open')
  })
  
  return overlay
}

// Create mobile bottom sheet for telemetry
function createMobileBottomSheet() {
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
  
  const content = document.createElement('div')
  content.className = 'mobile-bottom-sheet-content'
  content.setAttribute('role', 'tabpanel')
  
  updateBottomSheetContent(content, activeTab)
  
  // Swipe gesture handling
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
      // Dragging down
      sheet.style.transform = `translateY(calc(100% - 48px + ${Math.min(deltaY, 200)}px))`
    } else {
      // Dragging up
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
        // Swipe down - collapse
        sheet.classList.remove('expanded')
        sheet.style.transform = ''
      } else {
        // Swipe up - expand
        sheet.classList.add('expanded')
        sheet.style.transform = ''
      }
    } else {
      // Snap back
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
  
  // Click handle to toggle
  handle.addEventListener('click', () => {
    sheet.classList.toggle('expanded')
  })
  
  sheet.appendChild(handle)
  sheet.appendChild(tabsContainer)
  sheet.appendChild(content)
  
  // Update content when time or scenario changes
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
    container.innerHTML = `<div style="color: var(--vscode-statusBar-foreground); text-align: center; padding: 20px;">Coming soon</div>`
  }
}

// Create mobile panel FAB
function createMobilePanelFAB() {
  const fab = document.createElement('button')
  fab.className = 'mobile-panel-fab'
  fab.setAttribute('aria-label', 'Open panel')
  fab.innerHTML = '<span class="codicon codicon-terminal"></span>'
  
  fab.addEventListener('click', () => {
    const modal = document.querySelector('.mobile-panel-modal')
    if (modal) {
      modal.classList.add('active')
      modal.style.display = 'flex'
    }
  })
  
  return fab
}

// Create mobile panel modal
function createMobilePanelModal() {
  const modal = document.createElement('div')
  modal.className = 'mobile-panel-modal'
  
  const content = document.createElement('div')
  content.className = 'mobile-panel-modal-content'
  
  const header = document.createElement('div')
  header.className = 'mobile-panel-modal-header'
  header.innerHTML = `
    <h3 style="margin: 0;">Terminal</h3>
    <button class="codicon codicon-close" aria-label="Close" style="background: none; border: none; color: var(--vscode-editor-foreground); font-size: 20px; cursor: pointer; padding: 4px;"></button>
  `
  
  const body = document.createElement('div')
  body.className = 'mobile-panel-modal-body'
  body.innerHTML = '<div style="font-family: monospace; color: var(--vscode-statusBar-foreground);">Terminal output will appear here...</div>'
  
  content.appendChild(header)
  content.appendChild(body)
  modal.appendChild(content)
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active')
      setTimeout(() => modal.style.display = 'none', 300)
    }
  })
  
  // Close on button click
  header.querySelector('.codicon-close').addEventListener('click', () => {
    modal.classList.remove('active')
    setTimeout(() => modal.style.display = 'none', 300)
  })
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active')
      setTimeout(() => modal.style.display = 'none', 300)
    }
  })
  
  return modal
}

// Create resize handle (sash) with improved functionality
function createSash(orientation, id) {
  const sash = document.createElement('div');
  sash.className = `monaco-sash ${orientation}`;
  sash.id = id;
  sash.setAttribute('role', 'separator');
  sash.setAttribute('aria-orientation', orientation);
  sash.setAttribute('tabindex', '0');
  
  // No inline styles - let CSS handle positioning
  
  // State
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let ghostLine = null;
  let initialWidth = 0; // Store initial width on mousedown
  let initialHeight = 0; // Store initial height on mousedown
  
  function createGhostLine() {
    ghostLine = document.createElement('div');
    ghostLine.className = 'sash-ghost-line';
    ghostLine.style.cssText = orientation === 'vertical'
      ? 'position: fixed; top: 0; bottom: 0; width: 2px; background: var(--vscode-focusBorder, #1f6feb); z-index: 10000; pointer-events: none;'
      : 'position: fixed; left: 0; right: 0; height: 2px; background: var(--vscode-focusBorder, #1f6feb); z-index: 10000; pointer-events: none;';
    document.body.appendChild(ghostLine);
  }
  
  function updateGhostLine(pos) {
    if (!ghostLine) return;
    if (orientation === 'vertical') {
      ghostLine.style.left = `${pos}px`;
    } else {
      ghostLine.style.top = `${pos}px`;
    }
  }
  
  function removeGhostLine() {
    if (ghostLine) {
      ghostLine.remove();
      ghostLine = null;
    }
  }
  
  const handleMouseDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    sash.classList.add('active');
    document.body.classList.add('sash-dragging');
    if (orientation === 'horizontal') {
      document.body.classList.add('sash-horizontal-dragging');
    }
    
    // Capture initial sizes based on panel being resized
    if (id === 'sidebar-resize') {
      const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 300;
      initialWidth = currentWidth;
    } else if (id === 'auxiliary-resize') {
      const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--auxiliarybar-width')) || 350;
      initialWidth = currentWidth;
    } else if (id === 'panel-resize') {
      const currentHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-height')) || 240;
      initialHeight = currentHeight;
    }
    
    createGhostLine();
    updateGhostLine(orientation === 'vertical' ? e.clientX : e.clientY);
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    if (orientation === 'vertical') {
      updateGhostLine(e.clientX);
      
      if (id === 'sidebar-resize') {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 2000 };
        // Use initial width captured on mousedown
        const newWidth = Math.max(config.min, Math.min(config.max, initialWidth + deltaX));
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, sidebarWidth: newWidth });
        savePanelWidth('sidebar', newWidth);
      } else if (id === 'auxiliary-resize') {
        setAuxCollapsed(false);
        const auxiliary = document.querySelector('.auxiliarybar');
        if (!auxiliary) return;
        const config = PANEL_DEFAULTS.auxiliary || { min: 200, max: 2000 };
        // Use initial width captured on mousedown
        const newWidth = Math.max(config.min, Math.min(config.max, initialWidth - deltaX));
        auxiliary.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, auxWidth: newWidth, auxCollapsed: false });
        savePanelWidth('auxiliary', newWidth);
      }
      
      // Dispatch resize event for other components to react
      window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
        detail: { panel: id.replace('-resize', ''), orientation }
      }));
      
      // Dispatch resize event for other components to react
      window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
        detail: { panel: id.replace('-resize', ''), orientation }
      }));
    } else if (orientation === 'horizontal') {
      updateGhostLine(e.clientY);
      
      if (id === 'panel-resize') {
        setBottomCollapsed(false);
        const root = document.documentElement;
        const config = PANEL_DEFAULTS.bottom || { min: 100, max: 2000 };
        // Use initial height captured on mousedown
        const next = Math.max(config.min, Math.min(config.max, initialHeight - deltaY));
        root.style.setProperty('--panel-height', `${next}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, panelHeight: next, bottomCollapsed: false });
        savePanelWidth('bottom', next);
      }
      startY = e.clientY;
      
      window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
        detail: { panel: 'bottom', orientation }
      }));
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      sash.classList.remove('active');
      document.body.classList.remove('sash-dragging');
      document.body.classList.remove('sash-horizontal-dragging');
      removeGhostLine();
    }
  };
  
  // Double-click to collapse/expand
  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (id === 'sidebar-resize') {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      const currentWidth = parseInt(getComputedStyle(sidebar).width);
      const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 2000, default: 300 };
      // If close to min, expand to default; otherwise collapse to min
      const newWidth = currentWidth <= config.min + 20 ? config.default : config.min;
      sidebar.style.width = `${newWidth}px`;
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      const state = loadLayoutState();
      saveLayoutState({ ...state, sidebarWidth: newWidth });
    } else if (id === 'auxiliary-resize') {
      const auxiliary = document.querySelector('.auxiliarybar');
      if (!auxiliary) return;
      const isCollapsed = document.body.classList.contains('aux-hidden');
      if (isCollapsed) {
        setAuxCollapsed(false);
      } else {
        setAuxCollapsed(true);
      }
    } else if (id === 'panel-resize') {
      const isCollapsed = document.body.classList.contains('panel-hidden');
      setBottomCollapsed(!isCollapsed);
    }
  };
  
  // Keyboard support
  const handleKeyDown = (e) => {
    const step = e.shiftKey ? 50 : 10;
    let delta = 0;
    
    if (orientation === 'vertical') {
      if (e.key === 'ArrowLeft') delta = -step;
      else if (e.key === 'ArrowRight') delta = step;
    } else {
      if (e.key === 'ArrowUp') delta = -step;
      else if (e.key === 'ArrowDown') delta = step;
    }
    
    if (delta !== 0) {
      e.preventDefault();
      if (id === 'sidebar-resize') {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const currentWidth = parseInt(getComputedStyle(sidebar).width);
        const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 2000 };
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth + delta));
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      } else if (id === 'auxiliary-resize') {
        const auxiliary = document.querySelector('.auxiliarybar');
        if (!auxiliary) return;
        setAuxCollapsed(false);
        const currentWidth = parseInt(getComputedStyle(auxiliary).width);
        const config = PANEL_DEFAULTS.auxiliary || { min: 200, max: 2000 };
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth - delta));
        auxiliary.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);
      } else if (id === 'panel-resize') {
        setBottomCollapsed(false);
        const root = document.documentElement;
        const currentRaw = getComputedStyle(root).getPropertyValue('--panel-height').trim();
        const current = Number.parseInt(currentRaw || '240', 10);
        const config = PANEL_DEFAULTS.bottom || { min: 100, max: 2000 };
        const next = Math.max(config.min, Math.min(config.max, current - delta));
        root.style.setProperty('--panel-height', `${next}px`);
      }
    }
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDoubleClick(e);
    }
  };
  
  sash.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  sash.addEventListener('dblclick', handleDoubleClick);
  sash.addEventListener('keydown', handleKeyDown);
  
  // Touch support
  sash.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    isDragging = true;
    startX = touch.clientX;
    startY = touch.clientY;
    sash.classList.add('active');
    document.body.classList.add('sash-dragging');
    createGhostLine();
    updateGhostLine(orientation === 'vertical' ? touch.clientX : touch.clientY);
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    // Simulate mouse move
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
    updateGhostLine(orientation === 'vertical' ? touch.clientX : touch.clientY);
  }, { passive: false });
  
  document.addEventListener('touchend', handleMouseUp);
  document.addEventListener('touchcancel', handleMouseUp);
  
  sash.addEventListener('mouseenter', () => sash.classList.add('hover'));
  sash.addEventListener('mouseleave', () => {
    if (!isDragging) sash.classList.remove('hover');
  });
  
  return sash;
}

// Update active state when route changes
export function updateActiveNav(route) {
  const current = normalizeRoute(route);

  // Update activity bar
  document.querySelectorAll('.activity-item').forEach(item => {
    const itemRoute = normalizeRoute(item.dataset.route || item.querySelector('.action-label')?.dataset.route || '/');
    const isActive = itemRoute === current;
    item.classList.toggle('active', isActive);
    item.classList.toggle('checked', isActive);
  });
  
  // Update sidebar nav
  document.querySelectorAll('.monaco-list-row[data-route]').forEach(row => {
    const rowRoute = normalizeRoute(row.dataset.route || '/');
    const isSelected = rowRoute === current;
    row.classList.toggle('selected', isSelected);
    row.classList.toggle('focused', isSelected);
    row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
}

function normalizeRoute(pathname) {
  if (!pathname) return '/'
  const noQuery = String(pathname).split('?')[0].split('#')[0]
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1)
  return noQuery
}

// Refresh telemetry (can be called periodically)
export function refreshTelemetry() {
  const content = document.querySelector('.terminal-output[data-terminal="evidence"]')
  if (!content) return
  updateTelemetry(content, getScenario(), getTimeHour())
}
