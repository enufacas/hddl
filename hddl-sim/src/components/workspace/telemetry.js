// Telemetry system for DTS STREAM (Evidence tab)
// Handles narrative formatting, telemetry computation, and section rendering

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
  onFilterChange
} from '../../sim/sim-state'
import { getStewardColor, toSemver } from '../../sim/steward-colors'
import { initGlossaryInline } from '../glossary'
import {
  escapeAttr,
  displayEnvelopeId,
  isNarratableEventType,
  buildNarrativeEventKey,
  narrativePrimaryObjectType
} from './utils'

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

const telemetryNarrativeState = {
  lastTimeHour: null,
  lastUpdatedAtMs: 0,
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

  // Show all events from the start of the scenario up to current time
  // (no sliding window - preserve all narrative history during replay)
  const recent = events
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => e && typeof e.hour === 'number' && e.hour <= timeHour)
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
    <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: var(--vscode-statusBar-foreground);">Event Stream</div>
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
      collapsed: false,
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
      collapsed: false,
      renderContent: renderBoundaryBadges,
    },
    {
      title: 'Decision Quality',
      icon: 'graph-line',
      collapsed: false,
      metrics: [
        { label: 'Avg. Confidence', value: `${computed.avgConfidencePct}%`, icon: 'verified-filled', status: computed.avgConfidencePct >= 85 ? 'info' : computed.avgConfidencePct >= 70 ? 'warning' : 'error' },
        { label: 'Review Pending', value: String(computed.reviewPending), icon: 'eye', status: computed.reviewPending > 0 ? 'info' : 'muted' },
        { label: 'Breach Count', value: String(computed.breachCount), icon: 'error', status: computed.breachCount > 0 ? 'error' : 'muted' }
      ]
    },
    {
      title: 'Stewardship',
      icon: 'organization',
      collapsed: false,
      metrics: [
        { label: 'Active Stewards', value: String(computed.activeStewards), icon: 'person', status: computed.activeStewards > 0 ? 'info' : 'muted' },
        { label: 'Last Calibration', value: computed.lastCalibrationLabel, icon: 'history', status: 'muted' }
      ]
    },
    {
      title: 'Steward Fleets',
      icon: 'organization',
      collapsed: false,
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
  header.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 0; border-bottom: 1px solid var(--vscode-sideBar-border);';
  
  const chevron = document.createElement('span');
  chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
  chevron.style.cssText = 'font-size: 14px;';
  
  const icon = document.createElement('span');
  icon.className = `codicon codicon-${section.icon}`;
  icon.style.cssText = 'font-size: 16px;';
  
  const title = document.createElement('span');
  title.textContent = section.title;
  title.style.cssText = 'font-size: 12px; font-weight: 600; flex: 1;';
  
  header.appendChild(chevron);
  header.appendChild(icon);
  header.appendChild(title);
  
  // Section content
  const content = document.createElement('div');
  content.style.cssText = section.collapsed ? 'display: none; padding-top: 12px;' : 'display: block; padding-top: 12px;';
  
  // Toggle on click
  header.addEventListener('click', () => {
    section.collapsed = !section.collapsed;
    chevron.className = `codicon codicon-chevron-${section.collapsed ? 'right' : 'down'}`;
    content.style.display = section.collapsed ? 'none' : 'block';
  });
  
  // Render metrics if provided
  if (section.metrics && Array.isArray(section.metrics)) {
    section.metrics.forEach(metric => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--vscode-sideBar-border);';
      
      const labelContainer = document.createElement('div');
      labelContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const metricIcon = document.createElement('span');
      metricIcon.className = `codicon codicon-${metric.icon}`;
      metricIcon.style.cssText = `font-size: 14px; color: var(--status-${metric.status});`;
      
      const labelEl = document.createElement('span');
      if (metric.labelHtml) {
        labelEl.innerHTML = metric.labelHtml;
      } else {
        labelEl.textContent = metric.label;
      }
      labelEl.style.cssText = 'font-size: 12px;';
      
      labelContainer.appendChild(metricIcon);
      labelContainer.appendChild(labelEl);
      
      const valueEl = document.createElement('span');
      valueEl.textContent = metric.value;
      valueEl.style.cssText = `font-size: 12px; font-weight: 600; color: var(--status-${metric.status});`;
      
      row.appendChild(labelContainer);
      row.appendChild(valueEl);
      content.appendChild(row);
    });
  }
  
  // Render custom content if provided
  if (section.renderContent && typeof section.renderContent === 'function') {
    section.renderContent(content);
  }
  
  sectionContainer.appendChild(header);
  sectionContainer.appendChild(content);
  
  return sectionContainer;
}

export { updateTelemetry, computeTelemetry, buildTelemetryNarrative, createTelemetrySection }
