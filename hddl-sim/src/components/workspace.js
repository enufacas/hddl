// Workspace layout component
import { navigateTo } from '../router';
import { formatSimTime, getBoundaryInteractionCounts, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange, getStewardFilter, onFilterChange, getEnvelopeAtTime, getRevisionDiffAtTime } from '../sim/sim-state'
import { initGlossaryInline } from './glossary'
import { getStewardColor, toSemver } from '../sim/steward-colors'
import { ResizablePanel, initPanelKeyboardShortcuts, PANEL_DEFAULTS, loadPanelWidth, savePanelWidth } from './resizable-panel'

const STORAGE_KEY = 'hddl:layout'

function loadLayoutState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveLayoutState(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value)
}

function setAuxCollapsed(collapsed) {
  document.body.classList.toggle('aux-hidden', Boolean(collapsed))
  const state = loadLayoutState()
  saveLayoutState({ ...state, auxCollapsed: Boolean(collapsed) })
}

function setBottomCollapsed(collapsed) {
  document.body.classList.toggle('panel-hidden', Boolean(collapsed))
  const state = loadLayoutState()
  saveLayoutState({ ...state, bottomCollapsed: Boolean(collapsed) })
}

// Activity bar icons (primary lenses)
const activityBarItems = [
  { id: 'envelopes', icon: 'shield', label: 'Decision Envelopes', route: '/' },
  { id: 'dts', icon: 'pulse', label: 'Decision Telemetry System', route: '/decision-telemetry' },
  { id: 'stewardship', icon: 'law', label: 'Stewards', route: '/stewardship' },
]

const navItems = [
  // Primary
  { id: 'envelopes', label: 'Decision Envelopes', icon: 'shield', route: '/', section: 'primary' },
  { id: 'dts', label: 'Decision Telemetry System', icon: 'pulse', route: '/decision-telemetry', section: 'primary' },
  { id: 'stewardship', label: 'Stewards', icon: 'law', route: '/stewardship', section: 'primary' },

  // Secondary
  { id: 'fleets', label: 'Agent Fleets', icon: 'organization', route: '/steward-fleets', section: 'secondary' },
  { id: 'dsg-artifact', label: 'DSG Artifact', icon: 'file-binary', route: '/dsg-event', section: 'secondary' },
  { id: 'interactive', label: 'Interactive', icon: 'debug-start', route: '/interactive', section: 'secondary', experimental: true },

  // Reference
  { id: 'docs', label: 'Docs', icon: 'book', route: '/docs', section: 'reference' },
  { id: 'specification', label: 'Specification', icon: 'json', route: '/specification', section: 'reference' },
  { id: 'authority', label: 'Authority Order', icon: 'law', route: '/authority', section: 'reference', disabled: true },
]

const sidebarSections = [
  { id: 'primary', title: 'Primary', icon: 'eye', collapsed: false },
  { id: 'secondary', title: 'Secondary', icon: 'layers', collapsed: false },
  { id: 'reference', title: 'Reference', icon: 'book', collapsed: true },
]

