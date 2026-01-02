// HDDL glossary for tooltips
const HDDL_GLOSSARY = {
  'envelope': 'A versioned, steward-owned boundary defining what automation/agents may do, under what constraints, and what must be escalated.',
  'steward': 'A domain-aligned human who holds bounded decision authority. Stewards define and revise envelopes, arbitrate domain conflicts, and preserve human judgment under scale.',
  'boundary interaction': 'When execution reaches an envelope boundary (escalated, overridden, deferred). These are key signals for steward review.',
  'revision': 'An authoritative change to an envelope\'s assumptions or constraints. Revisions create lineage and make authority changes inspectable.',
  'feedback loop': 'The pattern where boundary interactions trigger steward decisions, leading to envelope revisions that update agent behavior.',
  'decision memory': 'AI-assisted recall layer (embeddings) derived from past decisions and events. Supports precedent discovery but does not hold authority.',
  'embedding': 'A vectorized memory of a decision, event, or boundary interaction, used for AI recall and precedent discovery.',
  'agent': 'An automated system or process operating within the constraints of an envelope, subject to escalation and revision by stewards.'
}

// Workspace layout component
import { navigateTo } from '../router';
import { formatSimTime, getBoundaryInteractionCounts, getEnvelopeStatus, getScenario, getTimeHour, onScenarioChange, onTimeChange, getStewardFilter, onFilterChange, getEnvelopeAtTime, getRevisionDiffAtTime, setTimeHour } from '../sim/sim-state'
import { getCurrentScenarioId } from '../sim/scenario-loader'
import { initGlossaryInline } from './glossary'
import { getStewardColor, toSemver } from '../sim/steward-colors'
import { ResizablePanel, initPanelKeyboardShortcuts, PANEL_DEFAULTS, loadPanelWidth, savePanelWidth } from './resizable-panel'
import { createEnvelopeDetailModal } from './envelope-detail'

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
  
  // Remove inline CSS variable set by layout manager to let CSS rules take effect
  if (!collapsed) {
    document.documentElement.style.removeProperty('--auxiliarybar-width')
  }
  
  const state = loadLayoutState()
  saveLayoutState({ ...state, auxCollapsed: Boolean(collapsed) })
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

// AI Narrative state and functions (defined early for use in createSidebar)
let aiNarrativeGenerated = false
let aiNarrativeCitations = []
let aiNarrativeSyncEnabled = false
let aiNarrativeFullHtml = ''
let aiNarrativeUserAddendum = ''
let aiNarrativeTimeHooked = false
const aiNarrativeCache = {} // Cache generated narratives per scenario: { scenarioKey: { html, citations, generated } }
let aiNarrativeCurrentScenario = null // Track current scenario for caching on switch

// Helper to rewire citation click handlers
const rewireCitationLinks = (containerEl) => {
  containerEl.querySelectorAll('.citation-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const eventId = link.dataset.eventId
      const citation = aiNarrativeCitations.find(c => c.eventId === eventId)
      if (citation?.hour !== undefined) {
        setTimeHour(citation.hour)
      }
    })
  })
}

// Update narrative visibility based on current timeline position
const updateNarrativeSync = () => {
  if (!aiNarrativeSyncEnabled || !aiNarrativeFullHtml) return
  
  const contentEl = document.querySelector('#ai-narrative-content')
  if (!contentEl) return
  
  const currentTime = getTimeHour()
  console.log(`\n=== Timeline Sync Update: currentTime=${currentTime}h ===`)
  
  // Simply show/hide elements based on their data-reveal-time metadata
  const elements = contentEl.querySelectorAll('[data-reveal-time]')
  console.log(`Found ${elements.length} elements with reveal times`)
  
  let visibleCount = 0
  let hiddenCount = 0
  
  elements.forEach((el, idx) => {
    const revealTime = parseFloat(el.dataset.revealTime)
    const shouldShow = revealTime <= currentTime
    
    if (shouldShow) {
      el.style.opacity = '1'
      el.style.filter = 'none'
      visibleCount++
    } else {
      el.style.opacity = '0.15'
      el.style.filter = 'blur(3px)'
      hiddenCount++
    }
    
    // Log first few and last few for debugging
    if (idx < 3 || idx >= elements.length - 3) {
      const text = el.textContent.substring(0, 40).replace(/\s+/g, ' ')
      console.log(`  [${idx}] revealTime=${revealTime}, show=${shouldShow}: "${text}..."`)
    } else if (idx === 3 && elements.length > 6) {
      console.log(`  ... (${elements.length - 6} more elements) ...`)
    }
  })
  
  console.log(`Visibility: ${visibleCount} shown, ${hiddenCount} hidden`)
  console.log('=== End Sync Update ===\n')
}

