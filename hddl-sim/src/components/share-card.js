/**
 * Share Card Generator
 * Creates shareable images for custom scenarios with visual appeal
 */

import html2canvas from 'html2canvas'

/**
 * Generate a shareable card image for a custom scenario
 * @param {object} options - Card generation options
 * @param {string} options.prompt - User's prompt that generated the scenario
 * @param {string} options.narrative - Generated narrative text  
 * @param {string} options.scenarioTitle - Scenario title
 * @param {object} options.scenarioData - Full scenario data for stats
 * @param {HTMLElement} options.backgroundElement - Element to use as background (e.g., map)
 * @returns {Promise<Blob>} PNG blob of the card
 */
export async function generateShareCard({ prompt, narrative, scenarioTitle, scenarioData, backgroundElement }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Larger portrait size - 1920x1440 for split view
  const WIDTH = 1920
  const HEIGHT = 1440
  canvas.width = WIDTH
  canvas.height = HEIGHT
  
  const scenario = scenarioData?.scenario
  const stats = extractScenarioStats(scenarioData)
  
  // Capture the timeline bar at the top of the page
  let timelineSvg = null
  const timelineEl = document.querySelector('[data-testid="timeline-bar"]')
  
  if (timelineEl && timelineEl.offsetParent !== null) { // Check if visible
    try {
      // Instead of capturing HTML, draw a simplified timeline representation
      timelineSvg = await drawTimelineSnapshot(timelineEl, scenarioData)
    } catch (err) {
      console.warn('Could not capture timeline, will draw fallback:', err.message)
      timelineSvg = null
    }
  }
  
  // Capture the HDDL map as a true on-screen screenshot.
  // This is the most faithful representation and avoids the SVG serialization pitfalls.
  let backgroundImage = null
  if (backgroundElement) {
    try {
      backgroundImage = await captureScreenshotElement(backgroundElement)
    } catch (err) {
      console.warn('Could not capture background element:', err.message)
      backgroundImage = null
    }
  }
  
  // Layout: timeline (if available) + map + narrative
  const timelineHeight = timelineSvg ? 150 : 0

  // Allocate space: keep narrative readable while letting the map size to its aspect ratio (no crop/zoom).
  const footerHeight = 58
  const minNarrativeHeight = 320
  const maxMapHeight = Math.max(500, HEIGHT - timelineHeight - footerHeight - minNarrativeHeight)
  let mapHeight = maxMapHeight
  if (backgroundImage && backgroundImage.width && backgroundImage.height) {
    const widthFitHeight = (WIDTH / backgroundImage.width) * backgroundImage.height
    if (Number.isFinite(widthFitHeight) && widthFitHeight > 0) {
      mapHeight = Math.min(maxMapHeight, widthFitHeight)
    }
  }
  const bottomHeight = HEIGHT - timelineHeight - mapHeight
  
  let currentY = 0
  
  // === TIMELINE (if available) ===
  if (timelineSvg) {
    // Dark background for timeline
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, currentY, WIDTH, timelineHeight)
    
    // Draw timeline with border
    const timelinePadding = 20
    ctx.fillStyle = 'rgba(13, 17, 23, 0.92)'
    ctx.fillRect(timelinePadding, currentY + 8, WIDTH - timelinePadding * 2, timelineHeight - 16)
    ctx.strokeStyle = '#58a6ff'
    ctx.lineWidth = 2
    ctx.strokeRect(timelinePadding, currentY + 8, WIDTH - timelinePadding * 2, timelineHeight - 16)
    
    // Draw the timeline image
    ctx.drawImage(timelineSvg, timelinePadding + 6, currentY + 12, WIDTH - timelinePadding * 2 - 12, timelineHeight - 24)
    currentY += timelineHeight
  }
  
  // === MAP SECTION ===
  if (backgroundImage) {
    ctx.filter = 'none'
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, currentY, WIDTH, mapHeight)

    // Draw map to fit without cropping (no zoom/cutoff).
    const imgW = backgroundImage.width
    const imgH = backgroundImage.height
    const scale = Math.min(WIDTH / imgW, mapHeight / imgH)
    const drawW = imgW * scale
    const drawH = imgH * scale

    const dx = (WIDTH - drawW) / 2
    const dy = currentY
    ctx.drawImage(backgroundImage, dx, dy, drawW, drawH)
    ctx.filter = 'none'
  } else {
    // Fallback gradient
    const gradient = ctx.createLinearGradient(0, currentY, WIDTH, currentY + mapHeight)
    gradient.addColorStop(0, '#0d1117')
    gradient.addColorStop(1, '#161b22')
    ctx.fillStyle = gradient
    ctx.fillRect(0, currentY, WIDTH, mapHeight)
  }
  
  currentY += mapHeight
  
  // === BOTTOM STRIP: Narrative + Footer (tight layout) ===
  const narrativeY = currentY
  
  // Dark background for narrative section
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, narrativeY, WIDTH, bottomHeight)

  // Subtle separator between map and narrative
  {
    const sepH = 10
    ctx.fillStyle = '#30363d'
    ctx.fillRect(0, narrativeY, WIDTH, 1)

    const gradient = ctx.createLinearGradient(0, narrativeY, 0, narrativeY + sepH)
    gradient.addColorStop(0, 'rgba(88, 166, 255, 0.28)')
    gradient.addColorStop(1, 'rgba(88, 166, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, narrativeY, WIDTH, sepH)
  }
  
  const narrativePadding = 50

  // Keep the narrative column readable by capping line length.
  // This improves scanability without forcing large vertical expansion.
  const narrativeMaxWidth = Math.min(WIDTH - narrativePadding * 2, 1280)
  const narrativeX = Math.round((WIDTH - narrativeMaxWidth) / 2)

  // Scenario title is the showcase element: render it large + centered under the narrative.
  const showcaseTitleMaxLines = 2
  const showcaseTitleLineHeight = 48
  const showcaseTitleHeight = scenarioTitle ? (showcaseTitleLineHeight * showcaseTitleMaxLines + 14) : 0

  const narrativeTopPadding = 18
  currentY = narrativeY + narrativeTopPadding
  
  // Draw narrative - use remaining space minus footer
  ctx.font = '21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  const narrativeSectionBottomY = HEIGHT - footerHeight - showcaseTitleHeight
  const availableNarrativeHeight = Math.max(0, narrativeSectionBottomY - currentY)
  const narrativeForCard = stripLeadingScenarioTitle(narrative, scenarioTitle)
  currentY += drawFormattedNarrative(ctx, narrativeForCard, narrativeX, currentY, narrativeMaxWidth, availableNarrativeHeight, 25)

  // Showcase scenario title (big + centered) below the narrative
  if (scenarioTitle) {
    const titleAreaTop = HEIGHT - footerHeight - showcaseTitleHeight
    const titleStartY = Math.max(currentY + 10, titleAreaTop)
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    drawCenteredWrappedLines(
      ctx,
      scenarioTitle,
      WIDTH / 2,
      titleStartY,
      narrativeMaxWidth,
      showcaseTitleLineHeight,
      showcaseTitleMaxLines
    )
    ctx.restore()
  }
  
  // === COMPACT FOOTER: Title, Stats, Links ===
  const footerY = HEIGHT - footerHeight
  
  // Title on left
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('Human-Derived Decision Layer (HDDL)', narrativePadding, footerY + 6)
  
  // Scenario title + link on same line
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#58a6ff'
  ctx.fillText('enufacas.github.io/hddl', narrativePadding, footerY + 32)
  
  // Stats on right (top line)
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#c9d1d9'
  ctx.textAlign = 'right'
  const statsText = `${stats.agents.length} Agents | ${stats.envelopes.length} Envelopes | ${stats.stewards.length} Stewards | ${stats.totalEvents} Events`
  ctx.fillText(statsText, WIDTH - narrativePadding, footerY + 6)
  ctx.fillStyle = '#58a6ff'
  ctx.fillText('github.com/enufacas/hddl', WIDTH - narrativePadding, footerY + 32)
  
  return new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png')
  })
}

