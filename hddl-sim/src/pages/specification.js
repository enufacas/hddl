// HDDL Specification Explorer
export function render(container) {
  container.innerHTML = ''

  const escapeHtml = (text) => {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  const highlightJsonString = (jsonText) => {
    // Tokenize JSON string and wrap in spans.
    // Keys are strings immediately followed by a colon.
    const tokenRegex = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*?")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

    let html = ''
    let lastIndex = 0
    let match

    while ((match = tokenRegex.exec(jsonText)) !== null) {
      if (match.index > lastIndex) {
        html += escapeHtml(jsonText.slice(lastIndex, match.index))
      }

      if (match[1]) {
        // Key (includes trailing colon)
        const raw = match[1]
        const colonIndex = raw.lastIndexOf(':')
        const keyPart = raw.slice(0, colonIndex).trimEnd()
        const spacing = raw.slice(keyPart.length, colonIndex)
        html += `<span class="spec-json-key">${escapeHtml(keyPart)}</span>${escapeHtml(spacing)}:`
      } else if (match[2]) {
        html += `<span class="spec-json-string">${escapeHtml(match[2])}</span>`
      } else if (match[3]) {
        const literal = match[3]
        const cls = literal === 'null' ? 'spec-json-null' : 'spec-json-boolean'
        html += `<span class="${cls}">${escapeHtml(literal)}</span>`
      } else if (match[4]) {
        html += `<span class="spec-json-number">${escapeHtml(match[4])}</span>`
      }

      lastIndex = tokenRegex.lastIndex
    }

    if (lastIndex < jsonText.length) {
      html += escapeHtml(jsonText.slice(lastIndex))
    }

    return html
  }

  const createJsonBlock = (title, value) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'spec-json-section'

    const heading = document.createElement('h3')
    heading.className = 'spec-subtitle'
    heading.textContent = title

    const pre = document.createElement('pre')
    pre.className = 'spec-json-pre'
    const code = document.createElement('code')
    code.className = 'spec-json-code'

    const jsonText = JSON.stringify(value, null, 2)
    code.innerHTML = highlightJsonString(jsonText)

    pre.appendChild(code)
    wrapper.appendChild(heading)
    wrapper.appendChild(pre)
    return wrapper
  }

  const root = document.createElement('div')
  root.className = 'page-container'
  root.style.maxWidth = '1200px'
  root.style.margin = '0 auto'

  root.innerHTML = `
    <style>
      .spec-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px;
        border: 1px solid var(--vscode-sideBar-border);
        border-radius: 10px;
        background: color-mix(in srgb, var(--vscode-editor-background) 75%, var(--vscode-sideBar-background));
        margin-bottom: 20px;
      }

      .spec-hero-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .spec-hero-icon {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: color-mix(in srgb, var(--vscode-button-background) 12%, var(--vscode-sideBar-background));
        border: 1px solid var(--vscode-sideBar-border);
        flex: 0 0 auto;
      }

      .spec-title {
        margin: 0;
        font-size: 22px;
        line-height: 1.2;
      }

      .spec-subtitleline {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: var(--vscode-statusBar-foreground);
      }

      .spec-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .spec-card {
        border: 1px solid var(--vscode-sideBar-border);
        border-radius: 10px;
        overflow: hidden;
        background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, var(--vscode-editor-background));
      }

      .spec-card-header {
        padding: 14px 16px;
        background: color-mix(in srgb, var(--vscode-button-background) 10%, var(--vscode-sideBar-background));
        border-bottom: 1px solid var(--vscode-sideBar-border);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
      }

      .spec-card-header:hover {
        background: color-mix(in srgb, var(--vscode-button-background) 14%, var(--vscode-sideBar-background));
      }

      .spec-card-title {
        margin: 0 0 4px 0;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .spec-card-desc {
        margin: 0;
        font-size: 13px;
        color: var(--vscode-statusBar-foreground);
      }

      .spec-card-content {
        padding: 16px;
        display: none;
      }

      .spec-two-col {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      @media (max-width: 900px) {
        .spec-two-col {
          grid-template-columns: 1fr;
        }
      }

      .spec-subtitle {
        margin: 0 0 10px 0;
        font-size: 12px;
        color: var(--vscode-statusBar-foreground);
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .spec-json-pre {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-sideBar-border);
        border-radius: 8px;
        padding: 14px;
        overflow-x: auto;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
      }

      .spec-json-code {
        color: var(--vscode-editor-foreground);
      }

      /* Use app-defined status tokens (guaranteed in style-workspace.css). */
      .spec-json-key { color: var(--status-info); font-weight: 600; }
      .spec-json-string { color: var(--status-success); }
      .spec-json-number { color: var(--status-warning); }
      .spec-json-boolean { color: var(--status-info); }
      .spec-json-null { color: var(--status-error); }
    </style>

    <div class="spec-hero">
      <div class="spec-hero-left">
        <div class="spec-hero-icon"><span class="codicon codicon-json" style="font-size: 20px;"></span></div>
        <div style="min-width: 0;">
          <h1 class="spec-title">Human-Derived Decision Layer (HDDL) Specification</h1>
          <p class="spec-subtitleline">JSON schema definitions for HDDL system objects</p>
        </div>
      </div>
    </div>

    <div id="spec-content" class="spec-grid"></div>
  `

  container.appendChild(root)

  const specContent = root.querySelector('#spec-content')

  // Define the specifications for each object type
  const specifications = [
    {
      title: 'Scenario',
      description: 'Complete simulation scenario with envelopes, fleets, and events.',
      schema: {
        schemaVersion: 'number (schema version)',
        id: 'string (scenario identifier)',
        title: 'string (scenario name)',
        durationHours: 'number (total duration)',
        envelopes: 'DecisionEnvelope[] (array of envelopes)',
        fleets: 'AgentFleet[] (array of fleets)',
        events: 'DTSEvent[] (array of events)'
      },
      example: {
        schemaVersion: 2,
        id: 'scenario-default-002',
        title: 'HDDL Replay (Simplified)',
        durationHours: 48,
        envelopes: [],
        fleets: [],
        events: []
      }
    },
    {
      title: 'Decision Envelope',
      description: 'Defines a bounded context of decision authority with assumptions and constraints.',
      schema: {
        envelopeId: 'string (unique identifier)',
        name: 'string (human-readable name)',
        domain: 'string (business domain)',
        ownerRole: 'string (steward role)',
        createdHour: 'number (simulation time)',
        endHour: 'number (simulation time)',
        accent: 'string (CSS color)',
        envelope_version: 'number (version number)',
        revision_id: 'string | null (revision identifier)',
        assumptions: 'string[] (operating conditions)',
        constraints: 'string[] (hard boundaries)'
      },
      example: {
        envelopeId: 'ENV-001',
        name: 'Customer Service Responses',
        domain: 'Customer Service',
        ownerRole: 'Customer Steward',
        createdHour: 2,
        endHour: 18,
        accent: 'var(--status-info)',
        envelope_version: 1,
        revision_id: null,
        assumptions: [
          'Customer tone analysis is accurate.',
          'Refunds over $100 require human review.'
        ],
        constraints: [
          'No automated refunds above $100',
          'Require human confirmation for account closures'
        ]
      }
    },
    {
      title: 'Agent Fleet',
      description: 'A collection of AI agents that operate within decision envelopes, owned by a steward.',
      schema: {
        stewardRole: 'string (owning steward)',
        agents: 'Agent[] (array of agents)'
      },
      example: {
        stewardRole: 'Customer Steward',
        agents: [
          {
            agentId: 'CustomerSupportBot',
            name: 'Support Bot',
            role: 'Customer Support Agent',
            envelopeIds: ['ENV-001']
          }
        ]
      }
    },
    {
      title: 'Agent',
      description: 'Individual AI agent that operates within assigned decision envelopes.',
      schema: {
        agentId: 'string (unique identifier)',
        name: 'string (display name)',
        role: 'string (agent role/capability)',
        envelopeIds: 'string[] (assigned envelopes)'
      },
      example: {
        agentId: 'CustomerSupportBot',
        name: 'Support Bot',
        role: 'Customer Support Agent',
        envelopeIds: ['ENV-001', 'ENV-002']
      }
    },
    {
      title: 'Event',
      description: 'Base event schema for Decision Telemetry Standard (DTS) events. All events share these core fields, with additional type-specific fields.',
      schema: {
        eventId: 'string (unique identifier)',
        hour: 'number (simulation time)',
        type: 'string (see Event Types below)',
        envelopeId: 'string (related envelope)',
        severity: '"info" | "warning" | "error"',
        label: 'string (short description)',
        detail: 'string (detailed description)',
        actorName: 'string (who performed action)',
        actorRole: 'string (role of actor)',
        '...': 'type-specific fields'
      },
      example: {
        eventId: 'decision:4:ENV-001:0',
        hour: 4,
        type: 'decision',
        envelopeId: 'ENV-001',
        severity: 'info',
        label: 'Automated response sent',
        detail: 'System provided pre-approved response to common inquiry',
        actorName: 'CustomerSupportBot',
        actorRole: 'Support Bot',
        status: 'allowed'
      }
    }
  ]

  const eventTypes = [
    {
      type: 'signal',
      description: 'Telemetry or outcome divergence detected',
      fields: 'signalKey, value, assumptionRefs'
    },
    {
      type: 'decision',
      description: 'Agent execution inside envelope bounds',
      fields: 'agentId, status (allowed/blocked)'
    },
    {
      type: 'boundary_interaction',
      description: 'Agent reached envelope boundary',
      fields: 'boundary_kind (escalated/deferred/overridden), boundary_reason, boundary_refs'
    },
    {
      type: 'revision',
      description: 'Steward updated envelope authority',
      fields: 'revision_id, envelope_version, nextAssumptions, nextConstraints, resolvesEventId'
    },
    {
      type: 'embedding',
      description: 'Decision memory vector stored',
      fields: 'embeddingId, embeddingType, sourceEventId, semanticContext, semanticVector'
    },
    {
      type: 'retrieval',
      description: 'Agent queried decision memory',
      fields: 'queryText, retrievedEmbeddings, relevanceScores'
    },
    {
      type: 'dsg_session',
      description: 'Decision Stewardship Group governance session',
      fields: 'sessionId, facilitatorRole, involvedEnvelopeIds, resolutionPolicy'
    }
  ]

  // Render each specification
  specifications.forEach(spec => {
    const section = document.createElement('div')
    section.className = 'spec-card'

    const header = document.createElement('div')
    header.className = 'spec-card-header'
    
    const headerContent = document.createElement('div')
    headerContent.innerHTML = `
      <h2 class="spec-card-title">
        <span class="codicon codicon-symbol-class"></span>
        ${spec.title}
      </h2>
      <p class="spec-card-desc">${spec.description}</p>
    `
    
    const chevron = document.createElement('span')
    chevron.className = 'codicon codicon-chevron-down'
    chevron.style.cssText = 'font-size: 20px; transition: transform 0.2s;'
    
    header.appendChild(headerContent)
    header.appendChild(chevron)

    const content = document.createElement('div')
    content.className = 'spec-card-content'

    const twoCol = document.createElement('div')
    twoCol.className = 'spec-two-col'
    twoCol.appendChild(createJsonBlock('Schema', spec.schema))
    twoCol.appendChild(createJsonBlock('Example', spec.example))
    content.appendChild(twoCol)

    // Toggle functionality
    let isExpanded = false
    header.addEventListener('click', () => {
      isExpanded = !isExpanded
      content.style.display = isExpanded ? 'block' : 'none'
      chevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
    })

    section.appendChild(header)
    section.appendChild(content)
    specContent.appendChild(section)
  })

  // Add Event Types section
  const eventTypesSection = document.createElement('div')
  eventTypesSection.style.cssText = 'margin-top: 32px; padding-top: 24px; border-top: 2px solid var(--vscode-sideBar-border);'
  eventTypesSection.innerHTML = `
    <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: var(--vscode-foreground);">
      <span class="codicon codicon-symbol-event" style="margin-right: 8px;"></span>
      Event Types
    </h2>
    <p style="font-size: 14px; color: var(--vscode-descriptionForeground); margin-bottom: 24px;">
      All events share the base Event schema. Each type adds specific fields for its purpose.
    </p>
  `

  const eventTypesGrid = document.createElement('div')
  eventTypesGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;'

  eventTypes.forEach(evt => {
    const card = document.createElement('div')
    card.style.cssText = `
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 6px;
      padding: 16px;
    `
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <code style="
          background: color-mix(in srgb, var(--vscode-textLink-foreground) 15%, transparent);
          color: var(--vscode-textLink-foreground);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
        ">${evt.type}</code>
      </div>
      <p style="font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${evt.description}
      </p>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); opacity: 0.8;">
        <strong>Additional fields:</strong> ${evt.fields}
      </div>
    `
    eventTypesGrid.appendChild(card)
  })

  eventTypesSection.appendChild(eventTypesGrid)
  specContent.appendChild(eventTypesSection)
}