// Simple markdown renderer for AI narratives
const renderNarrativeMarkdown = (markdown) => {
  // Split into paragraphs first
  const paragraphs = String(markdown || '').split(/\n\n+/)

  const processedParagraphs = paragraphs.map(para => {
    let html = para.trim()
    if (!html) return ''

    // Headers
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Single line breaks within paragraphs
    html = html.replace(/\n/g, '<br>')

    // Wrap in paragraph tag if not a header or code block
    if (!html.startsWith('<h') && !html.startsWith('<pre>')) {
      html = `<p>${html}</p>`
    }

    return html
  })

  // Join HTML and inject tooltips only into text nodes using DOMParser
  let htmlOut = processedParagraphs.join('')
  // Tooltip logic removed: narrative markdown is rendered as plain HTML only
  return htmlOut
}

// Process narrative markdown with citations into styled HTML
// Shared by both loadPreGeneratedNarrative and generateAINarrative
const processNarrativeWithCitations = (markdown, citations, scenario) => {
  // Render markdown with clickable citations
  let html = renderNarrativeMarkdown(markdown)
  
  // Event type color mapping
  const eventColors = {
    decision: '#98d4a0',
    boundary_interaction: '#f0b866',
    envelope_promoted: '#c4a7e7',
    dsg_session: '#f0b866',
    embedding: '#b4a7e7',
    retrieval: '#58a6ff'
  }

  // Helper: convert hour to day start (0, 24, 48, etc.)
  const hourToDay = (hour) => Math.floor(hour / 24) * 24

  // Process each paragraph with citation styling and timeline reveals
  let currentNarrativeDay = 0 // Track day-based position for uncited paragraphs

  html = html.replace(/<p>(.*?)<\/p>/gs, (match, paragraphContent) => {
    // Find all citations in this paragraph
    const citationsInPara = []
    let tempContent = paragraphContent
    tempContent.replace(/\^\[([^\]]+)\]/g, (match, eventId, offset) => {
      citationsInPara.push({ eventId, offset })
      return match
    })

    // Find earliest citation hour for this paragraph
    let paragraphDay = currentNarrativeDay
    if (citationsInPara.length > 0) {
      let earliestHour = Infinity
      citationsInPara.forEach(({ eventId }) => {
        const citation = citations.find(c => c.eventId === eventId)
        if (citation?.hour !== undefined) {
          earliestHour = Math.min(earliestHour, citation.hour)
        }
      })

      if (earliestHour !== Infinity) {
        paragraphDay = hourToDay(earliestHour)
        currentNarrativeDay = paragraphDay
      }
    }

    // Replace citations with placeholders to preserve sentence structure
    let workingContent = paragraphContent
    citationsInPara.forEach((cit, idx) => {
      workingContent = workingContent.replace(`^[${cit.eventId}]`, `<<<CIT${idx}>>>`)
    })

    // Replace citation placeholders with styled links
    citationsInPara.forEach((cit, idx) => {
      const eventId = cit.eventId
      const eventType = eventId.split(':')[0].split('_')[0]
      const fullType = eventId.split(':')[0]
      const color = eventColors[fullType] || eventColors[eventType] || '#58a6ff'

      const citationLink = `<sup><a href="#" class="citation-link" data-event-id="${eventId}" style="color: ${color}; text-decoration: none; font-size: 9px; opacity: 0.7; margin-left: 2px;">[${eventId}]</a></sup>`
      const placeholder = `<<<CIT${idx}>>>`
      
      // Find and include any immediate punctuation after the placeholder
      const punctMatch = workingContent.slice(workingContent.indexOf(placeholder) + placeholder.length).match(/^([.!?]+)/)
      const trailingPunct = punctMatch ? punctMatch[1] : ''
      if (trailingPunct) {
        const punctIdx = workingContent.indexOf(placeholder) + placeholder.length
        workingContent = workingContent.slice(0, punctIdx) + workingContent.slice(punctIdx + trailingPunct.length)
      }
      
      // Calculate steward color for this citation
      const citationObj = citations.find(c => c.eventId === eventId)
      const stewardRole = citationObj?.stewardRole || citationObj?.actorRole
      const stewardColor = stewardRole ? getStewardColor(stewardRole) : null
      const bgColor = stewardColor
        ? `color-mix(in srgb, ${stewardColor} 20%, transparent)`
        : `color-mix(in srgb, ${color} 20%, transparent)`
      
      // Wrap citation + punctuation in a colored span with margin-left to prevent box-shadow overlap
      const colored = `<span class="cited-citation" style="background: ${bgColor}; padding: 2px 4px; border-radius: 2px; box-shadow: -3px 0 0 ${color}; white-space: nowrap; margin-left: 4px;">${citationLink}${trailingPunct}</span>`
      workingContent = workingContent.replace(placeholder, colored)
    })

    // Wrap entire paragraph with single reveal-time (day-based)
    return `<p class="narrative-reveal" data-reveal-time="${paragraphDay}">${workingContent}</p>`
  })

  // Also wrap headers (title)
  html = html.replace(/<h([1-6])>(.*?)<\/h\1>/gs, (match, level, content) => {
    return `<h${level} class="narrative-reveal" data-reveal-time="0">${content}</h${level}>`
  })

  // Add metadata footer with steward roles legend
  const stewardRoles = Array.from(
    new Set((scenario?.envelopes ?? []).map(e => e?.ownerRole).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b)))

  const stewardRolesHtml = stewardRoles.length
    ? stewardRoles
        .slice(0, 10)
        .map(role => {
          const stewardColor = getStewardColor(role)
          return `
            <span style="display:flex; align-items:center; gap: 6px;">
              <span style="display:inline-block; width: 10px; height: 10px; border-radius: 2px; background: color-mix(in srgb, ${stewardColor} 18%, transparent); border-left: 3px solid ${stewardColor};"></span>
              ${escapeHtml(role)}
            </span>
          `.trim()
        })
        .join('')
    : `<span style="color: var(--vscode-statusBar-foreground);">No steward roles in this scenario.</span>`

  const legendHtml = `
    <div style="
      margin-top: 20px;
      padding: 12px;
      background: color-mix(in srgb, var(--vscode-textLink-foreground) 5%, transparent);
      border-radius: 4px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">Citation Colors:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <span><span style="color: #98d4a0;">●</span> Revisions</span>
        <span><span style="color: #f0b866;">●</span> Boundaries</span>
        <span><span style="color: #b4a7e7;">●</span> Embeddings</span>
        <span><span style="color: #58a6ff;">●</span> Retrievals</span>
      </div>
      <div style="margin-top: 12px; font-weight: 600; margin-bottom: 8px;">Steward Roles:</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${stewardRolesHtml}
      </div>
    </div>
  `.trim()

  return html + legendHtml
}

