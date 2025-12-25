import * as d3 from 'd3'
import { formatSimTime, getEventsNearTime, getScenario, getTimeHour, onScenarioChange, onTimeChange } from '../sim/sim-state'

export function renderDecisionTelemetry(container) {
  container.innerHTML = `
    <div class="page-container">
      <h1>Signals & Outcomes</h1>
      <p class="subtitle">Observed signals evaluated against envelope assumptions</p>

      <div style="display:flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 12px 0 16px; padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-editorWidget-background);">
        <div style="display:flex; align-items:center; gap: 8px;">
          <span class="codicon codicon-calendar"></span>
          <div>
            <div style="font-size: 11px; color: var(--vscode-statusBar-foreground);">SELECTED TIME</div>
            <div id="signals-time" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${formatSimTime(getTimeHour())}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; color: var(--vscode-statusBar-foreground); font-size: 12px;">
          <span class="codicon codicon-info"></span>
          Signals are meaningful only relative to envelope assumptions.
        </div>
      </div>

      <div id="signals-feed" style="display:flex; flex-direction: column; gap: 12px; margin-bottom: 18px;"></div>
      
      <div class="telemetry-grid">
        <div class="telemetry-card">
          <h3>Judgment Drift</h3>
          <div id="drift-chart"></div>
        </div>
        
        <div class="telemetry-card">
          <h3>Decision Volume</h3>
          <div id="volume-chart"></div>
        </div>
        
        <div class="telemetry-card">
          <h3>Envelope Breaches</h3>
          <div id="breach-chart"></div>
        </div>
        
        <div class="telemetry-card">
          <h3>Steward Activity</h3>
          <div id="activity-chart"></div>
        </div>
      </div>
    </div>
  `

  const feed = container.querySelector('#signals-feed')
  const timeEl = container.querySelector('#signals-time')

  const theme = {
    fontColor: 'var(--vscode-editor-foreground)',
    mutedColor: 'var(--vscode-statusBar-foreground)',
    borderColor: 'var(--vscode-sideBar-border)',
  }

  function renderSignals() {
    const scenario = getScenario()
    const t = getTimeHour()
    if (timeEl) timeEl.textContent = formatSimTime(t)

    const events = getEventsNearTime(scenario, t, 6)
    const byEnvelope = new Map()
    for (const e of events) {
      const key = e.envelopeId || 'GLOBAL'
      if (!byEnvelope.has(key)) byEnvelope.set(key, [])
      byEnvelope.get(key).push(e)
    }

    const envelopeIndex = new Map((scenario?.envelopes ?? []).map(e => [e.envelopeId, e]))

    const sections = Array.from(byEnvelope.entries()).map(([envelopeId, items]) => {
      const env = envelopeIndex.get(envelopeId)
      const title = env ? `${env.envelopeId}: ${env.name}` : envelopeId
      const owner = env?.ownerRole

      const rows = items.map((evt) => {
        const icon = evt.type === 'signal'
          ? (evt.severity === 'warning' ? 'warning' : 'pulse')
          : evt.type === 'revision'
            ? 'edit'
            : evt.type === 'dsg_session'
              ? 'comment-discussion'
              : 'circle-filled'

        const color = evt.severity === 'warning'
          ? 'var(--status-warning)'
          : evt.severity === 'error'
            ? 'var(--status-error)'
            : 'var(--status-info)'

        const assumptionRefs = Array.isArray(evt.assumptionRefs) ? evt.assumptionRefs : []

        return `
          <div style="display:flex; gap: 10px; padding: 10px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-sideBar-background);">
            <span class="codicon codicon-${icon}" style="color: ${color}; margin-top: 2px;"></span>
            <div style="flex:1;">
              <div style="display:flex; justify-content: space-between; gap: 12px;">
                <div style="font-weight: 600;">${evt.label || evt.type}</div>
                <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; color: var(--vscode-statusBar-foreground);">${formatSimTime(evt.hour)}</div>
              </div>
              <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-top: 2px;">${evt.detail || ''}</div>
              ${assumptionRefs.length ? `
                <div style="margin-top: 8px; font-size: 12px;">
                  <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Assumption Link</div>
                  ${assumptionRefs.map(a => `<div style="display:flex; align-items:flex-start; gap: 6px; color: var(--vscode-statusBar-foreground);"><span class="codicon codicon-link" style="margin-top: 2px;"></span><span>${a}</span></div>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `
      }).join('')

      return `
        <div style="border: 1px solid var(--vscode-sideBar-border); border-radius: 8px; background: var(--vscode-editorWidget-background); padding: 12px;">
          <div style="display:flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 10px;">
            <div style="font-weight: 700;">${title}</div>
            ${owner ? `<div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">Owner: ${owner}</div>` : ''}
          </div>
          <div style="display:flex; flex-direction: column; gap: 10px;">${rows}</div>
        </div>
      `
    })

    feed.innerHTML = sections.length
      ? sections.join('')
      : `<div style="padding: 12px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; color: var(--vscode-statusBar-foreground);">No events near ${formatSimTime(t)}.</div>`
  }

  renderSignals()

  function renderTelemetryCharts() {
    const scenario = getScenario()
    const t = getTimeHour()
    const series = buildTelemetrySeries(scenario)
    createDriftChart(series, t, theme)
    createVolumeChart(scenario, t, theme)
    createBreachChart(series, t, theme)
    createActivityChart(scenario, t, theme)
  }

  renderTelemetryCharts()

  const unsubScenario = onScenarioChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderSignals()
    renderTelemetryCharts()
  })
  const unsubTime = onTimeChange(() => {
    if (!container.isConnected) { unsubScenario(); unsubTime(); return }
    renderSignals()
    renderTelemetryCharts()
  })
}

function buildTelemetrySeries(scenario) {
  const duration = Math.round(scenario?.durationHours ?? 48)
  const hours = Array.from({ length: duration + 1 }, (_, h) => ({ hour: h }))

  const events = (scenario?.events ?? [])
    .filter(e => typeof e?.hour === 'number')
    .slice()
    .sort((a, b) => a.hour - b.hour)

  const driftEvents = events.filter(e => e.type === 'signal' && typeof e.value === 'number' && String(e.signalKey || '').includes('drift'))
  let driftIdx = 0
  let lastDrift = 0

  return hours.map(({ hour }) => {
    while (driftIdx < driftEvents.length && driftEvents[driftIdx].hour <= hour) {
      lastDrift = Number(driftEvents[driftIdx].value)
      driftIdx++
    }

    const window6 = events.filter(e => e.hour > hour - 6 && e.hour <= hour)
    const window12 = events.filter(e => e.hour > hour - 12 && e.hour <= hour)

    const warningSignals6 = window6.filter(e => e.type === 'signal' && (e.severity === 'warning' || e.severity === 'error'))
    const breaches = warningSignals6.length
    const volume = window6.length
    const activity = window12.filter(e => e.type === 'revision' || e.type === 'dsg_session').length

    const derivedDrift = lastDrift || Math.min(0.25, breaches * 0.05)

    return {
      hour,
      drift: derivedDrift,
      breaches,
      volume,
      activity,
    }
  })
}

function styleAxis(axisG, { fontColor, borderColor }) {
  axisG.selectAll('text').attr('fill', fontColor)
  axisG.selectAll('path').attr('stroke', borderColor)
  axisG.selectAll('line').attr('stroke', borderColor)
}

function drawCurrentTimeMarker(svg, x, height, t, { borderColor }) {
  svg.append('line')
    .attr('x1', x(t))
    .attr('x2', x(t))
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', borderColor)
    .attr('stroke-dasharray', '4,3')
    .attr('opacity', 0.9)
}

function createDriftChart(series, t, theme) {
  d3.select('#drift-chart').selectAll('*').remove()

  const margin = { top: 16, right: 16, bottom: 30, left: 46 }
  const width = 400 - margin.left - margin.right
  const height = 250 - margin.top - margin.bottom

  const svg = d3.select('#drift-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3.scaleLinear()
    .domain([0, d3.max(series, d => d.hour) ?? 48])
    .range([0, width])

  const yMax = Math.max(0.25, d3.max(series, d => d.drift) ?? 0.25)
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([height, 0])

  const line = d3.line()
    .x(d => x(d.hour))
    .y(d => y(d.drift))
    .curve(d3.curveMonotoneX)

  svg.append('path')
    .datum(series)
    .attr('fill', 'none')
    .attr('stroke', 'var(--status-warning)')
    .attr('stroke-width', 2)
    .attr('d', line)

  drawCurrentTimeMarker(svg, x, height, t, theme)

  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}h`))

  const yAxis = svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`))

  styleAxis(xAxis, theme)
  styleAxis(yAxis, theme)

  const atHour = Math.max(0, Math.min(series[series.length - 1]?.hour ?? 0, Math.round(t)))
  const current = series[atHour]?.drift ?? series[series.length - 1]?.drift ?? 0
  svg.append('text')
    .attr('x', 0)
    .attr('y', -4)
    .attr('fill', theme.fontColor)
    .style('font-size', '12px')
    .style('font-weight', '600')
    .text(`Current: ${Math.round(current * 100)}%`)
}

function createBreachChart(series, t, theme) {
  d3.select('#breach-chart').selectAll('*').remove()

  const margin = { top: 16, right: 16, bottom: 30, left: 46 }
  const width = 400 - margin.left - margin.right
  const height = 250 - margin.top - margin.bottom

  const svg = d3.select('#breach-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3.scaleLinear()
    .domain([0, d3.max(series, d => d.hour) ?? 48])
    .range([0, width])

  const y = d3.scaleLinear()
    .domain([0, Math.max(3, d3.max(series, d => d.breaches) ?? 0)])
    .nice()
    .range([height, 0])

  const line = d3.line()
    .x(d => x(d.hour))
    .y(d => y(d.breaches))
    .curve(d3.curveMonotoneX)

  svg.append('path')
    .datum(series)
    .attr('fill', 'none')
    .attr('stroke', 'var(--status-error)')
    .attr('stroke-width', 2)
    .attr('d', line)

  drawCurrentTimeMarker(svg, x, height, t, theme)

  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}h`))

  const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(5))
  styleAxis(xAxis, theme)
  styleAxis(yAxis, theme)
}

