// AI Narrative manager for workspace
// Handles narrative generation, caching, timeline sync, and UI rendering

import { getTimeHour, setTimeHour, onTimeChange, getScenario, onScenarioChange } from '../../sim/sim-state'
import { getCurrentScenarioId } from '../../sim/scenario-loader'
import { getStewardColor } from '../../sim/steward-colors'
import { escapeHtml } from './utils'

// AI Narrative state
let aiNarrativeGenerated = false
let aiNarrativeCitations = []
let aiNarrativeSyncEnabled = false
let aiNarrativeFullHtml = ''
let aiNarrativeUserAddendum = ''
let aiNarrativeTimeHooked = false
let aiNarrativeCurrentScenario = null // Track current scenario for caching on switch

// Cache helpers - use localStorage for persistence across tabs/sessions
const CACHE_KEY = 'hddl:narrative-cache'
const CACHE_VERSION = 1
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const getCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    if (parsed.version !== CACHE_VERSION) return {}
    
    // Clean expired entries
    const now = Date.now()
    const cleaned = {}
    for (const [key, entry] of Object.entries(parsed.cache || {})) {
      if (entry.timestamp && (now - entry.timestamp) < CACHE_MAX_AGE_MS) {
        cleaned[key] = entry
      }
    }
    return cleaned
  } catch (e) {
    console.warn('[AI Narrative] Failed to load cache from localStorage:', e)
    return {}
  }
}

const saveCacheToStorage = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      cache
    }))
  } catch (e) {
    console.warn('[AI Narrative] Failed to save cache to localStorage:', e)
  }
}

const aiNarrativeCache = getCacheFromStorage() // Load cache on module init

// Auto-generation state
let autoGenerationQueue = [] // Queue of pending auto-generation requests
let isAutoGenerating = false // Flag to track if auto-generation is in progress
let autoGenerationController = null // AbortController for cancelling requests

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