// Inject CSS styles for AI narrative content (shared by both pre-gen and generated)
const injectAINarrativeStyles = () => {
  if (document.head.querySelector('#ai-narrative-styles')) return // Already injected
  
  const style = document.createElement('style')
  style.id = 'ai-narrative-styles'
  style.textContent = `
    #ai-narrative-content p {
      margin-bottom: 1em;
    }
    #ai-narrative-content p:last-of-type {
      margin-bottom: 0;
    }
    #ai-narrative-content h1 {
      font-size: 16px;
      margin-top: 0;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    #ai-narrative-content h2 {
      font-size: 15px;
      margin-top: 16px;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    #ai-narrative-content h3 {
      font-size: 13px;
      margin-top: 12px;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .cited-sentence {
      transition: opacity 0.5s ease, filter 0.5s ease;
    }
  `
  document.head.appendChild(style)
}

const mountAINarrative = (containerEl) => {
  if (!containerEl) return
  // Remove early return - allow re-mounting to update layout
  
  if (!aiNarrativeTimeHooked) {
    aiNarrativeTimeHooked = true
    onTimeChange(() => {
      if (!aiNarrativeSyncEnabled || !aiNarrativeFullHtml) return
      updateNarrativeSync()
    })
  }

  containerEl.style.padding = '16px 20px'
  containerEl.style.fontFamily = 'var(--vscode-font-family)'
  containerEl.style.overflow = 'hidden'
  containerEl.style.height = '100%'
  containerEl.style.display = 'flex'
  containerEl.style.flexDirection = 'column'

  containerEl.innerHTML = `
    <div class="ai-narrative-container" style="display: flex; flex-direction: column; height: 100%;">
      ${aiNarrativeGenerated ? `
        <!-- Narrative output at top (after generation) -->
        <div id="ai-narrative-content" style="
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          color: var(--vscode-foreground);
          line-height: 1.8;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding-bottom: 20px;
          margin-bottom: 20px;
          min-height: 0;
        "></div>
        
        <!-- Controls at bottom (after generation) -->
        <div class="ai-narrative-controls" style="flex-shrink: 0; border-top: 1px solid var(--vscode-panel-border); padding-top: 10px;">
      ` : `
        <!-- Controls at top (before generation) -->
        <div class="ai-narrative-controls" style="flex-shrink: 0;">
      `}
          <p style="margin: 0 0 10px 0; font-size: 11px; line-height: 1.4; color: var(--vscode-descriptionForeground); opacity: 0.8;">
            Generate a contextual explanation of the scenario timeline
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;">
            <button id="generate-ai-narrative" style="
              background: linear-gradient(135deg, var(--vscode-button-background) 0%, color-mix(in srgb, var(--vscode-button-background) 85%, black) 100%);
              color: var(--vscode-button-foreground);
              border: none;
              border-radius: 4px;
              padding: 6px 12px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(0, 0, 0, 0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.08)'">
              <span class="codicon codicon-sparkle"></span>
              <span class="generate-narrative-text">${aiNarrativeGenerated ? 'Regenerate' : 'Generate Narrative'}</span>
            </button>
            
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--vscode-foreground); cursor: pointer; user-select: none;">
              <input type="checkbox" id="sync-narrative-toggle" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--vscode-button-background);" ${aiNarrativeSyncEnabled ? 'checked' : ''}>
              <span style="font-weight: 500;">Sync with Timeline</span>
            </label>
          </div>
          
          <div style="margin-bottom: ${aiNarrativeGenerated ? '0' : '12px'};">
            <label for="ai-narrative-user-addendum" style="display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-descriptionForeground); margin-bottom: 6px;">
              Additional instructions (optional)
            </label>
            <textarea id="ai-narrative-user-addendum" rows="2" placeholder="E.g., 'Focus on the Safety Steward's perspective' or 'Emphasize the boundary interactions' or 'Highlight the policy evolution' or 'Make it more dramatic'…" style="
              width: 100%;
              resize: vertical;
              min-height: 52px;
              max-height: 120px;
              padding: 8px 10px;
              border-radius: 6px;
              border: 1px solid var(--vscode-input-border);
              background: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              font-size: 13px;
              line-height: 1.6;
              font-family: var(--vscode-font-family);
              outline: none;
              transition: border-color 0.2s ease;
            " onfocus="this.style.borderColor='var(--vscode-focusBorder)'" onblur="this.style.borderColor='var(--vscode-input-border)'"></textarea>
          </div>
        </div>
      ${!aiNarrativeGenerated ? `
        <!-- Narrative output at bottom (before generation) -->
        <div id="ai-narrative-content" style="
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          color: var(--vscode-foreground);
          line-height: 1.8;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding-bottom: 20px;
        "></div>
      ` : ''}
    </div>
  `.trim()

  const generateBtn = containerEl.querySelector('#generate-ai-narrative')
  if (generateBtn) generateBtn.addEventListener('click', () => generateAINarrative(containerEl))

  const addendumEl = containerEl.querySelector('#ai-narrative-user-addendum')
  if (addendumEl) {
    addendumEl.value = aiNarrativeUserAddendum
    addendumEl.addEventListener('input', () => {
      aiNarrativeUserAddendum = addendumEl.value || ''
    })
  }

  const syncToggle = containerEl.querySelector('#sync-narrative-toggle')
  if (syncToggle) {
    syncToggle.addEventListener('change', (e) => {
      aiNarrativeSyncEnabled = e.target.checked
      const contentEl = containerEl.querySelector('#ai-narrative-content')
      if (!contentEl) return

      if (aiNarrativeSyncEnabled && aiNarrativeFullHtml) {
        updateNarrativeSync()
      } else if (!aiNarrativeSyncEnabled && aiNarrativeFullHtml) {
        // Show full narrative when sync is disabled - reset all elements to visible
        const elements = contentEl.querySelectorAll('[data-reveal-time]')
        elements.forEach(el => {
          el.style.opacity = '1'
          el.style.filter = 'none'
        })
      }
    })
  }

  // Try to load pre-generated narrative if available
  if (!aiNarrativeFullHtml) {
    const scenario = getScenario()
    const scenarioKey = getCurrentScenarioId()
    aiNarrativeCurrentScenario = scenarioKey // Initialize tracker
    if (scenario && scenarioKey && !scenarioKey.startsWith('generated-scenario-')) {
      // Async load - will update UI when complete
      loadPreGeneratedNarrative(scenarioKey, containerEl).catch(err => {
        console.log('No pre-generated narrative available:', err.message)
      })
    }
  } else {
    // If narrative already loaded (from previous session), display it
    const contentEl = containerEl.querySelector('#ai-narrative-content')
    if (contentEl) {
      contentEl.innerHTML = aiNarrativeFullHtml
      contentEl.style.backgroundImage = 'none' // Remove background when content is loaded
      rewireCitationLinks(contentEl)
      if (aiNarrativeSyncEnabled) updateNarrativeSync()
    }
  }

  // Handle scenario changes - cache current narrative and restore for new scenario
  onScenarioChange(() => {
    console.log('[AI Narrative] Scenario changed')
    
    // Save current narrative to cache using tracked scenario key
    if (aiNarrativeCurrentScenario && aiNarrativeGenerated && aiNarrativeFullHtml) {
      aiNarrativeCache[aiNarrativeCurrentScenario] = {
        html: aiNarrativeFullHtml,
        citations: [...aiNarrativeCitations],
        generated: true
      }
      console.log(`[AI Narrative] Cached narrative for ${aiNarrativeCurrentScenario}`)
    }
    
    // Clear current state
    aiNarrativeFullHtml = ''
    aiNarrativeCitations = []
    aiNarrativeGenerated = false
    
    // Update current scenario tracker
    const scenarioKey = getCurrentScenarioId()
    aiNarrativeCurrentScenario = scenarioKey
    
    // Update UI to show loading state
    const contentEl = containerEl.querySelector('#ai-narrative-content')
    if (contentEl) {
      contentEl.innerHTML = ''
      contentEl.style.backgroundImage = 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.02) 100%)'
    }
    
    // Update generate button
    const generateBtn = containerEl.querySelector('#generate-ai-narrative')
    if (generateBtn) {
      const buttonText = generateBtn.querySelector('.generate-narrative-text')
      if (buttonText) buttonText.textContent = 'Generate Narrative'
      generateBtn.disabled = false
    }
    
    // Try to restore narrative for new scenario
    const scenario = getScenario()
    
    // First check cache (for previously generated narratives)
    if (scenarioKey && aiNarrativeCache[scenarioKey]) {
      console.log(`[AI Narrative] Restoring from cache: ${scenarioKey}`)
      const cached = aiNarrativeCache[scenarioKey]
      aiNarrativeFullHtml = cached.html
      aiNarrativeCitations = [...cached.citations]
      aiNarrativeGenerated = true
      
      // Update UI with cached content (don't re-mount to avoid infinite loop)
      injectAINarrativeStyles()
      
      const contentEl = containerEl.querySelector('#ai-narrative-content')
      if (contentEl) {
        contentEl.innerHTML = aiNarrativeFullHtml
        contentEl.style.backgroundImage = 'none'
        rewireCitationLinks(contentEl)
        if (aiNarrativeSyncEnabled) updateNarrativeSync()
      }
      
      // Update button text
      const generateBtn = containerEl.querySelector('#generate-ai-narrative')
      if (generateBtn) {
        const buttonText = generateBtn.querySelector('.generate-narrative-text')
        if (buttonText) buttonText.textContent = 'Regenerate'
      }
    }
    // Then try to load pre-generated narrative
    else if (scenario && scenarioKey && !scenarioKey.startsWith('generated-scenario-')) {
      loadPreGeneratedNarrative(scenarioKey, containerEl).catch(err => {
        console.log('No pre-generated narrative for this scenario:', err.message)
      })
    }
  })
}

