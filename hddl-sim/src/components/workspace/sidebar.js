// Sidebar navigation component
// Handles navigation menu, collapsible sections, and active envelope display

import { navigateTo } from '../../router'
import {
  formatSimTime,
  getBoundaryInteractionCounts,
  getEnvelopeStatus,
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
  getStewardFilter,
  onFilterChange,
  getEnvelopeAtTime,
  getRevisionDiffAtTime,
  setTimeHour
} from '../../sim/sim-state'
import { getStewardColor, toSemver } from '../../sim/steward-colors'
import { createEnvelopeDetailModal } from '../envelope-detail'
import { telemetrySectionState } from './state'
import {
  escapeHtml,
  escapeAttr,
  displayEnvelopeId,
  isNarratableEventType,
  buildNarrativeEventKey,
  narrativePrimaryObjectType,
  loadLayoutState,
  saveLayoutState
} from './utils'

// Navigation items configuration
const navItems = [
  // Primary
  { id: 'envelopes', label: 'Decision Envelopes', icon: 'shield', route: '/', section: 'primary' },
  { id: 'dts', label: 'Decision Telemetry System', icon: 'pulse', route: '/decision-telemetry', section: 'primary' },
  { id: 'stewardship', label: 'Stewards', icon: 'law', route: '/stewardship', section: 'primary' },

  // Secondary
  { id: 'fleets', label: 'Agent Fleets', icon: 'organization', route: '/steward-fleets', section: 'secondary' },
  { id: 'dsg-artifact', label: 'Domain Steward Group', icon: 'file-binary', route: '/dsg-event', section: 'secondary', disabled: true },
  { id: 'interactive', label: 'Interactive', icon: 'debug-start', route: '/interactive', section: 'secondary', disabled: true },

  // Reference
  { id: 'docs', label: 'Docs', icon: 'book', route: '/docs', section: 'reference' },
  { id: 'specification', label: 'Specification', icon: 'json', route: '/specification', section: 'reference' },
]

const sidebarSections = [
  { id: 'primary', title: 'Primary', icon: 'eye', collapsed: false },
  { id: 'secondary', title: 'Secondary', icon: 'layers', collapsed: true },
  { id: 'reference', title: 'Reference', icon: 'book', collapsed: true },
]

// Normalize route for comparison
const normalizeRoute = (route) => {
  const normalized = route.replace(/\/+$/, '').toLowerCase()
  return normalized === '' ? '/' : normalized
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

// Create sidebar with collapsible sections
function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.className = 'part sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('role', 'complementary');
  
  const header = document.createElement('div');
  header.className = 'composite title';
  header.style.cssText = 'padding: 8px 12px;';
  
  // Title and actions
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
  
  const title = document.createElement('h3');
  title.textContent = 'NAVIGATION';
  title.style.cssText = 'font-size: 11px; font-weight: 600; margin: 0;';
  
  const minimizeButton = document.createElement('a');
  minimizeButton.className = 'codicon codicon-chevron-left';
  minimizeButton.setAttribute('role', 'button');
  minimizeButton.setAttribute('aria-label', 'Minimize Panel');
  minimizeButton.style.cssText = 'cursor: pointer; padding: 4px;';
  minimizeButton.addEventListener('click', () => {
    setSidebarCollapsed(true);
  });
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(minimizeButton);
  
  header.appendChild(titleContainer);
  
  const content = document.createElement('div');
  content.className = 'content';
  
  const scrollableElement = document.createElement('div');
  scrollableElement.className = 'monaco-scrollable-element';
  
  const listContainer = document.createElement('div');
  listContainer.className = 'monaco-list';
  listContainer.setAttribute('role', 'tree');
  
  // Create sections
  sidebarSections.forEach(section => {
    const sectionHeader = createSectionHeader(section);
    listContainer.appendChild(sectionHeader);
    
    const sectionItems = navItems.filter(item => item.section === section.id);
    sectionItems.forEach(item => {
      const listRow = createListRow(item);
      listRow.dataset.section = section.id;
      // Set initial visibility based on section collapsed state
      listRow.style.display = section.collapsed ? 'none' : 'flex';
      listContainer.appendChild(listRow);
    });
  });

  // Envelope details collapsible section
  const envelopeSection = createCollapsibleEnvelopeSection()
  listContainer.appendChild(envelopeSection)
  
  scrollableElement.appendChild(listContainer);
  content.appendChild(scrollableElement);
  
  sidebar.appendChild(header);
  sidebar.appendChild(content);

  // Keep envelope section in sync with scenario/time/filter
  const rerenderEnvelope = () => {
    if (!sidebar.isConnected) return
    const scenario = getScenario()
    const timeHour = getTimeHour()
    const stewardFilter = getStewardFilter()
    renderEnvelopeDetails(envelopeSection, scenario, timeHour, stewardFilter)
  }

  rerenderEnvelope()
  onTimeChange(rerenderEnvelope)
  onScenarioChange(rerenderEnvelope)
  onFilterChange(rerenderEnvelope)
  
  return sidebar;
}