// Create activity bar
function createActivityBar() {
  const activitybar = document.createElement('div');
  activitybar.className = 'part activitybar';
  activitybar.setAttribute('role', 'navigation');
  
  const actionBar = document.createElement('div');
  actionBar.className = 'monaco-action-bar';
  
  const actionsContainer = document.createElement('ul');
  actionsContainer.className = 'actions-container';
  actionsContainer.setAttribute('role', 'toolbar');
  
  activityBarItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'action-item activity-item';
    li.setAttribute('role', 'presentation');
    li.dataset.route = item.route;
    
    const button = document.createElement('a');
    button.className = 'action-label';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', item.label);
    button.setAttribute('tabindex', '0');
    button.title = item.label;
    button.dataset.route = item.route;
    
    const icon = document.createElement('span');
    icon.className = `codicon codicon-${item.icon}`;
    button.appendChild(icon);
    
    // Set active based on current route
    if (normalizeRoute(window.location.pathname) === normalizeRoute(item.route)) {
      li.classList.add('active', 'checked');
    }
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.route);
    });
    
    li.appendChild(button);
    actionsContainer.appendChild(li);
  });
  
  actionBar.appendChild(actionsContainer);
  activitybar.appendChild(actionBar);
  
  return activitybar;
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
  title.textContent = 'HDDL SIMULATION';
  title.style.cssText = 'font-size: 11px; font-weight: 600; margin: 0;';
  
  const actionButton = document.createElement('a');
  actionButton.className = 'codicon codicon-ellipsis';
  actionButton.setAttribute('role', 'button');
  actionButton.setAttribute('aria-label', 'More Actions');
  actionButton.style.cssText = 'cursor: pointer; padding: 4px;';
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(actionButton);
  
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
  chevron.className = `codicon codicon-chevron-${telemetrySectionState['Active Envelope'] ? 'down' : 'right'}`
  chevron.style.cssText = 'font-size: 12px;'
  
  const icon = document.createElement('span')
  icon.className = 'codicon codicon-shield'
  icon.style.cssText = 'font-size: 14px;'
  
  const title = document.createElement('h3')
  title.textContent = 'Active Envelope'
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
  content.style.cssText = telemetrySectionState['Active Envelope'] ? 'display: block; padding-top: 8px;' : 'display: none;'
  
  // Toggle collapse on header click
  header.addEventListener('click', () => {
    telemetrySectionState['Active Envelope'] = !telemetrySectionState['Active Envelope']
    const isCollapsed = !telemetrySectionState['Active Envelope']
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
  const filteredEnvelopes = stewardFilter === 'all'
    ? envelopes
    : envelopes.filter(env => env.ownerRole === stewardFilter)
  
  const activeEnvelopes = filteredEnvelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')
  
  if (meta) meta.textContent = activeEnvelopes.length ? `${activeEnvelopes.length}` : '0'

  if (!activeEnvelopes.length) {
    body.innerHTML = `<div class="sidebar-envelope__empty">No active envelopes at current time.</div>`
    // Clear background tint when no active envelope
    const sectionEl = body.closest('.sidebar-envelope-section')
    if (sectionEl) {
      sectionEl.style.backgroundColor = ''
      sectionEl.style.borderLeft = ''
    }
    return
  }

  // Clear section-level tint (we'll tint each envelope card individually)
  const sectionEl = body.closest('.sidebar-envelope-section')
  if (sectionEl) {
    sectionEl.style.backgroundColor = ''
    sectionEl.style.borderLeft = ''
  }

  // Render all active envelopes with their steward colors
  body.innerHTML = activeEnvelopes.map(envelope => {
    const effective = getEnvelopeAtTime(scenario, envelope.envelopeId, timeHour) || envelope
    const currentVersion = effective?.envelope_version ?? 1
    const baseVersion = envelope?.envelope_version ?? 1
    const semver = toSemver(currentVersion)
    const isVersionBumped = currentVersion > baseVersion
    const boundary = getBoundaryInteractionCounts(scenario, timeHour, 24)
    const boundaryBucket = boundary?.byEnvelope?.get?.(envelope.envelopeId)
    const boundaryEscalated = boundaryBucket?.escalated ?? 0
    const boundaryOverridden = boundaryBucket?.overridden ?? 0
    const boundaryDeferred = boundaryBucket?.deferred ?? 0

    const diff = getRevisionDiffAtTime(scenario, envelope.envelopeId, timeHour)
    const hasChanges = diff && ((diff.assumptions?.added?.length ?? 0) > 0 || (diff.assumptions?.removed?.length ?? 0) > 0 || (diff.constraints?.added?.length ?? 0) > 0 || (diff.constraints?.removed?.length ?? 0) > 0)

    const stewardColor = getStewardColor(envelope.ownerRole)
    
    // Version badge with bump indicator
    const versionBadge = isVersionBumped
      ? `<span style="background: var(--status-warning); color: var(--vscode-editor-background); padding: 3px 8px; border-radius: 3px; font-weight: 600;">↑ v${semver}</span>`
      : `<span style="background: var(--vscode-badge-background); padding: 3px 8px; border-radius: 3px;">v${semver}</span>`

    return `
      <div class="envelope-detail-compact" style="margin-bottom: 16px; padding: 12px; border-radius: 6px; background: color-mix(in srgb, ${stewardColor} 10%, var(--vscode-sideBar-background)); border-left: 3px solid ${stewardColor};">
        <div class="envelope-header" style="margin-bottom: 12px;">
          <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${envelope.envelopeId}</div>
          <div style="font-size: 14px; font-weight: 600; margin: 4px 0;">${envelope.name}</div>
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${stewardColor};"></span>
            <span>${envelope.ownerRole}</span>
          </div>
        </div>

        <div style="margin-bottom: 12px; padding: 8px; background: var(--vscode-input-background); border-radius: 4px; font-size: 11px;">
          <div style="color: var(--vscode-statusBar-foreground); margin-bottom: 4px;">Domain: ${envelope.domain || '-'}</div>
          <div style="color: var(--vscode-statusBar-foreground);">Window: ${formatSimTime(envelope.createdHour ?? 0)} → ${formatSimTime(envelope.endHour ?? 48)}</div>
        </div>

        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 600; color: var(--vscode-statusBar-foreground); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Version Info</div>
          <div style="display: flex; gap: 8px; font-size: 11px;">
            ${versionBadge}
            ${hasChanges ? '<span style="background: var(--status-warning); opacity: 0.2; padding: 3px 8px; border-radius: 3px;">Revised</span>' : ''}
          </div>
        </div>

        ${(boundaryEscalated + boundaryOverridden + boundaryDeferred) > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11px; font-weight: 600; color: var(--vscode-statusBar-foreground); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Boundary (24h)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px;">
              ${boundaryEscalated ? `<span style="background: var(--status-warning); opacity: 0.2; padding: 3px 6px; border-radius: 3px;">Esc: ${boundaryEscalated}</span>` : ''}
              ${boundaryOverridden ? `<span style="background: var(--status-error); opacity: 0.2; padding: 3px 6px; border-radius: 3px;">Ovr: ${boundaryOverridden}</span>` : ''}
              ${boundaryDeferred ? `<span style="background: var(--status-info); opacity: 0.2; padding: 3px 6px; border-radius: 3px;">Def: ${boundaryDeferred}</span>` : ''}
            </div>
          </div>
        ` : ''}

        <div style="margin-bottom: 8px;">
          <div style="font-size: 11px; font-weight: 600; color: var(--vscode-statusBar-foreground); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Assumptions</div>
          <div style="font-size: 11px; line-height: 1.4;">
            ${(effective.assumptions ?? []).slice(0, 3).map(a => `<div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #00bcd4;">${escapeHtml(String(a))}</div>`).join('') || '<div style="color: var(--vscode-statusBar-foreground);">No assumptions</div>'}
            ${(effective.assumptions ?? []).length > 3 ? `<div style="color: var(--vscode-statusBar-foreground); font-size: 10px; margin-top: 4px;">+${(effective.assumptions ?? []).length - 3} more</div>` : ''}
          </div>
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 600; color: var(--vscode-statusBar-foreground); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Constraints</div>
          <div style="font-size: 11px; line-height: 1.4;">
            ${(effective.constraints ?? []).slice(0, 3).map(c => `<div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #ff6b6b;">${escapeHtml(String(c))}</div>`).join('') || '<div style="color: var(--vscode-statusBar-foreground);">No constraints</div>'}
            ${(effective.constraints ?? []).length > 3 ? `<div style="color: var(--vscode-statusBar-foreground); font-size: 10px; margin-top: 4px;">+${(effective.constraints ?? []).length - 3} more</div>` : ''}
          </div>
        </div>
      </div>
    `
  }).join('')
}

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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;')
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
    auxTitle.textContent = personaTitles[persona] || 'EVIDENCE (BOUNDED)';
  }
  
  // Store selected persona for page rendering
  window.currentPersona = persona;
  
  // Trigger a visual update
  document.body.setAttribute('data-persona', persona);
}

// Create collapsible section header
function createSectionHeader(section) {
  const header = document.createElement('div');
  header.className = 'monaco-list-row section-header';
  header.style.cssText = 'padding: 4px 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 4px;';
  header.dataset.sectionId = section.id;
  
  const chevron = document.createElement('span');
  chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
  chevron.style.cssText = 'font-size: 14px;';
  
  const icon = document.createElement('span');
  icon.className = `codicon codicon-${section.icon}`;
  icon.style.cssText = 'font-size: 16px;';
  
  const text = document.createElement('span');
  text.textContent = section.title;
  
  header.appendChild(chevron);
  header.appendChild(icon);
  header.appendChild(text);
  
  header.addEventListener('click', () => {
    section.collapsed = !section.collapsed;
    chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
    
    // Toggle section items visibility
    const items = document.querySelectorAll(`[data-section="${section.id}"]`);
    items.forEach(item => {
      item.style.display = section.collapsed ? 'none' : 'flex';
    });
  });
  
  return header;
}

// Create list row for navigation item
function createListRow(item) {
  const row = document.createElement('div');
  row.className = 'monaco-list-row';
  row.dataset.route = item.route;
  row.setAttribute('role', 'treeitem');
  row.setAttribute('tabindex', '0');
  
  // Set active based on current route
  if (normalizeRoute(window.location.pathname) === normalizeRoute(item.route)) {
    row.classList.add('focused', 'selected');
    row.setAttribute('aria-selected', 'true');
  }
  
  const icon = document.createElement('span');
  icon.className = `nav-item-icon codicon codicon-${item.icon}`;
  
  const label = document.createElement('span');
  label.textContent = item.label;
  
  // Mark experimental items
  if (item.experimental) {
    label.style.opacity = '0.75';
    label.style.color = 'var(--vscode-statusBar-foreground)';
    row.title = 'Experimental: Phase 2 feature';
  }
  
  // Mark disabled items
  if (item.disabled) {
    row.style.opacity = '0.4';
    row.style.cursor = 'default';
    row.title = 'Coming soon';
  }
  
  row.appendChild(icon);
  row.appendChild(label);
  
  row.addEventListener('click', () => {
    if (!item.disabled) {
      navigateTo(item.route);
    }
  });
  
  return row;
}

// Create auxiliary bar with collapsible telemetry sections
function createAuxiliaryBar() {
  const auxiliarybar = document.createElement('div');
  auxiliarybar.className = 'part auxiliarybar';
  auxiliarybar.id = 'auxiliarybar';
  auxiliarybar.setAttribute('role', 'complementary');
  
  const header = document.createElement('div');
  header.className = 'composite title';
  
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
  
  const title = document.createElement('h3');
  title.textContent = 'EVIDENCE (BOUNDED)';
  title.style.cssText = 'font-size: 11px; font-weight: 600; margin: 0;';
  
  const toggleButton = document.createElement('a');
  toggleButton.className = 'codicon codicon-close';
  toggleButton.setAttribute('role', 'button');
  toggleButton.setAttribute('aria-label', 'Close Panel');
  toggleButton.style.cssText = 'cursor: pointer; padding: 4px;';
  toggleButton.addEventListener('click', () => {
    setAuxCollapsed(true)
  });
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(toggleButton);
  header.appendChild(titleContainer);
  
  const content = document.createElement('div');
  content.className = 'content auxiliary-content';
  content.id = 'auxiliarybar-content';
  
  // Initial telemetry + reactive updates
  const rerender = () => {
    const scenario = getScenario()
    const timeHour = getTimeHour()
    updateTelemetry(content, scenario, timeHour)
  }

  rerender()
  onTimeChange(() => {
    if (!content.isConnected) return
    rerender()
  })
  onScenarioChange(() => {
    if (!content.isConnected) return
    rerender()
  })
  onFilterChange(() => {
    if (!content.isConnected) return
    rerender()
  })
  
  auxiliarybar.appendChild(header);
  auxiliarybar.appendChild(content);
  
  return auxiliarybar;
}

// Update telemetry display with collapsible sections
const telemetrySectionState = {
  'Active Envelope': true,
  'Live Metrics': true,
  'Decision Quality': true,
  'Stewardship': true,
  'Boundary Interactions': true,
  'Steward Fleets': false, // Collapsed by default
}

const telemetryNarrativeState = {
  lastTimeHour: null,
  lastUpdatedAtMs: 0,
}

function displayEnvelopeId(envelopeId) {
  return String(envelopeId || '').replace(/^ENV-/, 'DE-')
}

function isNarratableEventType(type) {
  return [
    'envelope_promoted',
    'signal',
    'boundary_interaction',
    'escalation',
    'revision',
    'dsg_session',
    'dsg_message',
    'annotation',
    'decision',
  ].includes(String(type || ''))
}

function buildNarrativeEventKey(e, index) {
  const t = String(e?.type || 'event')
  const h = typeof e?.hour === 'number' ? String(e.hour).replace('.', '_') : 'na'
  const env = String(e?.envelopeId || e?.envelope_id || e?.sessionId || 'na')
  return `${t}:${h}:${env}:${index}`
}

function narrativePrimaryObjectType(e) {
  const type = String(e?.type || '')
  if (type === 'decision') return 'decision'
  if (type === 'revision') return 'revision'
  if (type === 'boundary_interaction' || type === 'escalation') return 'exception'
  if (type === 'dsg_session' || type === 'dsg_message') return 'dsg'
  if (type === 'signal') return 'signal'
  if (type === 'annotation') return 'memory'
  // annotations are evidence on an envelope
  return 'envelope'
}

function narrativeObjectColor(objectType) {
  // Use distinct event colors (different from steward palette)
  // Matches EVENT_COLORS in steward-colors.js
  if (objectType === 'decision') return '#a8a8a8'    // Neutral gray
  if (objectType === 'revision') return '#98d4a0'   // Mint green
  if (objectType === 'exception') return '#e8846c'  // Salmon - blocked/warning
  if (objectType === 'signal') return '#7eb8da'     // Light steel blue
  if (objectType === 'dsg') return '#f0b866'        // Amber - DSG/boundary
  if (objectType === 'memory') return '#c4a7e7'     // Lavender - annotations
  return 'var(--status-muted)'                      // envelope fallback
}

function formatNarrativeLine(e, envelopeIndex, eventById) {
  const type = String(e?.type || 'event')
  const envId = e?.envelopeId || e?.envelope_id
  const env = envId ? envelopeIndex.get(envId) : null
  const envLabel = envId ? displayEnvelopeId(envId) : null
  const envName = env?.name || null
  const envPhrase = envLabel && envName
    ? `<strong>${envLabel}</strong> (${envName})`
    : envLabel
      ? `<strong>${envLabel}</strong>`
      : '<strong>active authority</strong>'

  if (type === 'envelope_promoted') {
    return `Envelope promoted: ${envPhrase} is now an active <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>.`
  }

  if (type === 'signal') {
    const sev = e?.severity || 'info'
    const label = e?.label || 'Telemetry signal'
    const key = e?.signalKey ? String(e.signalKey) : null
    const value = typeof e?.value === 'number' ? String(e.value) : null
    const meta = (key || value) ? ` <span style="opacity:0.8">(${[key, value].filter(Boolean).join(' · ')})</span>` : ''
    return `<a class="glossary-term" href="#" data-glossary-term="Decision Telemetry">Decision Telemetry</a> (${sev}) — <strong>Signal: ${label}</strong>${meta} in ${envPhrase}.`
  }

  if (type === 'boundary_interaction') {
    const kind = e?.boundary_kind || e?.boundaryKind || e?.status || 'touched'
    const actor = e?.actorRole || 'a Steward'
    return `<a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a> <strong>${kind}</strong> in ${envPhrase} → routed to <strong>${actor}</strong>.`
  }

  if (type === 'escalation') {
    const actor = e?.actorRole || 'a Steward'
    const label = e?.label || 'Escalation requested'
    return `<strong>${actor}</strong> requested <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">escalation</a> in ${envPhrase}: <strong>${label}</strong>.`
  }

  if (type === 'revision') {
    const actor = e?.actorRole || 'a Steward'
    const resolvesId = e?.resolvesEventId
    const resolved = resolvesId && eventById ? eventById.get(resolvesId) : null
    const resolvedLabel = resolved?.label ? ` (<strong>${resolved.label}</strong>)` : ''
    const resolvedSuffix = resolved
      ? ` This <strong>addresses</strong> the earlier <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a> escalation${resolvedLabel}.`
      : ''
    return `<strong>${actor}</strong> issued a <a class="glossary-term" href="#" data-glossary-term="Revision">Revision</a> to ${envPhrase}, changing the bounds agents can execute within.${resolvedSuffix}`
  }

  if (type === 'dsg_session') {
    return `<a class="glossary-term" href="#" data-glossary-term="DSG (Decision Stewardship Group)">DSG</a> session opened affecting ${envPhrase} (cross-domain arbitration).`
  }

  if (type === 'dsg_message') {
    const author = e?.authorRole || 'DSG'
    const kind = e?.kind ? ` (${String(e.kind)})` : ''
    return `<a class="glossary-term" href="#" data-glossary-term="DSG (Decision Stewardship Group)">DSG</a> message from <strong>${author}</strong>${kind} affecting ${envPhrase}.`
  }

  if (type === 'annotation') {
    return `Recorded precedent / <a class="glossary-term" href="#" data-glossary-term="Decision Memory">Decision Memory</a> note for ${envPhrase}.`
  }

  if (type === 'decision') {
    const status = e?.status || 'executed'
    const agent = e?.agentId ? `<strong>${e.agentId}</strong>` : 'An agent'
    const label = e?.label ? String(e.label) : null
    const labelPhrase = label ? ` <strong>Decision: ${label}</strong>.` : ''
    if (status === 'blocked' || status === 'denied') {
      const actor = e?.actorRole || 'a Steward'
      return `${agent} attempted a decision in ${envPhrase} but it was <strong>blocked</strong>.${labelPhrase} Escalated to <strong>${actor}</strong>.`
    }
    return `${agent} executed a decision in ${envPhrase} within bounds.${labelPhrase} (status: <strong>${status}</strong>).`
  }

  return `Event <strong>${type}</strong> in ${envPhrase}.`
}

function buildTelemetryNarrative(scenario, timeHour) {
  const nowMs = Date.now()
  const lastTime = telemetryNarrativeState.lastTimeHour
  const lastMs = telemetryNarrativeState.lastUpdatedAtMs || nowMs
  telemetryNarrativeState.lastTimeHour = timeHour
  telemetryNarrativeState.lastUpdatedAtMs = nowMs

  const delta = typeof lastTime === 'number' ? (timeHour - lastTime) : 0
  const dir = delta > 0 ? 'forward' : delta < 0 ? 'rewind' : 'steady'
  const dtMs = Math.max(1, nowMs - lastMs)
  const ratePerSec = Math.abs(delta) / (dtMs / 1000)

  const modeLabel = dir === 'rewind'
    ? (ratePerSec > 1.0 ? 'Rewinding fast' : 'Rewinding')
    : dir === 'forward'
      ? (ratePerSec > 1.0 ? 'Fast-forwarding' : 'Replaying')
      : 'Paused'

  const events = scenario?.events ?? []
  const envelopes = scenario?.envelopes ?? []
  const envelopeIndex = new Map(envelopes.map(e => [e.envelopeId, e]))
  const eventById = new Map(events.map(e => [e?.eventId, e]).filter(([k]) => Boolean(k)))

  // Filter envelopes based on steward filter
  const stewardFilter = getStewardFilter()
  const filteredEnvelopes = stewardFilter === 'all'
    ? envelopes
    : envelopes.filter(env => env.ownerRole === stewardFilter)
  const filteredEnvelopeIds = new Set(filteredEnvelopes.map(e => e.envelopeId))

  const windowStart = Math.max(0, timeHour - 48)
  const recent = events
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => e && typeof e.hour === 'number' && e.hour <= timeHour && e.hour >= windowStart)
    .filter(({ e }) => isNarratableEventType(e.type))
    // Filter to only events related to filtered envelopes
    .filter(({ e }) => {
      const envId = e.envelopeId || e.envelope_id
      return !envId || filteredEnvelopeIds.has(envId)
    })
    // Newest first (teaching-friendly: what just happened is on top).
    .sort((a, b) => (b.e.hour - a.e.hour))

  const lines = recent.map(({ e, idx }) => {
    const key = buildNarrativeEventKey(e, idx)
    const time = formatSimTime(e.hour)
    const text = formatNarrativeLine(e, envelopeIndex, eventById)
    const objectType = narrativePrimaryObjectType(e)
    const color = narrativeObjectColor(objectType)
    // Get steward color from envelope's ownerRole
    const envId = e.envelopeId || e.envelope_id
    const env = envId ? envelopeIndex.get(envId) : null
    const stewardColor = env?.ownerRole ? getStewardColor(env.ownerRole) : null
    return { key, hour: e.hour, time, html: text, objectType, color, stewardColor }
  })

  const activeEnvelopes = filteredEnvelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')
  const activeCount = activeEnvelopes.length

  const learnMore = `
    <span style="color: var(--vscode-statusBar-foreground);">
      Key terms:
      <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>,
      <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a>,
      <a class="glossary-term" href="#" data-glossary-term="Revision">Revision</a>,
      <a class="glossary-term" href="#" data-glossary-term="DSG (Decision Stewardship Group)">DSG</a>,
      <a class="glossary-term" href="#" data-glossary-term="Decision Telemetry">Decision Telemetry</a>
    </span>
  `.trim()

  const statusLine = `
    <div style="display:flex; align-items:center; justify-content: space-between; gap: 10px;">
      <div style="display:flex; align-items:center; gap: 8px; min-width: 0;">
        <span class="codicon codicon-history" style="color: var(--vscode-statusBar-foreground);"></span>
        <span style="font-size: 12px; font-weight: 700;">${modeLabel}</span>
        <span style="font-size: 11px; color: var(--vscode-statusBar-foreground);">at ${formatSimTime(timeHour)}</span>
      </div>
      <span style="font-size: 11px; color: var(--vscode-statusBar-foreground);">Active envelopes: ${activeCount}</span>
    </div>
  `.trim()

  const body = `
    <div style="margin-top: 10px; display:flex; flex-direction: column; gap: 8px; font-size: 12px; line-height: 1.35;">
      ${lines.length ? lines.map(l => `
        <div data-narrative-key="${l.key}" style="display:flex; gap: 10px; align-items: flex-start; padding: 6px 8px; border-radius: 4px; ${l.stewardColor ? `background: color-mix(in srgb, ${l.stewardColor} 8%, transparent); border-left: 3px solid ${l.stewardColor};` : 'border-left: 3px solid transparent;'}">
          <div style="flex-shrink: 0; width: 10px; padding-top: 4px;">
            <div title="${l.objectType}" style="width: 7px; height: 7px; border-radius: 99px; background: ${l.color}; opacity: 0.95;"></div>
          </div>
          <div style="flex-shrink: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 10px; color: var(--vscode-statusBar-foreground); padding-top: 2px;">${l.time}</div>
          <div style="min-width: 0;">${l.html}</div>
        </div>
      `.trim()).join('') : `
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">No events yet in this replay window. Agents execute inside active <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelopes</a>.</div>
      `.trim()}
    </div>
    <div style="margin-top: 12px; font-size: 11px;">
      ${learnMore}
    </div>
  `.trim()

  const accent = dir === 'rewind' ? 'var(--status-info)' : dir === 'forward' ? 'var(--status-success)' : 'var(--status-muted)'

  return {
    html: `${statusLine}${body}`,
    accent,
    dir,
  }
}