function createVolumeChart(scenario, t, theme) {
  d3.select('#volume-chart').selectAll('*').remove()

  const envelopes = scenario?.envelopes ?? []
  const events = scenario?.events ?? []
  const window = events.filter(e => typeof e?.hour === 'number' && e.hour >= (t - 6) && e.hour <= (t + 6))

  const byEnv = new Map(envelopes.map(e => [e.envelopeId, 0]))
  for (const e of window) {
    if (e.envelopeId && byEnv.has(e.envelopeId)) byEnv.set(e.envelopeId, byEnv.get(e.envelopeId) + 1)
  }
  const data = Array.from(byEnv.entries()).map(([envelopeId, value]) => ({ envelopeId, value }))

  const margin = { top: 16, right: 16, bottom: 60, left: 46 }
  const width = 400 - margin.left - margin.right
  const height = 250 - margin.top - margin.bottom

  const svg = d3.select('#volume-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3.scaleBand()
    .domain(data.map(d => d.envelopeId))
    .range([0, width])
    .padding(0.2)

  const y = d3.scaleLinear()
    .domain([0, Math.max(3, d3.max(data, d => d.value) ?? 0)])
    .nice()
    .range([height, 0])

  svg.selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', d => x(d.envelopeId))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.value))
    .attr('fill', 'var(--status-info)')
    .attr('rx', 4)
    .attr('opacity', 0.9)

  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
  xAxis.selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')

  const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(5))
  styleAxis(xAxis, theme)
  styleAxis(yAxis, theme)

  svg.append('text')
    .attr('x', 0)
    .attr('y', -4)
    .attr('fill', theme.fontColor)
    .style('font-size', '12px')
    .style('font-weight', '600')
    .text(`Events (+/- 6h around ${formatSimTime(t)})`)
}