function createCollapsibleEnvelopeSection() {
  const root = document.createElement('div')
  root.className = 'sidebar-envelope-section'
  root.id = 'active-envelope-section'
  root.style.cssText = 'margin: 12px 0; padding: 0 12px; border-radius: 6px; transition: background-color 0.3s ease;'
  
  // Section header (collapsible)
  const header = document.createElement('div')
  header.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px 0; border-bottom: 1px solid var(--vscode-sideBar-border);'
  
  const chevron = document.createElement('span')
  chevron.className = `codicon codicon-chevron-${telemetrySectionState['Active Envelopes'] ? 'down' : 'right'}`
  chevron.style.cssText = 'font-size: 12px;'
  
  const icon = document.createElement('span')
  icon.className = 'codicon codicon-shield'
  icon.style.cssText = 'font-size: 14px;'
  
  const title = document.createElement('h3')
  title.textContent = 'Active Envelopes'
  title.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; flex: 1;'
  
  const meta = document.createElement('span')
  meta.className = 'sidebar-envelope__meta'
  meta.id = 'envelope-meta'
  meta.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'
  
  header.appendChild(chevron)
  header.appendChild(icon)
  header.appendChild(title)
  header.appendChild(meta)
  
  // Section content (collapsible)
  const content = document.createElement('div')
  content.className = 'sidebar-envelope__body'
  content.setAttribute('data-testid', 'envelope-details')
  content.style.cssText = telemetrySectionState['Active Envelopes'] ? 'display: block; padding-top: 8px;' : 'display: none;'
  
  // Toggle collapse on header click
  header.addEventListener('click', () => {
    telemetrySectionState['Active Envelopes'] = !telemetrySectionState['Active Envelopes']
    const isCollapsed = !telemetrySectionState['Active Envelopes']
    chevron.className = `codicon codicon-chevron-${isCollapsed ? 'right' : 'down'}`
    content.style.display = isCollapsed ? 'none' : 'block'
  })
  
  root.appendChild(header)
  root.appendChild(content)
  return root
}

