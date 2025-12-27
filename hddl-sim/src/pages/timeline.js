// Timeline Scrubber - Envelope Lifecycle View (schema-driven)
import * as d3 from 'd3'
import {
  formatSimTime,
  getEnvelopeAtTime,
  getEnvelopeStatus,
  getEventsNearTime,
  getScenario,
  getTimeHour,
  onScenarioChange,
  onTimeChange,
} from '../sim/sim-state'
import { createEnvelopeDetailModal } from '../components/envelope-detail'

export function render(container) {
  container.innerHTML = `
    <div class="page-container" data-testid="timeline-page">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span class="codicon codicon-history" style="font-size: 28px;"></span>
        <div>
          <h1 style="margin: 0;">Timeline Scrubber</h1>
          <p style="margin: 0;">Envelope lifecycle and decision authority over time</p>
        </div>
      </div>

      <div style="display:flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 12px 0 18px; padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-editorWidget-background);">
        <div style="display:flex; align-items:center; gap: 8px;">
          <span class="codicon codicon-calendar"></span>
          <div>
            <div style="font-size: 11px; color: var(--vscode-statusBar-foreground);">SELECTED TIME</div>
            <div id="timeline-selected-time" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;"></div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; color: var(--vscode-statusBar-foreground); font-size: 12px;">
          <span class="codicon codicon-info"></span>
          Timeline is rendered from envelope artifacts and DTS-bounded events.
        </div>
      </div>

      <div id="timeline-viz" style="margin-bottom: 24px;"></div>

      <div style="margin-bottom: 28px;">
        <h2 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span class="codicon codicon-shield"></span>
          Active Envelopes at Selected Time
        </h2>
        <div id="timeline-envelope-grid" class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;"></div>
      </div>

      <div>
        <h2 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span class="codicon codicon-calendar"></span>
          Key Events Near Selected Time
        </h2>
        <div id="timeline-events-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
      </div>
    </div>
  `

  const timeEl = container.querySelector('#timeline-selected-time')
  const vizEl = container.querySelector('#timeline-viz')
  const envelopeGrid = container.querySelector('#timeline-envelope-grid')
  const eventsList = container.querySelector('#timeline-events-list')

  const rerender = () => {
    if (!container.isConnected) return
    const scenario = getScenario()
    const timeHour = getTimeHour()
    if (timeEl) timeEl.textContent = formatSimTime(timeHour)
    renderTimelineViz(vizEl, scenario, timeHour)
    renderActiveEnvelopes(envelopeGrid, scenario, timeHour)
    renderEvents(eventsList, scenario, timeHour)
  }

  rerender()
  onTimeChange(rerender)
  onScenarioChange(rerender)
}

function renderTimelineViz(container, scenario, timeHour) {
  if (!container) return
  container.innerHTML = ''

  const envelopes = Array.isArray(scenario?.envelopes) ? scenario.envelopes.slice() : []
  const duration = scenario?.durationHours ?? 48

  if (!envelopes.length) {
    container.innerHTML = `<div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; color: var(--vscode-statusBar-foreground);">No envelopes in this scenario.</div>`
    return
  }

  // Get unique envelope IDs for y-axis (but render ALL envelope segments)
  const uniqueEnvelopeIds = Array.from(new Set(envelopes.map(e => e.envelopeId)))
  uniqueEnvelopeIds.sort((a, b) => {
    const aFirst = envelopes.find(e => e.envelopeId === a)
    const bFirst = envelopes.find(e => e.envelopeId === b)
    return (aFirst?.createdHour ?? 0) - (bFirst?.createdHour ?? 0)
  })

  const width = container.clientWidth || 900
  const height = Math.max(220, uniqueEnvelopeIds.length * 32 + 70)
  const margin = { top: 20, right: 30, bottom: 40, left: 120 }

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  const x = d3.scaleLinear()
    .domain([0, duration])
    .range([margin.left, width - margin.right])

  const y = d3.scaleBand()
    .domain(uniqueEnvelopeIds)
    .range([margin.top, height - margin.bottom])
    .padding(0.25)

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(Math.min(8, duration)).tickFormat(d => `${d}h`))
    .selectAll('text')
    .attr('fill', 'var(--vscode-statusBar-foreground)')
  
  svg.selectAll('.domain, .tick line')
    .attr('stroke', 'var(--vscode-sideBar-border)')

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('fill', 'var(--vscode-statusBar-foreground)')
  
  svg.selectAll('.domain, .tick line')
    .attr('stroke', 'var(--vscode-sideBar-border)')

  // Render ALL envelope segments (including reopened envelopes with same ID)
  svg.selectAll('.envelope-bar')
    .data(envelopes.map((env, idx) => ({ ...env, _index: idx })))
    .enter()
    .append('rect')
    .attr('class', 'envelope-bar')
    .attr('x', d => x(d.createdHour ?? 0))
    .attr('y', d => y(d.envelopeId))
    .attr('width', d => Math.max(2, x(d.endHour ?? duration) - x(d.createdHour ?? 0)))
    .attr('height', y.bandwidth())
    .attr('fill', d => d.accent || 'var(--status-muted)')
    .attr('opacity', 0.7)
    .attr('rx', 3)
    .append('title')
    .text(d => {
      const version = d.envelope_version || 1
      const start = formatSimTime(d.createdHour ?? 0)
      const end = formatSimTime(d.endHour ?? duration)
      return `${d.envelopeId} v${version}\n${d.name}\n${start} → ${end}`
    })

  const clampedTime = Math.max(0, Math.min(duration, timeHour))
  svg.append('line')
    .attr('x1', x(clampedTime))
    .attr('x2', x(clampedTime))
    .attr('y1', margin.top)
    .attr('y2', height - margin.bottom)
    .attr('stroke', 'var(--vscode-focusBorder)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,4')

  svg.append('text')
    .attr('x', x(clampedTime))
    .attr('y', margin.top - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--vscode-focusBorder)')
    .attr('font-size', '12px')
    .text('Selected time')
}