function createActivityChart(scenario, t, theme) {
  d3.select('#activity-chart').selectAll('*').remove()

  const envelopes = scenario?.envelopes ?? []
  const events = scenario?.events ?? []
  const window = events.filter(e => typeof e?.hour === 'number' && e.hour >= (t - 12) && e.hour <= t)

  const byEnv = new Map(envelopes.map(e => [e.envelopeId, { revisions: 0, dsg: 0 }]))
  for (const e of window) {
    if (!e.envelopeId || !byEnv.has(e.envelopeId)) continue
    const row = byEnv.get(e.envelopeId)
    if (e.type === 'revision') row.revisions++
    if (e.type === 'dsg_session') row.dsg++
  }
  const data = Array.from(byEnv.entries()).map(([envelopeId, v]) => ({ envelopeId, value: v.revisions + v.dsg }))

  const margin = { top: 16, right: 16, bottom: 30, left: 70 }
  const width = 400 - margin.left - margin.right
  const height = 250 - margin.top - margin.bottom

  const svg = d3.select('#activity-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const y = d3.scaleBand()
    .domain(data.map(d => d.envelopeId))
    .range([0, height])
    .padding(0.25)

  const x = d3.scaleLinear()
    .domain([0, Math.max(3, d3.max(data, d => d.value) ?? 0)])
    .nice()
    .range([0, width])

  svg.selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', 0)
    .attr('y', d => y(d.envelopeId))
    .attr('width', d => x(d.value))
    .attr('height', y.bandwidth())
    .attr('fill', 'var(--status-success)')
    .attr('opacity', 0.55)
    .attr('rx', 3)

  const yAxis = svg.append('g').call(d3.axisLeft(y))
  const xAxis = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))

  styleAxis(xAxis, theme)
  styleAxis(yAxis, theme)

  svg.append('text')
    .attr('x', 0)
    .attr('y', -4)
    .attr('fill', theme.fontColor)
    .style('font-size', '12px')
    .style('font-weight', '600')
    .text(`Steward activity (last 12h to ${formatSimTime(t)})`)
}