function renderEnvelopeDetails(panelEl, scenario, timeHour, stewardFilter) {
  const body = panelEl.querySelector('.sidebar-envelope__body')
  const meta = panelEl.querySelector('#envelope-meta')
  if (!body) return

  const envelopes = scenario?.envelopes ?? []
  const activeEnvelopes = envelopes.filter(env => {
    const status = getEnvelopeStatus(env, timeHour)
    if (status !== 'active') return false
    if (stewardFilter && env.ownerRole !== stewardFilter) return false
    return true
  })

  // Update metadata count
  if (meta) {
    meta.textContent = `(${activeEnvelopes.length})`
  }

  if (activeEnvelopes.length === 0) {
    body.innerHTML = `<div style="padding: 12px 0; color: var(--vscode-descriptionForeground); font-size: 12px;">No active envelopes at ${formatSimTime(timeHour)}${stewardFilter ? ` for ${stewardFilter}` : ''}</div>`
    return
  }

  // Render each active envelope as a card
  body.innerHTML = ''
  activeEnvelopes.forEach(env => {
    const card = document.createElement('div')
    card.className = 'sidebar-envelope__card'
    card.style.cssText = `
      padding: 10px;
      margin-bottom: 8px;
      border-radius: 4px;
      background: color-mix(in srgb, ${getStewardColor(env.ownerRole)} 12%, var(--vscode-sideBar-background));
      border-left: 3px solid ${getStewardColor(env.ownerRole)};
      cursor: pointer;
      transition: all 0.2s ease;
    `

    // Hover effect
    card.addEventListener('mouseenter', () => {
      card.style.background = `color-mix(in srgb, ${getStewardColor(env.ownerRole)} 20%, var(--vscode-sideBar-background))`
    })
    card.addEventListener('mouseleave', () => {
      card.style.background = `color-mix(in srgb, ${getStewardColor(env.ownerRole)} 12%, var(--vscode-sideBar-background))`
    })

    // Click to show modal
    card.addEventListener('click', () => {
      createEnvelopeDetailModal(env, timeHour, scenario)
    })

    // Envelope ID + Name
    const header = document.createElement('div')
    header.style.cssText = 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;'

    const idEl = document.createElement('div')
    idEl.style.cssText = 'font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-foreground); opacity: 0.9;'
    idEl.textContent = displayEnvelopeId(env.id)

    const nameEl = document.createElement('div')
    nameEl.style.cssText = 'font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--vscode-foreground);'
    nameEl.textContent = env.name

    header.appendChild(idEl)
    header.appendChild(nameEl)

    // Owner role badge
    const ownerBadge = document.createElement('div')
    ownerBadge.style.cssText = `
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 6px;
      border-radius: 3px;
      background: ${getStewardColor(env.ownerRole)};
      color: var(--vscode-button-foreground);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    `
    ownerBadge.textContent = env.ownerRole

    // Version (semver if available)
    const versionEl = document.createElement('div')
    versionEl.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px;'
    const semver = toSemver(env.version)
    versionEl.innerHTML = `<span style="opacity: 0.7;">Version:</span> <code style="font-size: 10px; background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 50%, transparent); padding: 1px 4px; border-radius: 2px;">${semver}</code>`

    card.appendChild(header)
    card.appendChild(ownerBadge)
    card.appendChild(versionEl)

    body.appendChild(card)
  })
}

function createSectionHeader(section) {
  const header = document.createElement('div');
  header.className = 'monaco-list-row tree-explorer-viewlet-tree-view section-header';
  header.style.cssText = `
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-foreground);
    opacity: 0.85;
  `;
  header.dataset.section = section.id;
  
  const chevron = document.createElement('span');
  chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
  chevron.style.cssText = 'margin-right: 4px; font-size: 12px;';
  
  const icon = document.createElement('span');
  icon.className = `codicon codicon-${section.icon}`;
  icon.style.cssText = 'margin-right: 6px; font-size: 14px;';
  
  const title = document.createElement('span');
  title.textContent = section.title;
  
  header.appendChild(chevron);
  header.appendChild(icon);
  header.appendChild(title);
  
  // Toggle section collapse
  header.addEventListener('click', () => {
    section.collapsed = !section.collapsed;
    chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
    
    // Toggle visibility of items in this section
    const items = document.querySelectorAll(`[data-section="${section.id}"]`);
    items.forEach(item => {
      if (item !== header) {
        item.style.display = section.collapsed ? 'none' : 'flex';
      }
    });
  });
  
  return header;
}

function createListRow(item) {
  const row = document.createElement('div');
  row.className = 'monaco-list-row tree-explorer-viewlet-tree-view';
  row.style.cssText = `
    display: flex;
    align-items: center;
    padding: 6px 12px 6px 28px;
    cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
    opacity: ${item.disabled ? '0.5' : '1'};
    transition: background-color 0.1s ease;
  `;
  
  if (!item.disabled) {
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = '';
    });
  }
  
  const icon = document.createElement('span');
  icon.className = `codicon codicon-${item.icon}`;
  icon.style.cssText = 'margin-right: 6px; font-size: 16px;';
  
  const label = document.createElement('span');
  label.textContent = item.label;
  label.style.cssText = 'font-size: 13px;';
  
  row.appendChild(icon);
  row.appendChild(label);
  
  // Set active based on current route
  if (!item.disabled && normalizeRoute(window.location.pathname) === normalizeRoute(item.route)) {
    row.style.backgroundColor = 'var(--vscode-list-activeSelectionBackground)';
    row.style.color = 'var(--vscode-list-activeSelectionForeground)';
  }
  
  if (!item.disabled) {
    row.addEventListener('click', () => {
      navigateTo(item.route);
    });
  }
  
  return row;
}

// Export main API
export { createSidebar, navItems }
