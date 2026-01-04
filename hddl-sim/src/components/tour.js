// intro.js is lazy-loaded when tour starts to reduce initial bundle size
let introJsModule = null
let introJsCssLoaded = false

async function loadIntroJs() {
  if (!introJsModule) {
    // Load CSS if not already loaded
    if (!introJsCssLoaded) {
      await import('intro.js/introjs.css')
      introJsCssLoaded = true
    }
    // Load the module
    const module = await import('intro.js')
    introJsModule = module.default
  }
  return introJsModule
}

export function createTourButton(tourFunction = startTour) {
  const button = document.createElement('button')
  button.className = 'monaco-button tour-button'
  button.innerHTML = `
    <span class="codicon codicon-question"></span>
    <span class="tour-button-text">Explain this to me</span>
  `
  button.style.cssText = `
    background: #e5c300;
    color: #000;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    transition: all 0.2s;
  `
  
  button.addEventListener('mouseenter', () => {
    button.style.background = '#f5d300'
    button.style.transform = 'scale(1.05)'
  })
  
  button.addEventListener('mouseleave', () => {
    button.style.background = '#e5c300'
    button.style.transform = 'scale(1)'
  })
  
  button.addEventListener('click', () => {
    tourFunction()
  })
  
  return button
}

export async function startTour() {
  const introJs = await loadIntroJs()
  const intro = introJs()
  
  // Track if we need to restore aux panel state after tour
  let wasAuxCollapsed = document.body.classList.contains('aux-hidden')
  
  intro.setOptions({
    steps: [
      {
        title: 'Welcome to HDDL',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Human-Derived Decision Layer (HDDL)</strong> is a thought experiment and specification concept for reasoning about how Human-in-the-Loop (HITL) scales with autonomous agent fleets.</p>
            <p>This simulation helps visualize and understand how human judgment and authority can be captured in <em>decision envelopes</em> – boundaries that allow AI agents to operate autonomously within defined limits, escalating to humans only when needed.</p>
            <p style="margin-top: 12px;">Let's walk through the key components of this conceptual framework...</p>
          </div>
        `
      },
      {
        element: '.scenario-selector',
        title: 'Scenarios',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Choose from different <strong>scenarios</strong> to explore how HDDL applies across various domains.</p>
            <p>Each scenario demonstrates decision envelopes in different contexts – from baseball analytics to medical diagnostics to autonomous vehicles.</p>
            <p style="margin-top: 8px;">Try switching scenarios to see how the same patterns apply universally.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: '#steward-filter',
        title: 'Filter by Steward',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Use this <strong>filter</strong> to view envelopes from a specific steward's perspective.</p>
            <p>Filtering helps you understand how each steward role contributes to the system and maintains their domain's authority boundaries.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: '.timeline-bar',
        title: 'Timeline',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>The <strong>timeline</strong> shows how decision authority evolves over time.</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><strong>Purple bars</strong> = Envelope revisions (authority changes)</li>
              <li><strong>Red bars</strong> = Boundary interactions (escalations, overrides)</li>
              <li><strong>Blue/teal bars</strong> = Agent decisions within bounds</li>
            </ul>
            <p>Drag the scrubber to replay events and see how the system evolves.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: 'svg g.envelope-shape',
        title: 'Decision Envelopes',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Decision Envelopes</strong> define what AI agents can do autonomously.</p>
            <p>Each envelope has:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><strong>Domain</strong> – What area of the business</li>
              <li><strong>Window</strong> – How long it's valid</li>
              <li><strong>Assumptions</strong> – What conditions must be true</li>
              <li><strong>Constraints</strong> – What's prohibited</li>
            </ul>
            <p>The boxes show <span style="color: #90EE90;">OPEN</span> (active) envelopes currently in effect.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: 'svg g.agent-bot',
        title: 'Agent Fleets',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Agent Fleets</strong> are groups of AI agents that operate within envelopes.</p>
            <p>Each fleet:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Executes decisions autonomously when within bounds</li>
              <li>Checks envelopes before taking action</li>
              <li>Escalates to stewards when outside bounds</li>
            </ul>
            <p>Agents include analyzers, optimizers, monitors – specialized AI for different tasks.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        element: 'svg g.steward-icon',
        title: 'Stewards',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Stewards</strong> are humans who proactively define and maintain decision envelopes.</p>
            <p>Each steward:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Owns a domain (Sales, HR, Data, etc.)</li>
              <li>Defines authority boundaries for AI agents</li>
              <li>Reviews boundary interactions (escalations, overrides)</li>
              <li>Refines envelopes to expand autonomous operation</li>
            </ul>
            <p>The colored rings with person icons represent different steward roles.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: 'svg g.embedding-store',
        title: 'Decision Memory Embeddings',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Decision Memory</strong> uses embeddings to find similar past decisions.</p>
            <p>When an AI decision is made:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>It's embedded as a vector in semantic space</li>
              <li>Similar decisions cluster together</li>
              <li>The system learns patterns from past judgments</li>
            </ul>
            <p>This visualization shows how decisions relate to each other semantically, helping AI learn from human judgment patterns.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: '.scenario-gen-button',
        title: 'Generate Scenario (AI)',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Use <strong>Generate Scenario</strong> to create a custom scenario from a prompt.</p>
            <p>What happens next:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><strong>Scenario loads immediately</strong> – The simulation updates with your generated data</li>
              <li><strong>Narrative is auto-generated</strong> – A contextual explanation is created after generation</li>
              <li><strong>Optional refinement</strong> – Use instructions in the AI Narrative panel to steer the explanation</li>
            </ul>
            <p style="margin-top: 8px;">This is the fastest way to explore new domains without hand-authoring JSON.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        title: "You're Ready!",
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Now you understand the core HDDL concepts:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li style="margin-bottom: 6px;"><strong>Scenarios</strong> – Explore different domains</li>
              <li style="margin-bottom: 6px;"><strong>Filter by Steward</strong> – View from specific perspectives</li>
              <li style="margin-bottom: 6px;"><strong>Timeline</strong> – How authority evolves</li>
              <li style="margin-bottom: 6px;"><strong>Envelopes</strong> – Boundaries of AI authority</li>
              <li style="margin-bottom: 6px;"><strong>Stewards</strong> – Humans who maintain envelopes</li>
              <li style="margin-bottom: 6px;"><strong>Agent Fleets</strong> – AI operating within bounds</li>
              <li style="margin-bottom: 6px;"><strong>Embeddings</strong> – Learning from past decisions</li>
              <li style="margin-bottom: 6px;"><strong>Generate Scenario (AI)</strong> – Create a scenario + narrative</li>
            </ul>
            <p style="margin-top: 12px;">Explore the simulation by switching scenarios, filtering by steward, clicking envelopes, and scrubbing the timeline!</p>
          </div>
        `
      }
    ],
    showProgress: true,
    showBullets: true,
    exitOnOverlayClick: true,
    exitOnEsc: true,
    nextLabel: 'Next →',
    prevLabel: '← Back',
    doneLabel: 'Got it!'
  })
  
  // Before changing to each step, ensure auxiliary panel is open when needed
  intro.onbeforechange(function(targetElement) {
    // Only force-open the auxiliary panel if the step is targeting it.
    const isAuxStep = !!targetElement && (
      targetElement.classList?.contains('auxiliarybar') ||
      targetElement.closest?.('.auxiliarybar')
    )
    if (!isAuxStep) return

    if (document.body.classList.contains('aux-hidden')) {
      document.body.classList.remove('aux-hidden')
    }
  })
  
  // Restore original aux panel state when tour ends
  intro.onexit(function() {
    if (wasAuxCollapsed) {
      document.body.classList.add('aux-hidden')
    }
  })
  
  intro.start()
}

