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

  const effectiveStewardFilter = (stewardFilter && stewardFilter !== 'all')
    ? stewardFilter
    : null

  const envelopes = scenario?.envelopes ?? []
  const filteredEnvelopes = effectiveStewardFilter
    ? envelopes.filter(env => env.ownerRole === effectiveStewardFilter)
    : envelopes
  const activeEnvelopes = filteredEnvelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')

  // Update metadata count
  if (meta) meta.textContent = activeEnvelopes.length ? `${activeEnvelopes.length}` : '0'

  if (!activeEnvelopes.length) {
    body.innerHTML = `<div class="sidebar-envelope__empty">No active envelopes at ${escapeHtml(formatSimTime(timeHour))}${effectiveStewardFilter ? ` for ${escapeHtml(effectiveStewardFilter)}` : ''}.</div>`
    return
  }

  // Helper to get prohibited constraints
  const getProhibitedConstraints = (constraints) => {
    const items = Array.isArray(constraints) ? constraints : []
    return items.filter(c => {
      const s = String(c || '')
      return s.startsWith('No ') || s.includes('Not permitted') || s.startsWith('Human-only') || s.includes('Human-only')
    })
  }

  // Render boundary badges
  const renderBoundaryBadges = (envelopeId) => {
    const boundary = getBoundaryInteractionCounts(scenario, timeHour, 24)
    const bucket = boundary?.byEnvelope?.get?.(envelopeId)
    if (!bucket) return ''
    const escalated = bucket.escalated ?? 0
    const overridden = bucket.overridden ?? 0
    const deferred = bucket.deferred ?? 0
    if (!escalated && !overridden && !deferred) return ''

    const parts = []
    if (escalated) parts.push(`<span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-warning); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Boundary escalations (last 24h)">Esc ${escalated}</span>`)
    if (overridden) parts.push(`<span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-error); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Boundary overrides (last 24h)">Ovr ${overridden}</span>`)
    if (deferred) parts.push(`<span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-info); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Boundary deferrals (last 24h)">Def ${deferred}</span>`)
    return parts.join('')
  }

  // Render all active envelopes using the original rich card template
  body.innerHTML = activeEnvelopes.map(env => {
    const effective = getEnvelopeAtTime(scenario, env.envelopeId, timeHour) || env
    const statusIcon = 'pass-filled'
    const statusColor = 'var(--status-success)'
    const statusLabel = 'Active at selected time'

    const version = effective?.envelope_version ?? 1
    const baseVersion = env?.envelope_version ?? 1
    const semver = toSemver(version)
    const isVersionBumped = version > baseVersion
    const revisionId = effective?.revision_id || '-'

    const prohibitedAll = getProhibitedConstraints(effective?.constraints)
    const hardStopCount = prohibitedAll.length
    const hardStopPreview = prohibitedAll.slice(0, 3)
    const boundaryBadges = renderBoundaryBadges(env.envelopeId)

    // Get steward color for visual correlation with map
    const stewardColor = getStewardColor(env.ownerRole)
    const borderStyle = `3px solid ${stewardColor}`
    const accentBar = `<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${stewardColor}; border-radius: 6px 0 0 6px;"></div>`

    // Version badge with bump indicator
    const versionBadge = isVersionBumped
      ? `<span style="background: var(--status-warning); color: var(--vscode-editor-background); padding: 2px 6px; border-radius: 3px; font-weight: 600;">⚡ v${escapeHtml(semver)}</span>`
      : `<span style="padding: 2px 6px;">v${escapeHtml(semver)}</span>`

    return `
      <div class="envelope-card" data-envelope="${escapeAttr(env.envelopeId)}" data-steward-color="${escapeAttr(stewardColor)}" style="--envelope-accent: ${stewardColor}; position: relative; background: var(--vscode-sideBar-background); border: ${borderStyle}; padding: 12px; padding-left: 16px; border-radius: 6px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 12px;">
        ${accentBar}
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${escapeHtml(displayEnvelopeId(env.envelopeId))}</div>
            <h3 style="margin: 4px 0; font-size: 13px;">${escapeHtml(env.name)}</h3>
            <div style="display:flex; gap: 10px; flex-wrap: wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">
              ${versionBadge}
              <span>rev: ${escapeHtml(revisionId)}</span>
            </div>
          </div>
          <span class="codicon codicon-${statusIcon}" style="color: ${statusColor};"></span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${stewardColor};"></span>
          <span>${escapeHtml(env.ownerRole)}</span>
        </div>
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">${statusLabel}</div>
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">Window: ${escapeHtml(formatSimTime(env.createdHour))} -> ${escapeHtml(formatSimTime(env.endHour))}</div>
        <div style="display: flex; gap: 6px; font-size: 11px; flex-wrap: wrap;">
          <span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-info); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Total constraints">${(effective.constraints ?? []).length} constraints</span>
          <span style="border: 1px solid var(--vscode-sideBar-border); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Domain">${escapeHtml(env.domain)}</span>
          ${hardStopCount ? `<span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-warning); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="${escapeAttr(`Hard stop constraints:\n${hardStopPreview.join('\n')}${hardStopCount > hardStopPreview.length ? `\n+${hardStopCount - hardStopPreview.length} more` : ''}`)}">Hard stops: ${hardStopCount}</span>` : ''}
          ${boundaryBadges ? `<span>${boundaryBadges}</span>` : ''}
        </div>
      </div>
    `
  }).join('')

  // Attach handlers for hover and click
  const envelopeCards = body.querySelectorAll('.envelope-card')
  envelopeCards.forEach(card => {
    const stewardColor = card.dataset.stewardColor || 'var(--status-info)'
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = stewardColor
      card.style.boxShadow = `0 0 8px ${stewardColor}40`
    })
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = stewardColor
      card.style.boxShadow = 'none'
    })
    card.addEventListener('click', (e) => {
      e.stopPropagation()
      const envelopeId = card.dataset.envelope
      const modal = createEnvelopeDetailModal(envelopeId)
      const app = document.querySelector('#app')
      if (app) app.appendChild(modal)
    })
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