/**
 * Draw a snapshot of the timeline bar without using foreignObject (avoids canvas tainting)
 */
async function drawTimelineSnapshot(timelineEl, scenarioData) {
  const rect = timelineEl.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = rect.width
  canvas.height = rect.height
  
  // Draw background
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw border
  ctx.strokeStyle = '#30363d'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, canvas.width, canvas.height)
  
  // Extract events from scenario data
  const scenario = scenarioData?.scenario
  if (!scenario || !scenario.events) {
    return canvas
  }
  
  const events = scenario.events || []
  const duration = scenario.durationHours || 48
  const timelineWidth = canvas.width - 32 // Account for padding
  const timelineX = 16
  const timelineY = canvas.height / 2
  
  // Draw timeline base
  ctx.strokeStyle = '#484f58'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(timelineX, timelineY)
  ctx.lineTo(timelineX + timelineWidth, timelineY)
  ctx.stroke()
  
  // Draw event markers
  const eventColors = {
    'signal': '#ffd93d',
    'decision': '#6bcf7f',
    'boundary_interaction': '#ff6b6b',
    'revision': '#c792ea',
    'retrieval': '#58a6ff',
    'embedding': '#f97583'
  }
  
  events.forEach(event => {
    const hour = event.hour || 0
    if (hour < 0 || hour > duration) return
    
    const x = timelineX + (hour / duration) * timelineWidth
    const color = eventColors[event.type] || '#8b949e'
    
    // Draw marker
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, timelineY, 4, 0, Math.PI * 2)
    ctx.fill()
  })
  
  return canvas
}

