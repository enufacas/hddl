// Workspace layout component
import { navigateTo } from '../router';
import { formatSimTime, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange } from '../sim/sim-state'

// Activity bar icons (using codicon names) - Simulation focused
const activityBarItems = [
  { id: 'envelopes', icon: 'shield', label: 'Decision Envelopes', route: '/' },
  { id: 'signals', icon: 'pulse', label: 'Signals & Outcomes', route: '/decision-telemetry' },
  { id: 'stewardship', icon: 'person', label: 'Steward Actions', route: '/stewardship' }
];

// Sidebar navigation items (using codicon names) - Simulation concepts
const navItems = [
  { id: 'envelopes', label: 'Decision Envelopes', icon: 'shield', route: '/', section: 'simulation' },
  { id: 'signals', label: 'Signals & Outcomes', icon: 'pulse', route: '/decision-telemetry', section: 'simulation' },
  { id: 'capability', label: 'Steward Agent Fleets', icon: 'organization', route: '/steward-fleets', section: 'simulation' },
  { id: 'dsg-event', label: 'DSG Review', icon: 'comment-discussion', route: '/dsg-event', section: 'events' },
  { id: 'stewardship', label: 'Steward Actions', icon: 'person', route: '/stewardship', section: 'events' }
];

// Sidebar sections configuration
const sidebarSections = [
  { id: 'simulation', title: 'Simulation View', icon: 'eye', collapsed: false },
  { id: 'events', title: 'Key Events', icon: 'calendar', collapsed: false }
];

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
  
  // Persona selector
  const personaSelector = document.createElement('div');
  personaSelector.style.cssText = 'margin-bottom: 8px;';
  
  const personaLabel = document.createElement('div');
  personaLabel.textContent = 'VIEW AS';
  personaLabel.style.cssText = 'font-size: 9px; color: var(--vscode-statusBar-foreground); margin-bottom: 4px; letter-spacing: 0.5px;';
  
  const personaDropdown = document.createElement('select');
  personaDropdown.id = 'persona-selector';
  personaDropdown.style.cssText = 'width: 100%; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; font-size: 12px; cursor: pointer;';
  
  const personas = [
    { value: 'domain-engineer', label: 'Domain Engineer' },
    { value: 'hr-steward', label: 'HR Steward' },
    { value: 'customer-steward', label: 'Customer Steward' },
    { value: 'executive', label: 'Executive' },
    { value: 'data-steward', label: 'Data Steward' }
  ];
  
  personas.forEach(persona => {
    const option = document.createElement('option');
    option.value = persona.value;
    option.textContent = persona.label;
    personaDropdown.appendChild(option);
  });
  
  personaDropdown.addEventListener('change', (e) => {
    updatePersonaView(e.target.value);
  });
  
  personaSelector.appendChild(personaLabel);
  personaSelector.appendChild(personaDropdown);
  
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
  
  header.appendChild(personaSelector);
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

  // Steward fleets panel (time-driven)
  const fleetsPanel = createStewardFleetsPanel()
  listContainer.appendChild(fleetsPanel)
  
  scrollableElement.appendChild(listContainer);
  content.appendChild(scrollableElement);
  
  sidebar.appendChild(header);
  sidebar.appendChild(content);

  // Keep fleets panel in sync with scenario/time
  const rerenderFleets = () => {
    if (!sidebar.isConnected) return
    const scenario = getScenario()
    const timeHour = getTimeHour()
    renderStewardFleets(fleetsPanel, scenario, timeHour)
  }

  rerenderFleets()
  onTimeChange(rerenderFleets)
  onScenarioChange(rerenderFleets)
  
  return sidebar;
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
    auxTitle.textContent = personaTitles[persona] || 'DECISION INSIGHTS';
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
  
  row.appendChild(icon);
  row.appendChild(label);
  
  row.addEventListener('click', () => {
    navigateTo(item.route);
  });
  
  return row;
}