function updateTelemetry(container, scenario, timeHour) {
  let narrativeEl = container.querySelector('#telemetry-narrative')
  let glossaryPanel = container.querySelector('#glossary-inline-aux')
  let sectionsWrap = container.querySelector('#telemetry-sections')

  if (!narrativeEl || !glossaryPanel || !sectionsWrap) {
    container.innerHTML = ''
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.gap = '12px'
    container.style.minHeight = '0'

    narrativeEl = document.createElement('div')
    narrativeEl.id = 'telemetry-narrative'
    narrativeEl.style.cssText = `background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 8px; min-height: 280px; flex: 3 1 0; overflow: auto;`;
    container.appendChild(narrativeEl)

    glossaryPanel = document.createElement('div')
    glossaryPanel.id = 'glossary-inline-aux'
    glossaryPanel.style.cssText = 'display:none; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 12px; border-radius: 6px;'
    container.appendChild(glossaryPanel)

    sectionsWrap = document.createElement('div')
    sectionsWrap.id = 'telemetry-sections'
    sectionsWrap.style.minHeight = '0'
    sectionsWrap.style.flex = '1 1 0'
    sectionsWrap.style.overflow = 'auto'
    container.appendChild(sectionsWrap)
  }

  const narrative = buildTelemetryNarrative(scenario, timeHour)

  const shouldStickToTop = () => {
    const slackPx = 28
    return (narrativeEl.scrollTop || 0) <= slackPx
  }

  const stick = shouldStickToTop()
  narrativeEl.style.borderLeft = `3px solid ${narrative.accent}`
  narrativeEl.innerHTML = `
    <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Narrative</div>
    ${narrative.html}
  `.trim()
  if (stick) {
    narrativeEl.scrollTop = 0
  }

  sectionsWrap.innerHTML = ''

  const computed = computeTelemetry(scenario, timeHour)

  const envelopeIndex = new Map((scenario?.envelopes ?? []).map(e => [e.envelopeId, e]))

  const renderBoundaryBadges = (contentEl) => {
    const totals = computed?.boundary?.totals || { escalated: 0, overridden: 0, deferred: 0 }
    const byEnvelope = computed?.boundary?.byEnvelope

    const terms = document.createElement('div')
    terms.style.cssText = 'margin: 2px 0 10px; font-size: 12px; color: var(--vscode-statusBar-foreground);'
    terms.innerHTML = `
      Terms:
      <a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Interaction</a>,
      <a class="glossary-term" href="#" data-glossary-term="Decision Envelope">Decision Envelope</a>
    `.trim()
    contentEl.appendChild(terms)

    const header = document.createElement('div')
    header.style.cssText = 'display:flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;'

    const mkChip = (label, value, bgVar) => {
      const chip = document.createElement('span')
      chip.textContent = `${label}: ${value}`
      chip.style.cssText = `background: ${bgVar}; opacity: 0.18; padding: 2px 6px; border-radius: 3px; font-size: 11px;`
      return chip
    }

    header.appendChild(mkChip('Escalated', totals.escalated ?? 0, 'var(--status-warning)'))
    header.appendChild(mkChip('Overridden', totals.overridden ?? 0, 'var(--status-error)'))
    header.appendChild(mkChip('Deferred', totals.deferred ?? 0, 'var(--status-info)'))
    contentEl.appendChild(header)

    const list = document.createElement('div')
    list.style.cssText = 'display:flex; flex-direction: column; gap: 8px;'

    const rows = []
    if (byEnvelope && typeof byEnvelope.forEach === 'function') {
      byEnvelope.forEach((bucket, envId) => {
        const total = bucket?.total ?? ((bucket?.escalated ?? 0) + (bucket?.overridden ?? 0) + (bucket?.deferred ?? 0))
        rows.push({ envId, bucket, total })
      })
    }

    rows
      .filter(r => (r.total ?? 0) > 0)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      .forEach(({ envId, bucket }) => {
        const env = envelopeIndex.get(envId)
        const label = env ? `${env.envelopeId}: ${env.name}` : String(envId)

        const row = document.createElement('div')
        row.style.cssText = 'display:flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--vscode-sideBar-border);'

        const left = document.createElement('div')
        left.style.cssText = 'display:flex; flex-direction: column; gap: 2px; min-width: 0;'

        const title = document.createElement('div')
        title.textContent = label
        title.style.cssText = 'font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'

        const sub = document.createElement('div')
        sub.textContent = 'Boundary interactions (last 24h)'
        sub.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'

        left.appendChild(title)
        left.appendChild(sub)

        const badges = document.createElement('div')
        badges.style.cssText = 'display:flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;'

        const addBadge = (text, count, bgVar) => {
          const n = count ?? 0
          if (!n) return
          const b = document.createElement('span')
          b.textContent = `${text} ${n}`
          b.style.cssText = `background: ${bgVar}; opacity: 0.18; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600;`
          badges.appendChild(b)
        }

        addBadge('Escalated', bucket?.escalated, 'var(--status-warning)')
        addBadge('Overridden', bucket?.overridden, 'var(--status-error)')
        addBadge('Deferred', bucket?.deferred, 'var(--status-info)')

        row.appendChild(left)
        row.appendChild(badges)
        list.appendChild(row)
      })

    if (!list.childElementCount) {
      const empty = document.createElement('div')
      empty.textContent = 'No boundary interactions in the last 24h.'
      empty.style.cssText = 'font-size: 12px; color: var(--vscode-statusBar-foreground); padding: 4px 0;'
      contentEl.appendChild(empty)
    } else {
      contentEl.appendChild(list)
    }
  }

  const renderStewardFleetsTelemetry = (contentEl) => {
    const fleets = Array.isArray(scenario?.fleets) ? scenario.fleets : []
    const envelopes = scenario?.envelopes ?? []
    
    const activeEnvelopeIds = new Set(
      envelopes
        .filter(e => getEnvelopeStatus(e, timeHour) === 'active')
        .map(e => e.envelopeId)
    )

    const fleetsByRole = new Map()
    fleets.forEach(fleet => {
      if (!fleetsByRole.has(fleet.stewardRole)) {
        fleetsByRole.set(fleet.stewardRole, [])
      }
      fleetsByRole.get(fleet.stewardRole).push(fleet)
    })

    const terms = document.createElement('div')
    terms.style.cssText = 'margin: 2px 0 10px; font-size: 12px; color: var(--vscode-statusBar-foreground);'
    terms.innerHTML = `
      Terms:
      <a class="glossary-term" href="#" data-glossary-term="Agent Fleet">Agent Fleet</a>,
      <a class="glossary-term" href="#" data-glossary-term="Steward">Steward</a>
    `.trim()
    contentEl.appendChild(terms)

    fleetsByRole.forEach((roleFleets, role) => {
      const roleGroup = document.createElement('div')
      roleGroup.style.cssText = 'margin-bottom: 12px;'

      const roleHeader = document.createElement('div')
      roleHeader.style.cssText = 'font-size: 11px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-statusBar-foreground);'
      roleHeader.textContent = role
      roleGroup.appendChild(roleHeader)

      roleFleets.forEach(fleet => {
        const fleetEl = document.createElement('div')
        fleetEl.style.cssText = 'padding: 6px 0; border-bottom: 1px solid var(--vscode-sideBar-border);'

        const activeAgents = (fleet.agents ?? []).filter(a =>
          Array.isArray(a?.envelopeIds) && a.envelopeIds.some(id => activeEnvelopeIds.has(id))
        )

        const fleetName = document.createElement('div')
        fleetName.style.cssText = 'font-size: 12px; margin-bottom: 2px;'
        fleetName.textContent = fleet.fleetId
        fleetEl.appendChild(fleetName)

        const fleetMeta = document.createElement('div')
        fleetMeta.style.cssText = 'font-size: 11px; color: var(--vscode-statusBar-foreground);'
        fleetMeta.textContent = `Active: ${activeAgents.length} / Total: ${(fleet.agents ?? []).length}`
        fleetEl.appendChild(fleetMeta)

        roleGroup.appendChild(fleetEl)
      })

      contentEl.appendChild(roleGroup)
    })

    if (!fleets.length) {
      const empty = document.createElement('div')
      empty.textContent = 'No fleets configured.'
      empty.style.cssText = 'font-size: 12px; color: var(--vscode-statusBar-foreground); padding: 4px 0;'
      contentEl.appendChild(empty)
    }
  }
  
  const sections = [
    {
      title: 'Live Metrics',
      icon: 'pulse',
      collapsed: telemetrySectionState['Live Metrics'],
      metrics: [
        { label: 'Active Decisions', value: String(computed.activeDecisions), icon: 'circle-filled', status: computed.activeDecisions > 0 ? 'success' : 'muted' },
        { label: 'Envelope Health', value: `${computed.envelopeHealthPct}%`, icon: 'pass-filled', status: computed.envelopeHealthPct >= 80 ? 'success' : computed.envelopeHealthPct >= 60 ? 'warning' : 'error' },
        { labelHtml: '<a class="glossary-term" href="#" data-glossary-term="Boundary Interaction">Boundary Touches</a>', value: String(computed.boundaryTouches), icon: 'law', status: computed.boundaryTouches > 0 ? 'warning' : 'muted' },
        { labelHtml: '<a class="glossary-term" href="#" data-glossary-term="Decision Drift">Drift Alerts</a>', value: String(computed.driftAlerts), icon: 'warning', status: computed.driftAlerts > 0 ? 'warning' : 'muted' }
      ]
    },
    {
      title: 'Boundary Interactions',
      icon: 'law',
      collapsed: telemetrySectionState['Boundary Interactions'],
      renderContent: renderBoundaryBadges,
    },
    {
      title: 'Decision Quality',
      icon: 'graph-line',
      collapsed: telemetrySectionState['Decision Quality'],
      metrics: [
        { label: 'Avg. Confidence', value: `${computed.avgConfidencePct}%`, icon: 'verified-filled', status: computed.avgConfidencePct >= 85 ? 'info' : computed.avgConfidencePct >= 70 ? 'warning' : 'error' },
        { label: 'Review Pending', value: String(computed.reviewPending), icon: 'eye', status: computed.reviewPending > 0 ? 'info' : 'muted' },
        { label: 'Breach Count', value: String(computed.breachCount), icon: 'error', status: computed.breachCount > 0 ? 'error' : 'muted' }
      ]
    },
    {
      title: 'Stewardship',
      icon: 'organization',
      collapsed: telemetrySectionState['Stewardship'],
      metrics: [
        { label: 'Active Stewards', value: String(computed.activeStewards), icon: 'person', status: computed.activeStewards > 0 ? 'info' : 'muted' },
        { label: 'Last Calibration', value: computed.lastCalibrationLabel, icon: 'history', status: 'muted' }
      ]
    },
    {
      title: 'Steward Fleets',
      icon: 'organization',
      collapsed: telemetrySectionState['Steward Fleets'],
      renderContent: renderStewardFleetsTelemetry
    }
  ];
  
  sections.forEach(section => {
    const sectionEl = createTelemetrySection(section);
    sectionsWrap.appendChild(sectionEl);
  });

  // Bind glossary links across all telemetry sections (container rerenders often).
  initGlossaryInline(container, {
    panelSelector: '#glossary-inline-aux',
    openDocs: () => navigateTo('/docs'),
  })
}