/**
 * Capture an element as it appears on-screen ("screenshot" style) using html2canvas.
 * This avoids SVG serialization / CSS-variable issues.
 */
async function captureScreenshotElement(element) {
  // If the element is not in the layout, html2canvas returns blank.
  const rect = element.getBoundingClientRect()
  if (!rect || rect.width < 10 || rect.height < 10) {
    throw new Error('Element not visible for capture')
  }

  // Slight zoom-out of the inner SVG before capture so the map content appears a bit smaller.
  // This uses a temporary CSS transform on the SVG only (not the container) so layout sizing
  // and our crop math remain stable.
  const CAPTURE_SVG_SCALE = 0.92
  const svgRoot = element.tagName === 'svg' ? element : element.querySelector('svg')
  const prevSvgTransform = svgRoot ? svgRoot.style.transform : ''
  const prevSvgTransformOrigin = svgRoot ? svgRoot.style.transformOrigin : ''
  if (svgRoot) {
    svgRoot.style.transformOrigin = 'center center'
    svgRoot.style.transform = `scale(${CAPTURE_SVG_SCALE})`
  }

  try {

  // If the embedding store is present, we'll crop it out after capture.
  const embeddingEl = element.querySelector('svg .embedding-store')
  const embeddingRect = embeddingEl ? embeddingEl.getBoundingClientRect() : null

  const memoriesLabelEl = Array.from(element.querySelectorAll('svg text'))
    .find((t) => String(t?.textContent || '').includes('Memories'))
  const memoriesLabelRect = memoriesLabelEl ? memoriesLabelEl.getBoundingClientRect() : null

    const canvas = await html2canvas(element, {
      backgroundColor: null,
      useCORS: true,
      allowTaint: false,
      logging: false,
      scale: 2,
      imageTimeout: 15000,
    })

    // Crop off the memories vector space at the bottom (faithful to what you want to share).
    // Convert DOM pixels -> captured canvas pixels.
    {
      const candidateRects = [embeddingRect, memoriesLabelRect].filter(r => r && r.width > 0 && r.height > 0)
      if (candidateRects.length > 0) {
        const scaleY = canvas.height / rect.height
        const topPx = Math.min(...candidateRects.map(r => r.top))
        const topInElementPx = Math.max(0, topPx - rect.top)

        // Trim comfortably above the label so none of the embedding section shows.
        const cutoffDomPx = Math.max(0, topInElementPx - 84)
        const cutoffCanvasPx = Math.floor(cutoffDomPx * scaleY)

        // Only crop if it meaningfully reduces height.
        if (cutoffCanvasPx > 100 && cutoffCanvasPx < canvas.height - 80) {
          return cropCanvas(canvas, 0, 0, canvas.width, cutoffCanvasPx)
        }
      }
    }

    return canvas
  } finally {
    if (svgRoot) {
      svgRoot.style.transform = prevSvgTransform
      svgRoot.style.transformOrigin = prevSvgTransformOrigin
    }
  }
}

function cropCanvas(sourceCanvas, sx, sy, sw, sh) {
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.floor(sw))
  out.height = Math.max(1, Math.floor(sh))
  const outCtx = out.getContext('2d')
  outCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height)
  return out
}