// Create auxiliary bar with collapsible telemetry sections
function createAuxiliaryBar() {
  const auxiliarybar = document.createElement('div');
  auxiliarybar.className = 'part auxiliarybar';
  auxiliarybar.id = 'auxiliarybar';
  auxiliarybar.setAttribute('role', 'complementary');

  // Ensure layout starts in the "aux visible" state.
  document.body.classList.remove('aux-hidden')
  
  const header = document.createElement('div');
  header.className = 'composite title';
  
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
  
  const title = document.createElement('h3');
  title.textContent = 'DECISION INSIGHTS';
  title.style.cssText = 'font-size: 11px; font-weight: 600; margin: 0;';
  
  const toggleButton = document.createElement('a');
  toggleButton.className = 'codicon codicon-close';
  toggleButton.setAttribute('role', 'button');
  toggleButton.setAttribute('aria-label', 'Close Panel');
  toggleButton.style.cssText = 'cursor: pointer; padding: 4px;';
  toggleButton.addEventListener('click', () => {
    auxiliarybar.style.display = 'none';
    document.body.classList.add('aux-hidden')
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
  
  auxiliarybar.appendChild(header);
  auxiliarybar.appendChild(content);
  
  return auxiliarybar;
}

// Update telemetry display with collapsible sections
const telemetrySectionState = {
  'Live Metrics': false,
  'Decision Quality': false,
  'Stewardship': false,
}

function updateTelemetry(container, scenario, timeHour) {
  container.innerHTML = '';

  const computed = computeTelemetry(scenario, timeHour)
  
  const sections = [
    {
      title: 'Live Metrics',
      icon: 'pulse',
      collapsed: telemetrySectionState['Live Metrics'],
      metrics: [
        { label: 'Active Decisions', value: String(computed.activeDecisions), icon: 'circle-filled', status: computed.activeDecisions > 0 ? 'success' : 'muted' },
        { label: 'Envelope Health', value: `${computed.envelopeHealthPct}%`, icon: 'pass-filled', status: computed.envelopeHealthPct >= 80 ? 'success' : computed.envelopeHealthPct >= 60 ? 'warning' : 'error' },
        { label: 'Drift Alerts', value: String(computed.driftAlerts), icon: 'warning', status: computed.driftAlerts > 0 ? 'warning' : 'muted' }
      ]
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
    }
  ];
  
  sections.forEach(section => {
    const sectionEl = createTelemetrySection(section);
    container.appendChild(sectionEl);
  });
}

function computeTelemetry(scenario, timeHour) {
  const envelopes = scenario?.envelopes ?? []
  const events = scenario?.events ?? []
  const activeEnvelopes = envelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')

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
  
  section.metrics.forEach(metric => {
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
    label.textContent = metric.label;
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
  const clearBtn = panel.querySelector('.panel-action')

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
    const allowed = new Set(['envelope_promoted', 'signal', 'escalation', 'dsg_session', 'revision'])
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

// Create resize handle (sash)
function createSash(orientation, id) {
  const sash = document.createElement('div');
  sash.className = `monaco-sash ${orientation}`;
  sash.id = id;
  sash.style.cssText = orientation === 'vertical' 
    ? 'position: absolute; top: 0; width: 4px; height: 100%; cursor: ew-resize; z-index: 35;'
    : 'position: absolute; left: 0; width: 100%; height: 4px; cursor: ns-resize; z-index: 35;';
  
  // Basic drag functionality
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  
  sash.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    sash.classList.add('active');
    document.body.style.cursor = orientation === 'vertical' ? 'ew-resize' : 'ns-resize';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    if (orientation === 'vertical') {
      const delta = e.clientX - startX;
      if (id === 'sidebar-resize') {
        const sidebar = document.querySelector('.sidebar');
        const currentWidth = parseInt(getComputedStyle(sidebar).width);
        const newWidth = Math.max(200, Math.min(600, currentWidth + delta));
        sidebar.style.width = `${newWidth}px`;
        
        // Update CSS variable for consistent layout
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      } else if (id === 'auxiliary-resize') {
        const auxiliary = document.querySelector('.auxiliarybar');
        const currentWidth = parseInt(getComputedStyle(auxiliary).width);
        const newWidth = Math.max(200, Math.min(600, currentWidth - delta));
        auxiliary.style.width = `${newWidth}px`;
        
        // Update CSS variable for consistent layout
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);
      }
      startX = e.clientX;
      
      // Force layout recalculation and repaint
      window.requestAnimationFrame(() => {
        const workbench = document.querySelector('.workbench');
        if (workbench) {
          workbench.style.transform = 'translateZ(0)';
          setTimeout(() => {
            workbench.style.transform = '';
          }, 0);
        }
      });
    } else if (orientation === 'horizontal') {
      const delta = e.clientY - startY
      if (id === 'panel-resize') {
        const root = document.documentElement
        const currentRaw = getComputedStyle(root).getPropertyValue('--panel-height').trim()
        const current = Number.parseInt(currentRaw || '240', 10)
        // Dragging up should increase panel height; dragging down should decrease it.
        const next = Math.max(120, Math.min(520, current - delta))
        root.style.setProperty('--panel-height', `${next}px`)
      }
      startY = e.clientY
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      sash.classList.remove('active');
      document.body.style.cursor = '';
    }
  });
  
  sash.addEventListener('mouseenter', () => {
    sash.classList.add('hover');
  });
  
  sash.addEventListener('mouseleave', () => {
    if (!isDragging) {
      sash.classList.remove('hover');
    }
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