function renderActiveEnvelopes(gridEl, scenario, timeHour) {
  if (!gridEl) return
  const envelopes = Array.isArray(scenario?.envelopes) ? scenario.envelopes : []
  const active = envelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')

  if (!active.length) {
    gridEl.innerHTML = `<div class="fleet-page__empty" style="grid-column: 1 / -1;">No active envelopes at the selected time.</div>`
    return
  }

  gridEl.innerHTML = active
    .map(env => {
      const effective = getEnvelopeAtTime(scenario, env.envelopeId, timeHour) || env
      return `
        <div class="envelope-card" data-envelope="${env.envelopeId}" style="--envelope-accent: ${env.accent || 'var(--status-muted)'}; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${env.envelopeId}</div>
              <h3 style="margin: 4px 0;">${env.name}</h3>
            </div>
            <span class="codicon codicon-pass-filled" style="color: var(--status-success);"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
            <span class="codicon codicon-person"></span>
            <span>${env.ownerRole}</span>
          </div>
          <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 10px;">Window: ${formatSimTime(env.createdHour)} - ${formatSimTime(env.endHour)}</div>
          <div style="display: flex; gap: 8px; font-size: 11px; flex-wrap: wrap;">
            <span style="background: var(--status-info); opacity: 0.2; padding: 2px 6px; border-radius: 3px;">${(effective.constraints ?? []).length} constraints</span>
            <span style="background: var(--status-muted); opacity: 0.2; padding: 2px 6px; border-radius: 3px;">${env.domain}</span>
          </div>
        </div>
      `
    })
    .join('')

  gridEl.querySelectorAll('.envelope-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation()
      const envelopeId = card.dataset.envelope
      const modal = createEnvelopeDetailModal(envelopeId)
      const app = document.querySelector('#app')
      if (app) app.appendChild(modal)
    })
  })
}

function renderEvents(listEl, scenario, timeHour) {
  if (!listEl) return

  const events = getEventsNearTime(scenario, timeHour, 12)
  if (!events.length) {
    listEl.innerHTML = `<div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; color: var(--vscode-statusBar-foreground);">No events near ${formatSimTime(timeHour)}.</div>`
    return
  }

  listEl.innerHTML = events
    .map(evt => {
      const icon = evt.type === 'signal'
        ? (evt.severity === 'warning' ? 'warning' : 'pulse')
        : evt.type === 'revision'
          ? 'edit'
          : evt.type === 'dsg_session'
            ? 'comment-discussion'
            : evt.type === 'escalation'
              ? 'arrow-up'
              : 'circle-filled'

      const color = evt.severity === 'warning'
        ? 'var(--status-warning)'
        : evt.severity === 'error'
          ? 'var(--status-error)'
          : 'var(--status-info)'

      const envelopeLabel = evt.envelopeId ? ` (${evt.envelopeId})` : ''

      return `
        <div style="display: flex; gap: 12px; padding: 12px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; align-items: center;">
          <span class="codicon codicon-${icon}" style="font-size: 20px; color: ${color}; flex-shrink: 0;"></span>
          <div style="flex: 1;">
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 11px; color: var(--vscode-statusBar-foreground); margin-bottom: 2px;">${formatSimTime(evt.hour)}</div>
            <div style="font-weight: 600; margin-bottom: 2px;">${evt.label || evt.type}${envelopeLabel}</div>
            <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">${evt.detail || ''}</div>
          </div>
        </div>
      `
    })
    .join('')
}
