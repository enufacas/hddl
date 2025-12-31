/**
 * Resizable Panel System
 * Provides drag-to-resize functionality for workspace panels
 */

const STORAGE_PREFIX = 'hddl:panel:'

/**
 * Panel configuration defaults
 */
const PANEL_DEFAULTS = {
  sidebar: { min: 180, max: 500, default: 300 },
  auxiliary: { min: 200, max: 600, default: 350 },
  bottom: { min: 100, max: 800, default: 200 }
}

/**
 * Load panel width from localStorage
 * @param {string} panelId - Panel identifier
 * @returns {number|null}
 */
function loadPanelWidth(panelId) {
  try {
    const value = localStorage.getItem(STORAGE_PREFIX + panelId)
    return value ? parseInt(value, 10) : null
  } catch {
    return null
  }
}

/**
 * Save panel width to localStorage
 * @param {string} panelId - Panel identifier
 * @param {number} width - Width in pixels
 */
function savePanelWidth(panelId, width) {
  try {
    localStorage.setItem(STORAGE_PREFIX + panelId, String(width))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Create a sash (resize handle) element
 * @param {'vertical'|'horizontal'} orientation - Sash orientation
 * @returns {HTMLElement}
 */
function createSash(orientation = 'vertical') {
  const sash = document.createElement('div')
  sash.className = `sash sash-${orientation}`
  sash.setAttribute('role', 'separator')
  sash.setAttribute('aria-orientation', orientation)
  sash.setAttribute('tabindex', '0')
  
  // Visual indicator line
  const indicator = document.createElement('div')
  indicator.className = 'sash-indicator'
  sash.appendChild(indicator)
  
  return sash
}

/**
 * ResizablePanel class for managing panel resize behavior
 */
export class ResizablePanel {
  /**
   * @param {HTMLElement} panel - The panel element to make resizable
   * @param {Object} options - Configuration options
   * @param {string} options.id - Panel identifier for storage
   * @param {'left'|'right'|'top'|'bottom'} options.edge - Which edge has the resize handle
   * @param {number} options.min - Minimum width/height
   * @param {number} options.max - Maximum width/height
   * @param {number} options.default - Default width/height
   * @param {Function} options.onResize - Callback when panel is resized
   * @param {Function} options.onCollapse - Callback when panel is collapsed
   */
  constructor(panel, options = {}) {
    this.panel = panel
    this.id = options.id || panel.id || 'panel'
    this.edge = options.edge || 'right'
    this.isVertical = this.edge === 'left' || this.edge === 'right'
    
    const defaults = PANEL_DEFAULTS[this.id] || { min: 100, max: 600, default: 300 }
    this.min = options.min ?? defaults.min
    this.max = options.max ?? defaults.max
    this.defaultSize = options.default ?? defaults.default
    
    this.onResize = options.onResize || (() => {})
    this.onCollapse = options.onCollapse || (() => {})
    
    this.isDragging = false
    this.startPos = 0
    this.startSize = 0
    this.currentSize = loadPanelWidth(this.id) ?? this.defaultSize
    this.previousSize = this.currentSize
    this.isCollapsed = false
    
    this.sash = null
    this.ghostLine = null
    
    this._init()
  }
  
  _init() {
    // Create and attach sash
    this.sash = createSash(this.isVertical ? 'vertical' : 'horizontal')
    this._positionSash()
    
    // Apply initial size
    this._applySize(this.currentSize)
    
    // Bind event handlers
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onTouchStart = this._onTouchStart.bind(this)
    this._onTouchMove = this._onTouchMove.bind(this)
    this._onTouchEnd = this._onTouchEnd.bind(this)
    this._onDoubleClick = this._onDoubleClick.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    
    // Attach event listeners
    this.sash.addEventListener('mousedown', this._onMouseDown)
    this.sash.addEventListener('touchstart', this._onTouchStart, { passive: false })
    this.sash.addEventListener('dblclick', this._onDoubleClick)
    this.sash.addEventListener('keydown', this._onKeyDown)
    
    // Insert sash into DOM
    this.panel.parentElement?.insertBefore(this.sash, this._getSashInsertPosition())
  }
  
  _getSashInsertPosition() {
    if (this.edge === 'right' || this.edge === 'bottom') {
      return this.panel.nextSibling
    }
    return this.panel
  }
  
  _positionSash() {
    // Position is handled by CSS grid, but we set data attributes for styling
    this.sash.dataset.edge = this.edge
    this.sash.dataset.panel = this.id
  }
  
  _applySize(size) {
    const clampedSize = Math.max(this.min, Math.min(this.max, size))
    this.currentSize = clampedSize
    
    const property = this.isVertical ? 'width' : 'height'
    const cssVar = `--${this.id}-${property}`
    
    document.documentElement.style.setProperty(cssVar, `${clampedSize}px`)
    this.panel.style[property] = `${clampedSize}px`
    
    // Dispatch resize event
    this.onResize(clampedSize)
    window.dispatchEvent(new CustomEvent('hddl:panel:resize', {
      detail: { panel: this.id, size: clampedSize }
    }))
  }
  
  _createGhostLine() {
    this.ghostLine = document.createElement('div')
    this.ghostLine.className = 'sash-ghost-line'
    this.ghostLine.style.cssText = this.isVertical
      ? 'position: fixed; top: 0; bottom: 0; width: 2px; background: var(--interactive-focus); z-index: 10000; pointer-events: none;'
      : 'position: fixed; left: 0; right: 0; height: 2px; background: var(--interactive-focus); z-index: 10000; pointer-events: none;'
    document.body.appendChild(this.ghostLine)
  }
  
  _updateGhostLine(pos) {
    if (!this.ghostLine) return
    if (this.isVertical) {
      this.ghostLine.style.left = `${pos}px`
    } else {
      this.ghostLine.style.top = `${pos}px`
    }
  }
  
  _removeGhostLine() {
    if (this.ghostLine) {
      this.ghostLine.remove()
      this.ghostLine = null
    }
  }
  
  _onMouseDown(e) {
    e.preventDefault()
    this._startDrag(e.clientX, e.clientY)
    
    document.addEventListener('mousemove', this._onMouseMove)
    document.addEventListener('mouseup', this._onMouseUp)
  }
  
  _onMouseMove(e) {
    e.preventDefault()
    this._updateDrag(e.clientX, e.clientY)
  }
  
  _onMouseUp(e) {
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('mouseup', this._onMouseUp)
    this._endDrag()
  }
  
  _onTouchStart(e) {
    if (e.touches.length !== 1) return
    e.preventDefault()
    
    const touch = e.touches[0]
    this._startDrag(touch.clientX, touch.clientY)
    
    document.addEventListener('touchmove', this._onTouchMove, { passive: false })
    document.addEventListener('touchend', this._onTouchEnd)
    document.addEventListener('touchcancel', this._onTouchEnd)
  }
  
  _onTouchMove(e) {
    if (e.touches.length !== 1) return
    e.preventDefault()
    
    const touch = e.touches[0]
    this._updateDrag(touch.clientX, touch.clientY)
  }
  
  _onTouchEnd(e) {
    document.removeEventListener('touchmove', this._onTouchMove)
    document.removeEventListener('touchend', this._onTouchEnd)
    document.removeEventListener('touchcancel', this._onTouchEnd)
    this._endDrag()
  }
  
  _startDrag(clientX, clientY) {
    this.isDragging = true
    this.startPos = this.isVertical ? clientX : clientY
    this.startSize = this.currentSize
    
    document.body.classList.add('sash-dragging')
    this.sash.classList.add('active')
    
    this._createGhostLine()
    
    const rect = this.panel.getBoundingClientRect()
    const initialPos = this.isVertical
      ? (this.edge === 'right' ? rect.right : rect.left)
      : (this.edge === 'bottom' ? rect.bottom : rect.top)
    this._updateGhostLine(initialPos)
  }
  
  _updateDrag(clientX, clientY) {
    if (!this.isDragging) return
    
    const currentPos = this.isVertical ? clientX : clientY
    const delta = currentPos - this.startPos
    
    // Adjust delta based on edge direction
    const adjustedDelta = (this.edge === 'right' || this.edge === 'bottom') ? delta : -delta
    const newSize = this.startSize + adjustedDelta
    
    // Clamp to constraints
    const clampedSize = Math.max(this.min, Math.min(this.max, newSize))
    
    // Update ghost line position
    const rect = this.panel.getBoundingClientRect()
    let ghostPos
    if (this.isVertical) {
      ghostPos = this.edge === 'right'
        ? rect.left + clampedSize
        : rect.right - clampedSize
    } else {
      ghostPos = this.edge === 'bottom'
        ? rect.top + clampedSize
        : rect.bottom - clampedSize
    }
    this._updateGhostLine(ghostPos)
    
    // Live resize (could be debounced for performance)
    this._applySize(clampedSize)
  }
  
  _endDrag() {
    if (!this.isDragging) return
    
    this.isDragging = false
    document.body.classList.remove('sash-dragging')
    this.sash.classList.remove('active')
    
    this._removeGhostLine()
    
    // Save to storage
    savePanelWidth(this.id, this.currentSize)
    
    // If collapsed, remember previous size
    if (!this.isCollapsed) {
      this.previousSize = this.currentSize
    }
  }
  
  _onDoubleClick(e) {
    e.preventDefault()
    this.toggle()
  }
  
  _onKeyDown(e) {
    const step = e.shiftKey ? 50 : 10
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        this.resize(this.currentSize - step)
        break
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        this.resize(this.currentSize + step)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        this.toggle()
        break
      case 'Home':
        e.preventDefault()
        this.resize(this.min)
        break
      case 'End':
        e.preventDefault()
        this.resize(this.max)
        break
    }
  }
  
  /**
   * Resize the panel to a specific size
   * @param {number} size - New size in pixels
   */
  resize(size) {
    this._applySize(size)
    savePanelWidth(this.id, this.currentSize)
    if (!this.isCollapsed) {
      this.previousSize = this.currentSize
    }
  }
  
  /**
   * Collapse the panel to minimum size
   */
  collapse() {
    if (this.isCollapsed) return
    this.previousSize = this.currentSize
    this.isCollapsed = true
    this._applySize(this.min)
    this.panel.classList.add('collapsed')
    this.onCollapse(true)
  }
  
  /**
   * Expand the panel to previous size
   */
  expand() {
    if (!this.isCollapsed) return
    this.isCollapsed = false
    this._applySize(this.previousSize)
    this.panel.classList.remove('collapsed')
    this.onCollapse(false)
  }
  
  /**
   * Toggle between collapsed and expanded states
   */
  toggle() {
    if (this.isCollapsed) {
      this.expand()
    } else {
      this.collapse()
    }
  }
  
  /**
   * Reset panel to default size
   */
  reset() {
    this.isCollapsed = false
    this.panel.classList.remove('collapsed')
    this._applySize(this.defaultSize)
    savePanelWidth(this.id, this.defaultSize)
    this.previousSize = this.defaultSize
  }
  
  /**
   * Clean up event listeners and DOM elements
   */
  destroy() {
    this.sash.removeEventListener('mousedown', this._onMouseDown)
    this.sash.removeEventListener('touchstart', this._onTouchStart)
    this.sash.removeEventListener('dblclick', this._onDoubleClick)
    this.sash.removeEventListener('keydown', this._onKeyDown)
    
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('mouseup', this._onMouseUp)
    document.removeEventListener('touchmove', this._onTouchMove)
    document.removeEventListener('touchend', this._onTouchEnd)
    document.removeEventListener('touchcancel', this._onTouchEnd)
    
    this._removeGhostLine()
    this.sash.remove()
  }
}

/**
 * Initialize keyboard shortcuts for panel management
 * @param {Object} panels - Map of panel instances { sidebar, auxiliary, bottom }
 */
export function initPanelKeyboardShortcuts(panels = {}) {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+B - Toggle sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      panels.sidebar?.toggle()
    }
    
    // Cmd/Ctrl+J - Toggle bottom panel
    if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault()
      panels.bottom?.toggle()
    }
    
    // Cmd/Ctrl+Shift+B - Toggle auxiliary panel
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'B') {
      e.preventDefault()
      panels.auxiliary?.toggle()
    }
  })
}

export { PANEL_DEFAULTS, loadPanelWidth, savePanelWidth }