// Load pre-generated narrative from repository
const loadPreGeneratedNarrative = async (scenarioKey, containerEl) => {
  console.log(`[Pre-gen Narrative] Attempting to load: ${scenarioKey}`)
  
  try {
    // Use dynamic import to load narrative JSON (works with Vite)
    const narrativeModule = await import(`../../sim/scenarios/${scenarioKey}.narrative.json`)
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

/**
 * Auto-generate narrative for a scenario (triggered after scenario generation)
 * @param {string} scenarioId - ID of the scenario to generate narrative for
 * @param {boolean} autoOpen - Whether to auto-open the panel when complete
 */
const autoGenerateNarrative = async (scenarioId, autoOpen = true) => {
  // Add to queue
  autoGenerationQueue.push({ scenarioId, autoOpen })
  console.log(`[Auto-Generate] Queued narrative for ${scenarioId}. Queue length: ${autoGenerationQueue.length}`)
  
  // Process queue if not already processing
  if (!isAutoGenerating) {
    processAutoGenerationQueue()
  }
}

/**
 * Process the auto-generation queue
 */
const processAutoGenerationQueue = async () => {
  if (isAutoGenerating || autoGenerationQueue.length === 0) return
  
  isAutoGenerating = true
  const { scenarioId, autoOpen } = autoGenerationQueue.shift()
  
  console.log(`[Auto-Generate] Processing narrative for ${scenarioId}. Remaining queue: ${autoGenerationQueue.length}`)
  
  // Update peek bar to generating state
  const { updateAuxPeekState } = await import('../../router')
  updateAuxPeekState('generating')
  
  // Disable generate button during auto-generation
  const generateBtn = document.querySelector('#generate-ai-narrative')
  if (generateBtn) {
    generateBtn.disabled = true
  }
  
  // Get the narrative panel container
  const containerEl = document.querySelector('[data-testid="ai-narrative-panel"]')
  const contentEl = containerEl?.querySelector?.('#ai-narrative-content')
  
  // Update panel content to show generating state
  if (contentEl) {
    contentEl.style.backgroundImage = 'none'
    contentEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 32px;
        color: var(--vscode-descriptionForeground);
        text-align: center;
      ">
        <span class="codicon codicon-loading codicon-modifier-spin" style="font-size: 32px; color: var(--vscode-textLink-foreground);"></span>
        <div>
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Scenario Complete — Generating Narrative</div>
          <div style="font-size: 12px; opacity: 0.8;">Using Gemini 3 Flash Preview (10-30 seconds)...</div>
        </div>
      </div>
    `.trim()
  }
  
  try {
    const scenario = getScenario()
    if (!scenario || getCurrentScenarioId() !== scenarioId) {
      throw new Error('Scenario changed or not loaded')
    }
    
    // Use Cloud Run in production (GitHub Pages), localhost in development
    const isProduction = window.location.hostname === 'enufacas.github.io'
    const apiUrl = isProduction 
      ? 'https://narrative-api-alm36fcxzq-uc.a.run.app/generate'
      : 'http://localhost:8080/generate'
    
    // Create abort controller for this request
    autoGenerationController = new AbortController()
    
    const requestBody = {
      scenarioData: scenario,
      fullContext: true,
      userAddendum: ''
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: autoGenerationController.signal
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
        Day-based reveal: enabled | Auto-generated
      </div>
    `
    
    // Store the full HTML for sync mode
    aiNarrativeFullHtml = html + metadataHtml
    aiNarrativeGenerated = true
    
    // Update current scenario tracker BEFORE caching
    aiNarrativeCurrentScenario = scenarioId
    
    // Cache the narrative (in-memory and localStorage)
    aiNarrativeCache[scenarioId] = {
      html: aiNarrativeFullHtml,
      citations: [...aiNarrativeCitations],
      generated: true,
      timestamp: Date.now()
    }
    saveCacheToStorage(aiNarrativeCache)
    
    console.log(`[Auto-Generate] ✓ Cached narrative for "${scenarioId}" (persisted to localStorage)`)
    console.log(`[Auto-Generate] Cache now contains:`, Object.keys(aiNarrativeCache))
    console.log(`[Auto-Generate] aiNarrativeCurrentScenario set to: "${aiNarrativeCurrentScenario}"`)
    
    // Update panel content
    if (contentEl) {
      contentEl.innerHTML = aiNarrativeFullHtml
      contentEl.style.backgroundImage = 'none'
      injectAINarrativeStyles()
      rewireCitationLinks(contentEl)
      
      if (aiNarrativeSyncEnabled) {
        updateNarrativeSync()
      }
    }
    
    // Update peek bar to complete state
    updateAuxPeekState('complete')
    
    // Re-enable generate button
    const generateBtn = document.querySelector('#generate-ai-narrative')
    if (generateBtn) {
      generateBtn.disabled = false
    }
    
    // Auto-open panel if requested
    if (autoOpen) {
      setTimeout(() => {
        document.body.classList.remove('aux-hidden')
        const state = JSON.parse(localStorage.getItem('hddl:layout') || '{}')
        localStorage.setItem('hddl:layout', JSON.stringify({ ...state, auxCollapsed: false }))
      }, 500) // Small delay for visual feedback
    }
    
    console.log(`[Auto-Generate] ✓ Narrative generated for ${scenarioId}`)
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[Auto-Generate] Narrative generation cancelled for ${scenarioId}`)
    } else {
      console.error('[Auto-Generate] Failed to generate narrative:', error)
      
      // Update peek bar to error state
      const { updateAuxPeekState } = await import('../../router')
      updateAuxPeekState('error')
      
      // Update panel content to show error
      if (contentEl) {
        const isProduction = window.location.hostname === 'enufacas.github.io'
        const helpText = isProduction
          ? 'The narrative generation service may be temporarily unavailable.'
          : 'Make sure the API server is running at http://localhost:8080'
        
        contentEl.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 24px;
            color: var(--status-error);
            text-align: center;
          ">
            <span class="codicon codicon-error" style="font-size: 24px;"></span>
            <div>
              <div style="font-weight: 600; margin-bottom: 8px;">Auto-generation Failed</div>
              <div style="font-size: 12px; opacity: 0.8;">${escapeHtml(helpText)}</div>
              <div style="font-size: 11px; margin-top: 8px; opacity: 0.6;">${escapeHtml(error.message)}</div>
            </div>
          </div>
        `.trim()
      }
    }
  } finally {
    autoGenerationController = null
    isAutoGenerating = false
    
    // Always re-enable button when generation completes (success or error)
    const generateBtn = document.querySelector('#generate-ai-narrative')
    if (generateBtn) {
      generateBtn.disabled = false
    }
    
    // Process next item in queue
    if (autoGenerationQueue.length > 0) {
      processAutoGenerationQueue()
    }
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
      <span>Generating narrative using Gemini 3 Flash Preview...</span>
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
      : 'Make sure the API server is running at http://localhost:8080'
    
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
    
    console.log(`[AI Narrative Mount] Initial load for: "${scenarioKey}"`)
    
    // First check cache (for previously generated narratives, including in other tabs)
    if (scenarioKey && aiNarrativeCache[scenarioKey]) {
      console.log(`[AI Narrative Mount] ✓ Found cached narrative for "${scenarioKey}"`)
      const cached = aiNarrativeCache[scenarioKey]
      aiNarrativeFullHtml = cached.html
      aiNarrativeCitations = [...cached.citations]
      aiNarrativeGenerated = true
      
      // Update UI with cached content immediately
      const contentEl = containerEl.querySelector('#ai-narrative-content')
      if (contentEl) {
        contentEl.innerHTML = aiNarrativeFullHtml
        contentEl.style.backgroundImage = 'none'
        injectAINarrativeStyles()
        rewireCitationLinks(contentEl)
        if (aiNarrativeSyncEnabled) updateNarrativeSync()
      }
      
      // Update button text
      const generateBtn = containerEl.querySelector('#generate-ai-narrative')
      if (generateBtn) {
        const buttonText = generateBtn.querySelector('.generate-narrative-text')
        if (buttonText) buttonText.textContent = 'Regenerate'
      }
      
      console.log(`[AI Narrative Mount] Restored cached narrative on initial load`)
      return // Early return - we're done
    }
    
    // Check if this is a generated scenario that will be auto-generated
    const isGeneratedScenario = scenarioKey && scenarioKey.startsWith('generated-scenario-')
    
    if (scenario && scenarioKey && !isGeneratedScenario) {
      console.log(`[AI Narrative Mount] Checking for pre-generated narrative...`)
      // Async load - will update UI when complete (for built-in scenarios)
      loadPreGeneratedNarrative(scenarioKey, containerEl).catch(err => {
        console.log('[AI Narrative Mount] No pre-generated narrative available:', err.message)
      })
    } else if (isGeneratedScenario) {
      console.log(`[AI Narrative Mount] No cache found, showing waiting message for generated scenario`)
      // Show initial message for generated scenarios (will be replaced by auto-generation)
      const contentEl = containerEl.querySelector('#ai-narrative-content')
      if (contentEl && !isAutoGenerating) {
        contentEl.style.backgroundImage = 'none'
        contentEl.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 32px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
          ">
            <span class="codicon codicon-sparkle" style="font-size: 28px; color: var(--vscode-textLink-foreground);"></span>
            <div>
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Narrative will be generated automatically</div>
              <div style="font-size: 12px; opacity: 0.8;">Please wait while we create a contextual narrative for this scenario...</div>
            </div>
          </div>
        `.trim()
      }
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
  onScenarioChange(async () => {
    const newScenarioKey = getCurrentScenarioId()
    console.log(`[AI Narrative] Scenario changed: ${aiNarrativeCurrentScenario} → ${newScenarioKey}`)
    
    // Save current narrative to cache using tracked scenario key
    if (aiNarrativeCurrentScenario && aiNarrativeGenerated && aiNarrativeFullHtml) {
      aiNarrativeCache[aiNarrativeCurrentScenario] = {
        html: aiNarrativeFullHtml,
        citations: [...aiNarrativeCitations],
        generated: true,
        timestamp: Date.now()
      }
      saveCacheToStorage(aiNarrativeCache)
      console.log(`[AI Narrative] ✓ Cached narrative for "${aiNarrativeCurrentScenario}" (persisted)`)
    }
    
    // Clear current state
    aiNarrativeFullHtml = ''
    aiNarrativeCitations = []
    aiNarrativeGenerated = false
    
    // Reset peek bar state (unless auto-generation is in progress)
    if (!isAutoGenerating) {
      const { updateAuxPeekState } = await import('../../router')
      updateAuxPeekState('idle')
    }
    
    // Update current scenario tracker BEFORE trying to restore
    const scenarioKey = getCurrentScenarioId()
    aiNarrativeCurrentScenario = scenarioKey
    console.log(`[AI Narrative] Updated current tracker to: "${aiNarrativeCurrentScenario}"`)
    
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
    
    console.log(`[AI Narrative] Looking up narrative for: "${scenarioKey}"`)
    console.log(`[AI Narrative] Cache keys available:`, Object.keys(aiNarrativeCache))
    console.log(`[AI Narrative] Cache match found:`, !!aiNarrativeCache[scenarioKey])
    
    // First check cache (for previously generated narratives)
    if (scenarioKey && aiNarrativeCache[scenarioKey]) {
      console.log(`[AI Narrative] ✓ Cache HIT - Restoring narrative for "${scenarioKey}"`)
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

// Export the mount function and auto-generation as the main API
export { mountAINarrative, autoGenerateNarrative }