// Load pre-generated narrative from repository
const loadPreGeneratedNarrative = async (scenarioKey, containerEl) => {
  console.log(`[Pre-gen Narrative] Attempting to load: ${scenarioKey}`)
  
  try {
    // Use dynamic import to load narrative JSON (works with Vite)
    const narrativeModule = await import(`../sim/scenarios/${scenarioKey}.narrative.json`)
    const data = narrativeModule.default || narrativeModule
    
    console.log(`[Pre-gen Narrative] Loaded successfully:`, data.title)
    
    aiNarrativeCitations = data.citations || []
    
    // Use shared processing pipeline
    const scenario = getScenario()
    const html = processNarrativeWithCitations(data.narrative, aiNarrativeCitations, scenario)
    
    aiNarrativeFullHtml = html
    aiNarrativeGenerated = true
    
    // Re-mount the UI to update layout (moves controls to bottom)
    mountAINarrative(containerEl)
    
    // Ensure narrative styles are injected
    injectAINarrativeStyles()
    
    // Render narrative content after re-mount
    const contentEl = containerEl?.querySelector('#ai-narrative-content')
    if (contentEl) {
      contentEl.innerHTML = html
      contentEl.style.backgroundImage = 'none'
      rewireCitationLinks(contentEl)
      if (aiNarrativeSyncEnabled) updateNarrativeSync()
    }
    
    console.log(`✓ Loaded pre-generated narrative for ${scenarioKey} (${data.citations?.length || 0} citations)`)
    
  } catch (error) {
    throw error // Re-throw for caller to handle
  }
}

