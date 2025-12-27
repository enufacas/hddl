// HDDL Specification Explorer
export function render(container) {
  container.innerHTML = ''

  const root = document.createElement('div')
  root.className = 'page-container'
  root.style.maxWidth = '1200px'
  root.style.margin = '0 auto'

  root.innerHTML = `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span class="codicon codicon-json" style="font-size: 28px;"></span>
        <div>
          <h1 style="margin: 0;">Human-Derived Decision Layer (HDDL) Specification</h1>
          <p style="margin: 0; font-size: 13px; color: var(--vscode-statusBar-foreground);">JSON schema definitions for HDDL system objects</p>
        </div>
      </div>
    </div>

    <div id="spec-content" style="display: flex; flex-direction: column; gap: 24px;"></div>
  `

  container.appendChild(root)

  const specContent = root.querySelector('#spec-content')

  // Define the specifications for each object type
  const specifications = [
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
      description: 'A collection of AI agents that operate within decision envelopes.',
      schema: {
        stewardRole: 'string (owning steward)',
        agents: 'Agent[] (array of agents)'
      },
      example: {
        stewardRole: 'Customer Steward',
        agents: [
          {
            agentId: 'CustomerSupportBot',
            role: 'Support Bot',
            capabilities: ['analyze sentiment', 'suggest responses', 'escalate issues']
          }
        ]
      }
    },
    {
      title: 'DTS Event',
      description: 'Decision Telemetry Standard event for tracking system activity.',
      schema: {
        eventId: 'string (unique identifier)',
        hour: 'number (simulation time)',
        type: 'string (event type)',
        envelopeId: 'string (related envelope)',
        severity: '"info" | "warning" | "error"',
        label: 'string (short description)',
        detail: 'string (detailed description)',
        actorName: 'string (who performed action)',
        actorRole: 'string (role of actor)',
        boundaryType: 'string (boundary interaction type)',
        assumptionRefs: 'string[] (referenced assumptions)',
        nextAssumptions: 'string[] (new assumptions)',
        nextConstraints: 'string[] (new constraints)',
        boundary_refs: 'string[] (related boundaries)',
        involvedEnvelopeIds: 'string[] (affected envelopes)',
        impactSummary: 'string[] (impact descriptions)',
        resolutionPolicy: 'string[] (resolution policies)',
        artifactOutput: 'string[] (generated artifacts)',
        semanticVector: 'number[] (embedding vector)',
        value: 'number (numeric value)'
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
        assumptionRefs: ['tone-analysis-accurate'],
        boundary_refs: [],
        semanticVector: [0.75, 0.25, 0.45]
      }
    },
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
      title: 'Boundary Interaction',
      description: 'Interaction with decision envelope boundaries (escalation, override, etc.).',
      schema: {
        type: '"boundary_interaction"',
        boundaryType: 'string (interaction type)',
        reason: 'string (why interaction occurred)',
        resolution: 'string (how resolved)'
      },
      example: {
        eventId: 'boundary_interaction:12:ENV-001:5',
        hour: 12,
        type: 'boundary_interaction',
        envelopeId: 'ENV-001',
        severity: 'warning',
        label: 'Escalation required',
        detail: 'Request exceeded automated authority',
        boundaryType: 'manual_review_required',
        reason: 'Refund amount ($125) exceeds automated threshold',
        actorName: 'CustomerSupportBot'
      }
    },
    {
      title: 'Decision Memory Entry',
      description: 'Semantic embedding of decisions for recall and pattern matching.',
      schema: {
        decision_id: 'string (unique identifier)',
        envelope_id: 'string (source envelope)',
        actor_name: 'string (who made decision)',
        hour: 'number (when decision made)',
        semanticVector: 'number[] (embedding)',
        confidence: 'number (0-1)',
        context: 'string (decision context)'
      },
      example: {
        decision_id: 'dec_001',
        envelope_id: 'ENV-001',
        actor_name: 'CustomerSupportBot',
        hour: 4,
        semanticVector: [0.75, 0.25, 0.45, 0.82],
        confidence: 0.92,
        context: 'Approved refund for defective product'
      }
    }
  ]

  // Render each specification
  specifications.forEach(spec => {
    const section = document.createElement('div')
    section.style.cssText = `
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 8px;
      overflow: hidden;
    `

    const header = document.createElement('div')
    header.style.cssText = `
      padding: 16px;
      background: color-mix(in srgb, var(--vscode-button-background) 10%, var(--vscode-sideBar-background));
      border-bottom: 1px solid var(--vscode-sideBar-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    `
    
    const headerContent = document.createElement('div')
    headerContent.innerHTML = `
      <h2 style="margin: 0 0 4px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
        <span class="codicon codicon-symbol-class"></span>
        ${spec.title}
      </h2>
      <p style="margin: 0; font-size: 13px; color: var(--vscode-statusBar-foreground);">${spec.description}</p>
    `
    
    const chevron = document.createElement('span')
    chevron.className = 'codicon codicon-chevron-down'
    chevron.style.cssText = 'font-size: 20px; transition: transform 0.2s;'
    
    header.appendChild(headerContent)
    header.appendChild(chevron)

    const content = document.createElement('div')
    content.style.cssText = `
      padding: 16px;
      display: none;
    `

    // Schema section
    const schemaSection = document.createElement('div')
    schemaSection.style.marginBottom = '20px'
    schemaSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: var(--vscode-statusBar-foreground); text-transform: uppercase; letter-spacing: 0.5px;">Schema</h3>'
    
    const schemaPre = document.createElement('pre')
    schemaPre.style.cssText = `
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
    `
    schemaPre.textContent = JSON.stringify(spec.schema, null, 2)

    schemaSection.appendChild(schemaPre)
    content.appendChild(schemaSection)

    // Example section
    const exampleSection = document.createElement('div')
    exampleSection.innerHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; color: var(--vscode-statusBar-foreground); text-transform: uppercase; letter-spacing: 0.5px;">Example</h3>'
    
    const examplePre = document.createElement('pre')
    examplePre.style.cssText = `
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-sideBar-border);
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
    `
    examplePre.textContent = JSON.stringify(spec.example, null, 2)

    exampleSection.appendChild(examplePre)
    content.appendChild(exampleSection)

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
}