function computeTelemetry(scenario, timeHour) {
  const envelopes = scenario?.envelopes ?? []
  const events = scenario?.events ?? []
  const activeEnvelopes = envelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')

  const boundary = getBoundaryInteractionCounts(scenario, timeHour, 24)
  const boundaryTouches = (boundary?.totals?.escalated ?? 0) + (boundary?.totals?.overridden ?? 0) + (boundary?.totals?.deferred ?? 0)

  const recentSignals12 = events
    .filter(e => e && e.type === 'signal' && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour && e.hour >= timeHour - 12)

  const driftAlerts = recentSignals12.filter(s => (s.severity || 'info') !== 'info').length

  const activeDecisions = activeEnvelopes.length

  const recentSignals6 = events
    .filter(e => e && e.type === 'signal' && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour && e.hour >= timeHour - 6)

  const unhealthyEnvelopeIds = new Set(
    recentSignals6
      .filter(s => (s.severity || 'info') !== 'info')
      .map(s => s.envelopeId)
      .filter(Boolean)
  )

  const healthy = activeEnvelopes.filter(e => !unhealthyEnvelopeIds.has(e.envelopeId)).length
  const envelopeHealthPct = activeDecisions === 0 ? 100 : Math.round((healthy / activeDecisions) * 100)

  const recentSignals24WithValue = events
    .filter(e => e && e.type === 'signal' && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour && e.hour >= timeHour - 24)
    .filter(e => typeof e.value === 'number' && Number.isFinite(e.value))
  const avgValue = recentSignals24WithValue.length
    ? recentSignals24WithValue.reduce((sum, s) => sum + Math.abs(s.value), 0) / recentSignals24WithValue.length
    : 0
  // Heuristic: higher drift => lower confidence; clamp to sane bounds.
  const avgConfidencePct = clampInt(Math.round((0.93 - avgValue * 1.2) * 100), 55, 99)

  const reviewWindow12 = events
    .filter(e => e && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour && e.hour >= timeHour - 12)
    .filter(e => ['escalation', 'dsg_session', 'signal'].includes(e.type))

  const reviewPending = new Set(
    reviewWindow12
      .filter(e => e.type !== 'signal' || (e.severity || 'info') !== 'info')
      .map(e => e.envelopeId)
      .filter(Boolean)
  ).size

  const breachCount = events
    .filter(e => e && e.type === 'signal' && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour && e.hour >= timeHour - 24)
    .filter(e => (e.severity || '') === 'error').length

  const stewardWindow24 = events
    .filter(e => e && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour && e.hour >= timeHour - 24)
    .filter(e => ['revision', 'escalation', 'dsg_session', 'dsg_message'].includes(e.type))

  const activeStewards = new Set(
    stewardWindow24
      .map(e => e.actorRole || e.authorRole || e.facilitatorRole)
      .filter(Boolean)
  ).size

  const lastSession = events
    .filter(e => e && e.type === 'dsg_session' && typeof e.hour === 'number')
    .filter(e => e.hour <= timeHour)
    .sort((a, b) => b.hour - a.hour)[0]

  const lastCalibrationLabel = lastSession
    ? formatAgoHours(timeHour - lastSession.hour)
    : '-'

  return {
    activeDecisions,
    envelopeHealthPct,
    driftAlerts,
    boundaryTouches,
    boundary,
    avgConfidencePct,
    reviewPending,
    breachCount,
    activeStewards,
    lastCalibrationLabel,
  }
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatAgoHours(deltaHours) {
  if (deltaHours <= 0.25) return 'just now'
  const rounded = Math.max(1, Math.round(deltaHours))
  return `${rounded}h ago`
}

// Create collapsible telemetry section
function createTelemetrySection(section) {
  const sectionContainer = document.createElement('div');
  sectionContainer.className = 'telemetry-section';
  sectionContainer.style.cssText = 'margin-bottom: 16px;';
  
  // Section header
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px 0; border-bottom: 1px solid var(--vscode-sideBar-border);';
  
  const chevron = document.createElement('span');
  chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
  chevron.style.cssText = 'font-size: 12px;';
  
  const icon = document.createElement('span');
  icon.className = `codicon codicon-${section.icon}`;
  icon.style.cssText = 'font-size: 14px;';
  
  const title = document.createElement('h3');
  title.textContent = section.title;
  title.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;';
  
  header.appendChild(chevron);
  header.appendChild(icon);
  header.appendChild(title);
  
  // Section content
  const content = document.createElement('div');
  content.className = 'telemetry-section-content';
  content.style.cssText = section.collapsed ? 'display: none;' : 'display: block; padding-top: 8px;';

  if (typeof section.renderContent === 'function') {
    section.renderContent(content)
  } else {
    ;(section.metrics || []).forEach(metric => {
      const metricEl = document.createElement('div');
      metricEl.className = 'telemetry-metric';
      metricEl.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 0;';
      
      const labelContainer = document.createElement('div');
      labelContainer.style.cssText = 'display: flex; align-items: center; gap: 6px;';
      
      const statusIcon = document.createElement('span');
      statusIcon.className = `codicon codicon-${metric.icon}`;
      statusIcon.style.cssText = `font-size: 14px; color: var(--status-${metric.status}, var(--vscode-statusBar-foreground));`;
      
      const label = document.createElement('span');
      label.className = 'metric-label';
      if (metric.labelHtml) {
        label.innerHTML = metric.labelHtml;
      } else {
        label.textContent = metric.label;
      }
      label.style.cssText = 'font-size: 12px;';
      
      labelContainer.appendChild(statusIcon);
      labelContainer.appendChild(label);
      
      const value = document.createElement('span');
      value.className = `metric-value ${metric.status}`;
      value.textContent = metric.value;
      value.style.cssText = 'font-size: 13px; font-weight: 600;';
      
      metricEl.appendChild(labelContainer);
      metricEl.appendChild(value);
      content.appendChild(metricEl);
    });
  }
  
  // Toggle handler
  header.addEventListener('click', () => {
    section.collapsed = !section.collapsed;
    telemetrySectionState[section.title] = section.collapsed
    chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
    content.style.display = section.collapsed ? 'none' : 'block';
  });
  
  sectionContainer.appendChild(header);
  sectionContainer.appendChild(content);
  
  return sectionContainer;
}

// Create complete workspace with resizable panels
export function createWorkspace() {
  const persisted = loadLayoutState()

  // Restore sizes first.
  if (typeof persisted.sidebarWidth === 'number') setCssVar('--sidebar-width', `${persisted.sidebarWidth}px`)
  if (typeof persisted.auxWidth === 'number') setCssVar('--auxiliarybar-width', `${persisted.auxWidth}px`)
  if (typeof persisted.panelHeight === 'number') setCssVar('--panel-height', `${persisted.panelHeight}px`)

  // Default-collapsed per spec.
  setAuxCollapsed(persisted.auxCollapsed !== undefined ? persisted.auxCollapsed : true)
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

  // Discoverability handle for collapsed aux (Evidence) panel.
  const auxPeek = document.createElement('div')
  auxPeek.className = 'aux-peek'
  auxPeek.setAttribute('role', 'button')
  auxPeek.setAttribute('tabindex', '0')
  auxPeek.setAttribute('aria-label', 'Open Evidence panel')
  auxPeek.innerHTML = `
    <span class="codicon codicon-chevron-left" aria-hidden="true"></span>
    <span class="aux-peek__label">EVIDENCE</span>
  `.trim()
  const openAux = () => setAuxCollapsed(false)
  auxPeek.addEventListener('click', openAux)
  auxPeek.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openAux()
    }
  })
  editorArea.appendChild(auxPeek)
  
  // Resize handle between editor and auxiliary bar
  const sash2 = createSash('vertical', 'auxiliary-resize');
  
  const auxiliarybar = createAuxiliaryBar();

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

  // Route-aware auto-open: Aux opens on Evidence + DSG routes.
  window.addEventListener('hddl:navigate', (e) => {
    const path = e?.detail?.path || window.location.pathname || '/'
    // Only auto-open if we are NOT in focus mode
    const activeLayout = localStorage.getItem('hddl:layout:active') || 'focus'
    const isFocusMode = activeLayout === 'focus'
    
    if (!isFocusMode && (path === '/' || path === '/decision-telemetry' || path === '/dsg-event')) {
      setAuxCollapsed(false)
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
  
  return workbench;
}

function createBottomPanel() {
  const panel = document.createElement('div')
  panel.className = 'part panel'
  panel.id = 'panel'
  panel.setAttribute('role', 'region')
  panel.setAttribute('aria-label', 'Panel')

  const tabs = [
    { id: 'envelopes', label: 'ENVELOPES' },
    { id: 'steward', label: 'STEWARD ACTIVITY' },
    { id: 'dts', label: 'DTS STREAM' },
    { id: 'cli', label: 'HDDL CLI' },
  ]

  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-tabs" role="tablist" aria-label="Panel tabs">
        ${tabs
          .map((t, idx) => {
            const isActive = t.id === 'cli' && idx === tabs.length - 1
            return `
              <button
                class="panel-tab ${t.id === 'cli' ? 'active' : ''}"
                type="button"
                role="tab"
                aria-selected="${t.id === 'cli' ? 'true' : 'false'}"
                data-tab="${t.id}"
              >${t.label}</button>
            `
          })
          .join('')}
      </div>
      <div class="panel-actions">
        <button class="panel-action" type="button" aria-label="Close panel" title="Close" data-action="close-panel">
          <span class="codicon codicon-close" aria-hidden="true"></span>
        </button>
        <button class="panel-action" type="button" aria-label="Clear panel" title="Clear">
          <span class="codicon codicon-clear-all" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="panel-body" data-testid="terminal-panel">
      ${tabs
        .map(
          t =>
            `<div class="terminal-output" data-terminal="${t.id}" aria-label="${t.label} output"></div>`
        )
        .join('')}
      <div class="terminal-input-row" id="terminal-input-row">
        <span class="terminal-prompt" id="terminal-prompt" aria-hidden="true"></span>
        <input class="terminal-input" id="terminal-input" type="text" autocomplete="off" spellcheck="false" aria-label="Terminal input" />
      </div>
    </div>
  `

  const outputEls = new Map(
    Array.from(panel.querySelectorAll('.terminal-output[data-terminal]')).map(el => [el.dataset.terminal, el])
  )

  const inputEl = panel.querySelector('#terminal-input')
  const inputRowEl = panel.querySelector('#terminal-input-row')
  const promptEl = panel.querySelector('#terminal-prompt')
  const closeBtn = panel.querySelector('[data-action="close-panel"]')
  const clearBtn = panel.querySelector('.panel-action:not([data-action="close-panel"])')

  let activeTab = 'cli'

  let lastObservedTime = getTimeHour()
  let lastEmittedTime = lastObservedTime
  let lastScenarioId = getScenario()?.id || 'unknown'

  const setPrompt = () => {
    if (!promptEl) return
    promptEl.textContent = `hddl@${formatSimTime(getTimeHour())}>`
  }

  const getOutputEl = (tabId) => outputEls.get(tabId) || outputEls.get('cli')

  const writeLine = (tabId, text, kind = 'normal') => {
    const outputEl = getOutputEl(tabId)
    if (!outputEl) return
    const line = document.createElement('div')
    line.className = `terminal-line terminal-line--${kind}`
    line.textContent = text
    outputEl.appendChild(line)
    outputEl.scrollTop = outputEl.scrollHeight
  }

  const setActiveTab = (tabId) => {
    activeTab = tabId
    panel.querySelectorAll('.panel-tab[data-tab]').forEach(btn => {
      const isActive = btn.dataset.tab === tabId
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false')
    })
    panel.querySelectorAll('.terminal-output[data-terminal]').forEach(el => {
      el.style.display = el.dataset.terminal === tabId ? 'block' : 'none'
    })
    const cliActive = tabId === 'cli'
    if (inputRowEl) inputRowEl.style.display = cliActive ? 'flex' : 'none'
    if (cliActive && inputEl) inputEl.focus()
  }

  const formatEventLine = (event) => {
    const ts = formatSimTime(event?.hour)
    const envelope = event?.envelopeId ? ` ${event.envelopeId}` : ''

    if (event?.type === 'envelope_promoted') {
      return {
        envelopes: { text: `[${ts}] ACTIVE${envelope} - ${event.detail || event.label || ''}`.trim(), kind: 'info' },
        steward: null,
        dts: null,
      }
    }
    if (event?.type === 'signal') {
      const sev = (event.severity || 'info').toUpperCase()
      const key = event.signalKey ? ` ${event.signalKey}` : ''
      const detail = event.detail || event.label || ''
      return {
        envelopes: null,
        steward: null,
        dts: { text: `[${ts}] ${sev}${envelope}${key} - ${detail}`.trim(), kind: sev === 'WARNING' ? 'warning' : 'info' },
      }
    }
    if (event?.type === 'boundary_interaction') {
      const kind = String(event?.boundary_kind || 'boundary').toUpperCase()
      const actor = event.actorRole ? ` by ${event.actorRole}` : ''
      const detail = event.detail || event.label || ''
      const line = `[${ts}] ${kind}${envelope}${actor} - ${detail}`.trim()
      return {
        envelopes: { text: line, kind: event.severity === 'warning' ? 'warning' : 'info' },
        steward: { text: line, kind: event.severity === 'warning' ? 'warning' : 'info' },
        dts: null,
      }
    }
    if (event?.type === 'escalation') {
      const actor = event.actorRole ? ` by ${event.actorRole}` : ''
      const detail = event.detail || event.label || ''
      return {
        envelopes: null,
        steward: { text: `[${ts}] ESCALATION${envelope}${actor} - ${detail}`.trim(), kind: event.severity === 'warning' ? 'warning' : 'info' },
        dts: null,
      }
    }
    if (event?.type === 'dsg_session') {
      const session = event.sessionId ? ` ${event.sessionId}` : ''
      const title = event.title ? ` - ${event.title}` : ''
      return {
        envelopes: { text: `[${ts}] DSG REVIEW${session}${envelope}${title}`.trim(), kind: 'info' },
        steward: { text: `[${ts}] DSG REVIEW${session}${envelope}${title}`.trim(), kind: 'info' },
        dts: null,
      }
    }
    if (event?.type === 'revision') {
      const actor = event.actorRole ? ` by ${event.actorRole}` : ''
      const detail = event.detail || event.label || ''
      return {
        envelopes: { text: `[${ts}] REVISION${envelope}${actor} - ${detail}`.trim(), kind: 'info' },
        steward: { text: `[${ts}] REVISION${envelope}${actor} - ${detail}`.trim(), kind: 'info' },
        dts: null,
      }
    }

    return null
  }

  const emitTimelineEvents = (fromTime, toTime) => {
    const scenario = getScenario()
    const events = scenario?.events ?? []
    if (!Array.isArray(events) || !events.length) return

    // Keep this focused and envelope-relevant.
    const allowed = new Set(['envelope_promoted', 'signal', 'boundary_interaction', 'escalation', 'dsg_session', 'revision'])
    const slice = events
      .filter(e => e && allowed.has(e.type) && typeof e.hour === 'number')
      .filter(e => e.hour > fromTime && e.hour <= toTime)
      .sort((a, b) => a.hour - b.hour)

    slice.forEach(ev => {
      const formatted = formatEventLine(ev)
      if (!formatted) return

      if (formatted.envelopes) writeLine('envelopes', formatted.envelopes.text, formatted.envelopes.kind)
      if (formatted.steward) writeLine('steward', formatted.steward.text, formatted.steward.kind)
      if (formatted.dts) writeLine('dts', formatted.dts.text, formatted.dts.kind)
    })
  }

  const runCommand = (raw) => {
    const cmd = String(raw || '').trim()
    if (!cmd) return

    writeLine('cli', `${promptEl?.textContent || 'hddl>'} ${cmd}`, 'cmd')

    if (cmd === 'help') {
      writeLine('cli', 'Commands: help, clear, time, route, active', 'info')
      writeLine('cli', 'Note: this is a simulated CLI (not your OS shell).', 'muted')
      return
    }
    if (cmd === 'clear') {
      const cliOut = getOutputEl('cli')
      if (cliOut) cliOut.innerHTML = ''
      return
    }
    if (cmd === 'time') {
      writeLine('cli', formatSimTime(getTimeHour()), 'info')
      return
    }
    if (cmd === 'route') {
      writeLine('cli', window.location.pathname || '/', 'info')
      return
    }
    if (cmd === 'active') {
      const scenario = getScenario()
      const envelopes = scenario?.envelopes ?? []
      const timeHour = getTimeHour()
      const active = envelopes
        .filter(e => getEnvelopeStatus(e, timeHour) === 'active')
        .map(e => e.envelopeId)
        .filter(Boolean)
      writeLine('cli', active.length ? active.join(', ') : 'No active envelopes.', 'info')
      return
    }

    writeLine('cli', `Unknown command: ${cmd}. Type 'help'.`, 'warning')
  }

  setPrompt()
  // Default visibility state
  setActiveTab('cli')

  writeLine('cli', 'HDDL CLI - type "help" to see commands.', 'muted')
  writeLine('envelopes', 'Envelope console - tracks envelope activations and revisions.', 'muted')
  writeLine('steward', 'Steward activity - escalations, DSG reviews, and steward actions.', 'muted')
  writeLine('dts', 'DTS stream - bounded signals and outcome telemetry.', 'muted')

  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      const value = inputEl.value
      inputEl.value = ''
      runCommand(value)
    })
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const out = getOutputEl(activeTab)
      if (out) out.innerHTML = ''
    })
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      setBottomCollapsed(true)
    })
  }

  // Tab switching
  panel.querySelectorAll('.panel-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab
      if (!tabId) return
      setActiveTab(tabId)
    })
  })

  // Keep prompt time in sync
  onTimeChange(() => {
    if (!panel.isConnected) return
    setPrompt()

    const next = getTimeHour()
    const prev = lastObservedTime
    lastObservedTime = next

    // If time moves backwards (scrub/rewind), reset emission window.
    if (next < prev) {
      lastEmittedTime = next
      const marker = `[${formatSimTime(next)}] timeline rewound`
      writeLine('envelopes', marker, 'muted')
      writeLine('steward', marker, 'muted')
      writeLine('dts', marker, 'muted')
      writeLine('cli', marker, 'muted')
      return
    }

    // Only emit deltas we haven't logged yet.
    if (next > lastEmittedTime) {
      emitTimelineEvents(lastEmittedTime, next)
      lastEmittedTime = next
    }
  })
  onScenarioChange(() => {
    if (!panel.isConnected) return
    setPrompt()

    const scenario = getScenario()
    const scenarioId = scenario?.id || 'unknown'
    const now = getTimeHour()
    lastObservedTime = now
    lastEmittedTime = now

    if (scenarioId !== lastScenarioId) {
      lastScenarioId = scenarioId
      const msg = `Scenario loaded: ${scenario?.title || scenarioId}`
      writeLine('envelopes', msg, 'muted')
      writeLine('steward', msg, 'muted')
      writeLine('dts', msg, 'muted')
      writeLine('cli', msg, 'muted')
    }
  })

  return panel
}

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
      <span class="mobile-nav-title">HDDL Simulation</span>
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
        const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 500 };
        // Get width from CSS variable for accuracy
        const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || config.default || 300;
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth + deltaX));
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, sidebarWidth: newWidth });
        savePanelWidth('sidebar', newWidth);
      } else if (id === 'auxiliary-resize') {
        setAuxCollapsed(false);
        const auxiliary = document.querySelector('.auxiliarybar');
        if (!auxiliary) return;
        const config = PANEL_DEFAULTS.auxiliary || { min: 200, max: 600 };
        // Get width from CSS variable for accuracy
        const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--auxiliarybar-width')) || config.default || 350;
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth - deltaX));
        auxiliary.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, auxWidth: newWidth, auxCollapsed: false });
        savePanelWidth('auxiliary', newWidth);
      }
      startX = e.clientX;
      
      // Dispatch resize event for other components to react
      window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
        detail: { panel: id.replace('-resize', ''), orientation }
      }));
    } else if (orientation === 'horizontal') {
      updateGhostLine(e.clientY);
      
      if (id === 'panel-resize') {
        setBottomCollapsed(false);
        const root = document.documentElement;
        const currentRaw = getComputedStyle(root).getPropertyValue('--panel-height').trim();
        const current = Number.parseInt(currentRaw || '240', 10);
        const config = PANEL_DEFAULTS.bottom || { min: 100, max: 400 };
        const next = Math.max(config.min, Math.min(config.max, current - deltaY));
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
      const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 500, default: 300 };
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
        const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 500 };
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth + delta));
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      } else if (id === 'auxiliary-resize') {
        const auxiliary = document.querySelector('.auxiliarybar');
        if (!auxiliary) return;
        setAuxCollapsed(false);
        const currentWidth = parseInt(getComputedStyle(auxiliary).width);
        const config = PANEL_DEFAULTS.auxiliary || { min: 200, max: 600 };
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth - delta));
        auxiliary.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);
      } else if (id === 'panel-resize') {
        setBottomCollapsed(false);
        const root = document.documentElement;
        const currentRaw = getComputedStyle(root).getPropertyValue('--panel-height').trim();
        const current = Number.parseInt(currentRaw || '240', 10);
        const config = PANEL_DEFAULTS.bottom || { min: 100, max: 400 };
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
  const content = document.getElementById('auxiliarybar-content');
  if (content) {
    updateTelemetry(content);
  }
}