const generateAINarrative = async (containerEl) => {
  const contentEl = containerEl?.querySelector?.('#ai-narrative-content')
  const generateBtn = containerEl?.querySelector?.('#generate-ai-narrative')
  const addendumEl = containerEl?.querySelector?.('#ai-narrative-user-addendum')

  if (!contentEl || !generateBtn) return

  const scenario = getScenario()
  const scenarioKey = getCurrentScenarioId() // Get the filename-based ID for the API
  if (!scenario || !scenarioKey) {
    contentEl.innerHTML = '<p style="color: var(--status-error);">No scenario loaded.</p>'
    contentEl.style.backgroundImage = 'none' // Remove background for error message
    return
  }

  generateBtn.disabled = true
  generateBtn.textContent = 'Generating...'
  contentEl.style.backgroundImage = 'none' // Remove background while generating
  contentEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; color: var(--vscode-descriptionForeground);">
      <span class="codicon codicon-loading codicon-modifier-spin"></span>
      <span>Generating narrative for ${scenario.title || scenarioKey}...</span>
    </div>
  `.trim()

  try {
    // Use Cloud Run in production (GitHub Pages), localhost in development
    const isProduction = window.location.hostname === 'enufacas.github.io'
    const apiUrl = isProduction 
      ? 'https://narrative-api-alm36fcxzq-uc.a.run.app/generate'
      : 'http://localhost:8080/generate'
    
    const userAddendum = (addendumEl?.value || aiNarrativeUserAddendum || '').trim()
    
    // For generated scenarios, pass the full scenario JSON since it doesn't exist on disk
    const isGeneratedScenario = scenarioKey.startsWith('generated-scenario-')
    const requestBody = isGeneratedScenario 
      ? {
          scenarioData: scenario, // Send full scenario object
          fullContext: true,
          userAddendum
        }
      : {
          scenario: scenarioKey, // Send filename-based ID for built-in scenarios
          fullContext: true,
          userAddendum
        }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    aiNarrativeCitations = data.citations || []

    // Use shared citation processing pipeline
    const html = processNarrativeWithCitations(data.narrative || data.markdown, aiNarrativeCitations, scenario)

    // Add metadata footer
    const metadata = data.metadata || {}
    const metadataHtml = `
      <div style="
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--vscode-sideBar-border);
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
      ">
        <strong>Generation Metadata:</strong><br>
        Model: ${metadata.model || 'unknown'} |
        Cost: $${(metadata.cost || 0).toFixed(6)} |
        Tokens: ${metadata.tokensIn || 0} in / ${metadata.tokensOut || 0} out |
        Duration: ${(metadata.duration || 0).toFixed(2)}s |
        Day-based reveal: enabled
      </div>
    `

    // Store the full HTML for sync mode
    aiNarrativeFullHtml = html + metadataHtml

    contentEl.innerHTML = aiNarrativeFullHtml
    contentEl.style.backgroundImage = 'none' // Remove background when narrative is loaded

    // Ensure narrative styles are injected
    injectAINarrativeStyles()

    // Wire up citation clicks
    rewireCitationLinks(contentEl)

    // If sync mode is enabled, update visibility
    if (aiNarrativeSyncEnabled) {
      updateNarrativeSync()
    }

    aiNarrativeGenerated = true
    
    // Clear and re-mount the panel to apply the new layout (narrative at top, controls at bottom)
    containerEl.innerHTML = ''
    mountAINarrative(containerEl)
  } catch (err) {
    console.error('Failed to generate AI narrative:', err)
    const isProduction = window.location.hostname === 'enufacas.github.io'
    const helpText = isProduction
      ? 'The narrative generation service may be temporarily unavailable. Please try again.'
      : 'Make sure the API server is running at localhost:8080 (npm run api:dev)'
    
    contentEl.innerHTML = `
      <div style="color: var(--status-error); padding: 12px; background: color-mix(in srgb, var(--status-error) 10%, transparent); border-radius: 4px; border: 1px solid var(--status-error);">
        <strong>Generation Failed</strong><br>
        ${err.message}<br><br>
        <small>${helpText}</small>
      </div>
    `
    generateBtn.textContent = 'Try Again'
    generateBtn.disabled = false
  }
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
  onTimeChange(updateNarrativeSync)
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
  const filteredEnvelopes = stewardFilter === 'all'
    ? envelopes
    : envelopes.filter(env => env.ownerRole === stewardFilter)
  
  const activeEnvelopes = filteredEnvelopes.filter(e => getEnvelopeStatus(e, timeHour) === 'active')
  
  if (meta) meta.textContent = activeEnvelopes.length ? `${activeEnvelopes.length}` : '0'

  if (!activeEnvelopes.length) {
    body.innerHTML = `<div class="sidebar-envelope__empty">No active envelopes at current time.</div>`
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

  // Render all active envelopes using the superior card format from home.js
  body.innerHTML = activeEnvelopes.map(env => {
    const effective = getEnvelopeAtTime(scenario, env.envelopeId, timeHour) || env
    const status = 'active' // We know they're all active since we filtered
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
      ? `<span style="background: var(--status-warning); color: var(--vscode-editor-background); padding: 2px 6px; border-radius: 3px; font-weight: 600;">↑ v${semver}</span>`
      : `<span style="padding: 2px 6px;">v${semver}</span>`

    return `
      <div class="envelope-card" data-envelope="${env.envelopeId}" data-steward-color="${stewardColor}" style="--envelope-accent: ${stewardColor}; position: relative; background: var(--vscode-sideBar-background); border: ${borderStyle}; padding: 12px; padding-left: 16px; border-radius: 6px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 12px;">
        ${accentBar}
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">${env.envelopeId}</div>
            <h3 style="margin: 4px 0; font-size: 13px;">${env.name}</h3>
            <div style="display:flex; gap: 10px; flex-wrap: wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 11px; color: var(--vscode-statusBar-foreground);">
              ${versionBadge}
              <span>rev: ${revisionId}</span>
            </div>
          </div>
          <span class="codicon codicon-${statusIcon}" style="color: ${statusColor};"></span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${stewardColor};"></span>
          <span>${env.ownerRole}</span>
        </div>
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">${statusLabel}</div>
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">Window: ${formatSimTime(env.createdHour)} -> ${formatSimTime(env.endHour)}</div>
        <div style="display: flex; gap: 6px; font-size: 11px; flex-wrap: wrap;">
          <span style="border: 1px solid var(--vscode-sideBar-border); border-left: 3px solid var(--status-info); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Total constraints">${(effective.constraints ?? []).length} constraints</span>
          <span style="border: 1px solid var(--vscode-sideBar-border); background: var(--vscode-editor-background); color: var(--vscode-statusBar-foreground); padding: 2px 8px; border-radius: 999px;" title="Domain">${env.domain}</span>
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
      app.appendChild(modal)
    })
  })
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
    auxTitle.textContent = personaTitles[persona] || 'AI NARRATIVE';
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
  title.textContent = 'AI NARRATIVE';
  title.style.cssText = 'font-size: 11px; font-weight: 600; margin: 0;';
  
  const minimizeButton = document.createElement('a');
  minimizeButton.className = 'codicon codicon-chevron-right';
  minimizeButton.setAttribute('role', 'button');
  minimizeButton.setAttribute('aria-label', 'Minimize Panel');
  minimizeButton.style.cssText = 'cursor: pointer; padding: 4px;';
  minimizeButton.addEventListener('click', () => {
    setAuxCollapsed(true)
  });
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(minimizeButton);
  header.appendChild(titleContainer);
  
  const content = document.createElement('div');
  content.className = 'content auxiliary-content';
  content.id = 'auxiliarybar-content';

  // AI Narrative mounted in the auxiliary panel.
  mountAINarrative(content)
  
  auxiliarybar.appendChild(header);
  auxiliarybar.appendChild(content);
  
  return auxiliarybar;
}