export async function startDTSTour() {
  const introJs = await loadIntroJs()
  const intro = introJs()
  
  intro.setOptions({
    steps: [
      {
        title: 'Decision Telemetry Stream',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Decision Telemetry Stream (DTS)</strong> is the event log for all HDDL system activity.</p>
            <p>Think of it as the "black box" that records:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Every AI decision made within envelopes</li>
              <li>Boundary interactions (escalations, overrides)</li>
              <li>Envelope revisions and authority changes</li>
              <li>Decision Stewardship Group (DSG) sessions</li>
            </ul>
            <p style="margin-top: 12px;">This query interface lets you explore the full decision history...</p>
          </div>
        `
      },
      {
        element: '#query-input',
        title: 'Query Interface',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Use the <strong>query interface</strong> to filter events using structured queries.</p>
            <p>Query syntax:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><code>type:boundary_interaction</code> – Filter by event type</li>
              <li><code>envelope:ENV-003</code> – Events for specific envelope</li>
              <li><code>actor:Sales Steward</code> – Events by specific actor</li>
              <li><code>severity:warning</code> – Filter by severity level</li>
            </ul>
            <p style="margin-top: 8px;">Combine filters with <code>|</code> (pipe) to create complex queries.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        element: '.query-chip',
        title: 'Quick Filters',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>Quick filter chips</strong> let you explore common queries with one click.</p>
            <p>Try clicking:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><strong>Boundary Interactions</strong> – See escalations and overrides</li>
              <li><strong>DSG Sessions</strong> – View steward calibration meetings</li>
              <li><strong>Warnings</strong> – Find concerning patterns</li>
            </ul>
            <p style="margin-top: 8px;">These chips help you quickly discover what's happening in the system.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        element: '#timeline-sync',
        title: 'Timeline Synchronization',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>The <strong>timeline sync</strong> feature filters events to match the current timeline position.</p>
            <p>When enabled:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Only events up to the current time are shown</li>
              <li>Scrubbing the timeline updates the event list in real-time</li>
              <li>Great for understanding system evolution step-by-step</li>
            </ul>
            <p style="margin-top: 8px;">Disable to see the full event history regardless of timeline position.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        element: '#stats-bar',
        title: 'Event Statistics',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>The <strong>stats bar</strong> shows a breakdown of your query results.</p>
            <p>See counts for:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Total events matching your query</li>
              <li>Event types (decisions, interactions, signals)</li>
              <li>Severity distribution (info, warning, error)</li>
            </ul>
            <p style="margin-top: 8px;">This helps you understand the overall pattern before diving into details.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        element: '#event-stream',
        title: 'Event Stream',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>The <strong>event stream</strong> displays matching events in chronological order.</p>
            <p>Each event shows:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><strong>Timestamp</strong> – When it occurred</li>
              <li><strong>Type</strong> – What kind of event</li>
              <li><strong>Actor</strong> – Who or what initiated it</li>
              <li><strong>Context</strong> – Envelope, status, severity</li>
            </ul>
            <p style="margin-top: 8px;">Click events to see full details and trace decision chains.</p>
          </div>
        `,
        position: 'top'
      },
      {
        element: '#steward-filter',
        title: 'Filter by Steward',
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Filter events by <strong>steward perspective</strong> to focus on specific domains.</p>
            <p>This updates both:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>The DTS event stream (scoped to that steward's envelopes)</li>
              <li>The home page visualization (if you navigate back)</li>
            </ul>
            <p style="margin-top: 8px;">Use this to understand how each steward role manages their authority domain.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        title: "You're Ready to Query!",
        intro: `
          <div style="font-size: 14px; line-height: 1.6;">
            <p>Now you understand the DTS interface:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li style="margin-bottom: 6px;"><strong>Query Interface</strong> – Filter events with structured syntax</li>
              <li style="margin-bottom: 6px;"><strong>Quick Filters</strong> – One-click exploration</li>
              <li style="margin-bottom: 6px;"><strong>Timeline Sync</strong> – Replay system evolution</li>
              <li style="margin-bottom: 6px;"><strong>Event Stream</strong> – View decision history</li>
              <li style="margin-bottom: 6px;"><strong>Statistics</strong> – Understand patterns</li>
            </ul>
            <p style="margin-top: 12px;">Try running queries to explore how AI agents operate within their envelopes and when they need human guidance!</p>
          </div>
        `
      }
    ],
    showProgress: true,
    showBullets: true,
    exitOnOverlayClick: true,
    exitOnEsc: true,
    nextLabel: 'Next →',
    prevLabel: '← Back',
    doneLabel: 'Done'
  })

  intro.start()
}