/**
 * Draw wrapped text centered around a given x coordinate.
 * Returns total height used.
 */
function drawCenteredWrappedLines(ctx, text, centerX, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
      continue
    }

    if (line) lines.push(line)
    line = word

    if (lines.length >= maxLines) break
  }

  if (lines.length < maxLines && line) lines.push(line)

  // If we had to cut off content, add an ellipsis on the last line.
  const allWordsUsed = lines.join(' ').split(/\s+/).length >= words.length
  if (!allWordsUsed && lines.length) {
    let last = lines[lines.length - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.split(/\s+/).slice(0, -1).join(' ')
    }
    lines[lines.length - 1] = last ? `${last}…` : '…'
  }

  let currentY = y
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    ctx.fillText(lines[i], centerX, currentY)
    currentY += lineHeight
  }

  return currentY - y
}

function stripLeadingScenarioTitle(narrative, scenarioTitle) {
  if (!narrative || !scenarioTitle) return narrative

  const title = String(scenarioTitle).trim()
  if (!title) return narrative

  // Remove a leading line that is just the scenario title (optionally as a markdown heading).
  // This prevents the title from appearing both inside the narrative text and as the
  // centered "showcase" title.
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^\\s*(?:#{1,6}\\s*)?${escaped}\\s*(?:\\r?\\n\\s*)+`, 'i')
  const stripped = String(narrative).replace(re, '')
  return stripped
}

/**
 * Extract scenario statistics from scenario data
 */
function extractScenarioStats(scenarioData) {
  if (!scenarioData || !scenarioData.scenario) {
    return {
      agents: [],
      envelopes: [],
      stewards: [],
      timeRange: { min: 0, max: 0 },
      totalEvents: 0
    }
  }

  const scenario = scenarioData.scenario
  const events = scenario.events || []
  
  // Extract unique agents from fleets
  const agentNames = []
  if (scenario.fleets) {
    scenario.fleets.forEach(fleet => {
      if (fleet.agents) {
        fleet.agents.forEach(agent => {
          if (agent.name) agentNames.push(agent.name)
        })
      }
    })
  }
  
  // Extract envelopes
  const envelopes = scenario.envelopes || []
  
  // Extract unique stewards from events and fleets
  const stewardSet = new Set()
  events.forEach(e => {
    if (e.stewardId) stewardSet.add(e.stewardId)
    if (e.actorRole && e.actorRole.toLowerCase().includes('steward')) {
      stewardSet.add(e.actorName || e.actorRole)
    }
  })
  // Also get from fleet ownership
  if (scenario.fleets) {
    scenario.fleets.forEach(fleet => {
      if (fleet.stewardRole) stewardSet.add(fleet.stewardRole)
    })
  }
  
  // Calculate time range
  const hours = events.map(e => e.hour || 0)
  const timeRange = {
    min: hours.length > 0 ? Math.min(...hours, 0) : 0,
    max: hours.length > 0 ? Math.max(...hours, 1) : scenario.durationHours || 48
  }
  
  return {
    agents: agentNames,
    envelopes: envelopes,
    stewards: Array.from(stewardSet),
    timeRange,
    totalEvents: events.length
  }
}

/**
 * Draw narrative with full formatting and event references (matches AI narrative pane)
 */
function drawFormattedNarrative(ctx, text, x, y, maxWidth, maxHeight, lineHeight) {
  const cleaned = String(text || '')
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
    .trim()

  // If the generator didn't emit paragraphs, create a few "soft" paragraph breaks
  // at obvious transition phrases. This improves scanability without adding new content.
  const softParagraphText = cleaned.includes('\n\n')
    ? cleaned
    : cleaned.replace(/(?<=\.)\s+(?=(Late|As|By|Then|Next|After|Meanwhile)\b)/g, '\n\n')

  // Split paragraphs on blank lines. Preserve readability without large vertical spacing by
  // using a first-line indent instead of a big blank gap.
  const paragraphs = softParagraphText
    .split(/\n\s*\n+/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const eventRefRegex = /\[([a-z_]+):(\d+)\]/gi
  const hourRefRegex = /\b(Hour|Day|Week)\s+(\d+(?:\.\d+)?)/gi

  let currentY = y
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const firstLineIndent = 28
  for (let pIndex = 0; pIndex < paragraphs.length && currentY < y + maxHeight - lineHeight; pIndex++) {
    const paragraph = paragraphs[pIndex]
    const words = paragraph.split(/(\s+)/)
    let currentX = x + firstLineIndent
    let isFirstLineOfParagraph = true

    for (let i = 0; i < words.length && currentY < y + maxHeight - lineHeight; i++) {
      const word = words[i]

      eventRefRegex.lastIndex = 0
      const eventMatch = eventRefRegex.exec(word)
      if (eventMatch) {
        const eventType = eventMatch[1]
        ctx.fillStyle = eventType === 'signal' ? '#ffd93d' :
                        eventType === 'decision' ? '#6bcf7f' :
                        eventType === 'boundary' ? '#ff6b6b' :
                        eventType === 'revision' ? '#c792ea' :
                        '#58a6ff'
      } else {
        hourRefRegex.lastIndex = 0
        const hourMatch = hourRefRegex.exec(word)
        ctx.fillStyle = hourMatch ? '#58a6ff' : '#c9d1d9'
      }

      const metrics = ctx.measureText(word)
      const lineLeftX = isFirstLineOfParagraph ? (x + firstLineIndent) : x

      // Wrap to next line as needed.
      if (currentX + metrics.width > x + maxWidth && currentX > lineLeftX) {
        currentY += lineHeight
        currentX = x
        isFirstLineOfParagraph = false

        if (currentY > y + maxHeight - lineHeight) {
          ctx.fillStyle = '#8b949e'
          ctx.fillText('...', currentX, currentY)
          return currentY - y + lineHeight
        }
      }

      // Draw
      ctx.fillText(word, currentX, currentY)
      currentX += metrics.width
    }

    // Next paragraph: move to a new line, but keep spacing tight.
    currentY += lineHeight
  }

  return currentY - y
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob, filename = 'hddl-scenario-share.png') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Create and show share modal with preview
 */
export function showShareModal({ prompt, narrative, scenarioTitle, scenario }) {
  const modal = document.createElement('div')
  modal.className = 'share-modal'
  modal.innerHTML = `
    <div class="share-modal-overlay"></div>
    <div class="share-modal-content">
      <div class="share-modal-header">
        <h2>Share Your Scenario</h2>
        <button class="share-modal-close" aria-label="Close">
          <span class="codicon codicon-close"></span>
        </button>
      </div>
      
      <div class="share-modal-body">
        <div class="share-actions">
          <button class="monaco-button share-download">
            <span class="codicon codicon-desktop-download"></span>
            Download Image
          </button>
        </div>

        <div class="share-preview">
          <canvas id="share-preview-canvas"></canvas>
          <div class="share-preview-loading">
            <div class="spinner"></div>
            <p>Generating share card...</p>
          </div>
        </div>
        
        <div class="share-info">
          <p>Share your custom HDDL scenario with others. The image includes your prompt and narrative excerpt.</p>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Close handlers
  const closeModal = () => {
    modal.remove()
  }
  
  modal.querySelector('.share-modal-overlay').addEventListener('click', closeModal)
  modal.querySelector('.share-modal-close').addEventListener('click', closeModal)
  
  // Generate preview
  const backgroundElement = document.querySelector('#hddl-map-container') || document.querySelector('.hddl-map') || document.querySelector('#editor-area')
  const previewCanvas = modal.querySelector('#share-preview-canvas')
  const loadingEl = modal.querySelector('.share-preview-loading')
  
  generateShareCard({ prompt, narrative, scenarioTitle, scenarioData: { scenario }, backgroundElement })
    .then(blob => {
      loadingEl.style.display = 'none'
      
      // Show preview
      const img = new Image()
      img.onload = () => {
        const ctx = previewCanvas.getContext('2d')
        previewCanvas.width = 960  // Half size for preview (1920x1440)
        previewCanvas.height = 720
        ctx.drawImage(img, 0, 0, 960, 720)
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(blob)
      
      // Wire up action buttons
      modal.querySelector('.share-download').addEventListener('click', () => {
        downloadBlob(blob, `hddl-${scenarioTitle || 'scenario'}.png`)
      })
    })
    .catch(err => {
      console.error('Failed to generate share card:', err)
      loadingEl.innerHTML = '<p style="color: var(--vscode-errorForeground)">Failed to generate share card</p>'
    })
  
  return modal
}