// Update telemetry display with collapsible sections
const telemetrySectionState = {
  'Active Envelopes': false, // Collapsed by default
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

  // AI Narrative panel: always default to open for desktop users.
  setAuxCollapsed(false)

  setSidebarCollapsed(persisted.sidebarCollapsed !== undefined ? persisted.sidebarCollapsed : false)
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

  // NOTE: Peek handles for collapsed panels are created by router.js after initial navigation
  // This ensures they persist across route changes
  
  // Resize handle between editor and auxiliary bar
  const sash2 = createSash('vertical', 'auxiliary-resize');
  
  // Create placeholder for auxiliary bar (will be populated lazily)
  const auxiliarybar = document.createElement('div')
  auxiliarybar.className = 'part auxiliarybar'
  auxiliarybar.style.display = 'none' // Hidden until populated

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

  // Route-aware auto-open: Evidence now lives in the bottom panel.
  window.addEventListener('hddl:navigate', (e) => {
    const path = e?.detail?.path || window.location.pathname || '/'
    // Only auto-open if we are in review layout
    const activeLayout = localStorage.getItem('hddl:layout:active') || 'default'
    const isReviewMode = activeLayout === 'review'
    
    if (isReviewMode && (path === '/decision-telemetry' || path === '/dsg-event')) {
      setBottomCollapsed(false)
      document.querySelector('.panel-tab[data-tab="evidence"]')?.click()
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
  
  // Lazy-load auxiliary bar after initial render (non-blocking)
  // This defers telemetry panel creation to improve initial load time
  setTimeout(() => {
    const auxBar = createAuxiliaryBar()
    const placeholder = document.querySelector('.part.auxiliarybar')
    if (placeholder && auxBar) {
      placeholder.replaceWith(auxBar)
    }
  }, 100) // Small delay after first paint
  
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
    { id: 'cli', label: 'HDDL CLI' },
    { id: 'evidence', label: 'DTS STREAM' },
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
    
    // Initialize Evidence (Bounded) tab on first activation
    if (tabId === 'evidence') {
      initializeEvidenceBounded()
    }
  }

  const initializeEvidenceBounded = () => {
    const outputEl = getOutputEl('evidence')
    if (!outputEl) return
    if (outputEl.dataset.initialized === 'true') return
    outputEl.dataset.initialized = 'true'

    outputEl.style.padding = '12px'
    outputEl.style.overflow = 'auto'

    const rerender = () => {
      const scenario = getScenario()
      const timeHour = getTimeHour()
      updateTelemetry(outputEl, scenario, timeHour)
    }

    rerender()
    onTimeChange(() => {
      if (!outputEl.isConnected) return
      if (activeTab !== 'evidence') return
      rerender()
    })
    onScenarioChange(() => {
      if (!outputEl.isConnected) return
      if (activeTab !== 'evidence') return
      rerender()
    })
    onFilterChange(() => {
      if (!outputEl.isConnected) return
      if (activeTab !== 'evidence') return
      rerender()
    })
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
        envelopes: { text: `[${ts}] ${sev}${envelope}${key} - ${detail}`.trim(), kind: sev === 'WARNING' ? 'warning' : 'info' },
        steward: null,
        dts: null,
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
      <span class="mobile-nav-title">Navigation</span>
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
  let initialWidth = 0; // Store initial width on mousedown
  let initialHeight = 0; // Store initial height on mousedown
  
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
    
    // Capture initial sizes based on panel being resized
    if (id === 'sidebar-resize') {
      const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 300;
      initialWidth = currentWidth;
    } else if (id === 'auxiliary-resize') {
      const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--auxiliarybar-width')) || 350;
      initialWidth = currentWidth;
    } else if (id === 'panel-resize') {
      const currentHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-height')) || 240;
      initialHeight = currentHeight;
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
        const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 2000 };
        // Use initial width captured on mousedown
        const newWidth = Math.max(config.min, Math.min(config.max, initialWidth + deltaX));
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, sidebarWidth: newWidth });
        savePanelWidth('sidebar', newWidth);
      } else if (id === 'auxiliary-resize') {
        setAuxCollapsed(false);
        const auxiliary = document.querySelector('.auxiliarybar');
        if (!auxiliary) return;
        const config = PANEL_DEFAULTS.auxiliary || { min: 200, max: 2000 };
        // Use initial width captured on mousedown
        const newWidth = Math.max(config.min, Math.min(config.max, initialWidth - deltaX));
        auxiliary.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);

        const state = loadLayoutState();
        saveLayoutState({ ...state, auxWidth: newWidth, auxCollapsed: false });
        savePanelWidth('auxiliary', newWidth);
      }
      
      // Dispatch resize event for other components to react
      window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
        detail: { panel: id.replace('-resize', ''), orientation }
      }));
      
      // Dispatch resize event for other components to react
      window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
        detail: { panel: id.replace('-resize', ''), orientation }
      }));
    } else if (orientation === 'horizontal') {
      updateGhostLine(e.clientY);
      
      if (id === 'panel-resize') {
        setBottomCollapsed(false);
        const root = document.documentElement;
        const config = PANEL_DEFAULTS.bottom || { min: 100, max: 2000 };
        // Use initial height captured on mousedown
        const next = Math.max(config.min, Math.min(config.max, initialHeight - deltaY));
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
      const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 2000, default: 300 };
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
        const config = PANEL_DEFAULTS.sidebar || { min: 180, max: 2000 };
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth + delta));
        sidebar.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      } else if (id === 'auxiliary-resize') {
        const auxiliary = document.querySelector('.auxiliarybar');
        if (!auxiliary) return;
        setAuxCollapsed(false);
        const currentWidth = parseInt(getComputedStyle(auxiliary).width);
        const config = PANEL_DEFAULTS.auxiliary || { min: 200, max: 2000 };
        const newWidth = Math.max(config.min, Math.min(config.max, currentWidth - delta));
        auxiliary.style.width = `${newWidth}px`;
        document.documentElement.style.setProperty('--auxiliarybar-width', `${newWidth}px`);
      } else if (id === 'panel-resize') {
        setBottomCollapsed(false);
        const root = document.documentElement;
        const currentRaw = getComputedStyle(root).getPropertyValue('--panel-height').trim();
        const current = Number.parseInt(currentRaw || '240', 10);
        const config = PANEL_DEFAULTS.bottom || { min: 100, max: 2000 };
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
  const content = document.querySelector('.terminal-output[data-terminal="evidence"]')
  if (!content) return
  updateTelemetry(content, getScenario(), getTimeHour())
}
