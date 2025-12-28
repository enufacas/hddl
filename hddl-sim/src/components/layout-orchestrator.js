/**
 * Layout Orchestrator
 * 
 * Coordinates responsive behavior across the workspace:
 * - Monitors container size via ResizeObserver
 * - Debounces resize events
 * - Coordinates panel collapses at breakpoints
 * - Emits custom events for layout changes
 * - Syncs SVG detail level with available editor width
 */

// Breakpoint definitions
export const BREAKPOINTS = {
  WIDE: 1400,      // Full layout - all panels visible
  STANDARD: 1200,  // Hide auxiliary panel
  NARROW: 900,     // Collapse sidebar to icons
  MOBILE: 768,     // Switch to mobile layout
  COMPACT: 480     // Ultra-compact mobile
}

// Layout modes mapped to breakpoints
export const LAYOUT_MODES = {
  WIDE: 'wide',
  STANDARD: 'standard',
  NARROW: 'narrow',
  MOBILE: 'mobile',
  COMPACT: 'compact'
}

/**
 * Get layout mode for a given width
 * @param {number} width - Container width in pixels
 * @returns {string} - Layout mode name
 */
export function getLayoutMode(width) {
  if (width >= BREAKPOINTS.WIDE) return LAYOUT_MODES.WIDE
  if (width >= BREAKPOINTS.STANDARD) return LAYOUT_MODES.STANDARD
  if (width >= BREAKPOINTS.NARROW) return LAYOUT_MODES.NARROW
  if (width >= BREAKPOINTS.MOBILE) return LAYOUT_MODES.MOBILE
  return LAYOUT_MODES.COMPACT
}

/**
 * LayoutOrchestrator class
 * Manages responsive layout coordination
 */
export class LayoutOrchestrator {
  constructor(options = {}) {
    this.container = null
    this.observer = null
    this.currentMode = null
    this.currentWidth = 0
    this.debounceTimeout = null
    this.debounceDelay = options.debounceDelay || 100
    this.onModeChange = options.onModeChange || null
    this.isInitialized = false
    
    // Panel state
    this.panelState = {
      sidebar: true,
      auxiliary: true,
      sidebarCollapsed: false  // Collapsed to icons
    }
    
    // Bound handlers
    this._handleResize = this._handleResize.bind(this)
  }
  
  /**
   * Initialize the orchestrator
   * @param {HTMLElement} container - The container to observe
   */
  init(container) {
    if (this.isInitialized) {
      console.warn('LayoutOrchestrator already initialized')
      return
    }
    
    this.container = container || document.querySelector('.monaco-workbench')
    
    if (!this.container) {
      console.error('LayoutOrchestrator: No container found')
      return
    }
    
    // Create ResizeObserver
    this.observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        this._handleResize(entry.contentRect.width)
      }
    })
    
    // Start observing
    this.observer.observe(this.container)
    
    // Initial calculation
    this._handleResize(this.container.clientWidth)
    
    this.isInitialized = true
    
    // Dispatch init event
    this._dispatchEvent('hddl:layout:init', {
      mode: this.currentMode,
      width: this.currentWidth,
      panelState: { ...this.panelState }
    })
  }
  
  /**
   * Handle resize with debouncing
   * @private
   */
  _handleResize(width) {
    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }
    
    // Debounce the resize handler
    this.debounceTimeout = setTimeout(() => {
      this._processResize(width)
    }, this.debounceDelay)
  }
  
  /**
   * Process the resize after debounce
   * @private
   */
  _processResize(width) {
    const previousMode = this.currentMode
    const previousWidth = this.currentWidth
    
    this.currentWidth = width
    this.currentMode = getLayoutMode(width)
    
    // Only process if mode changed
    if (previousMode !== this.currentMode) {
      this._applyModeChanges(previousMode, this.currentMode)
      
      // Callback
      if (this.onModeChange) {
        this.onModeChange(this.currentMode, previousMode)
      }
    }
    
    // Always dispatch resize event (for SVG detail level sync)
    this._dispatchEvent('hddl:layout:resize', {
      mode: this.currentMode,
      width: this.currentWidth,
      previousWidth,
      modeChanged: previousMode !== this.currentMode
    })
  }
  
  /**
   * Apply layout changes for mode transition
   * @private
   */
  _applyModeChanges(fromMode, toMode) {
    const body = document.body
    
    // Remove old mode class
    if (fromMode) {
      body.classList.remove(`layout-${fromMode}`)
    }
    
    // Add new mode class
    body.classList.add(`layout-${toMode}`)
    
    // Apply panel state changes based on breakpoints
    switch (toMode) {
      case LAYOUT_MODES.WIDE:
        this._setPanelVisibility('sidebar', true, false)
        this._setPanelVisibility('auxiliary', true)
        break
        
      case LAYOUT_MODES.STANDARD:
        this._setPanelVisibility('sidebar', true, false)
        this._setPanelVisibility('auxiliary', false)
        break
        
      case LAYOUT_MODES.NARROW:
        this._setPanelVisibility('sidebar', true, true)  // Collapsed to icons
        this._setPanelVisibility('auxiliary', false)
        break
        
      case LAYOUT_MODES.MOBILE:
      case LAYOUT_MODES.COMPACT:
        this._setPanelVisibility('sidebar', false)
        this._setPanelVisibility('auxiliary', false)
        break
    }
    
    // Dispatch mode change event
    this._dispatchEvent('hddl:layout:change', {
      mode: toMode,
      previousMode: fromMode,
      width: this.currentWidth,
      panelState: { ...this.panelState }
    })
  }
  
  /**
   * Set panel visibility
   * @private
   */
  _setPanelVisibility(panel, visible, collapsed = false) {
    const body = document.body

    // Respect user-selected layout presets.
    // Focus mode must keep chrome panels hidden, regardless of responsive breakpoint.
    let activeLayout = null
    try {
      activeLayout = localStorage.getItem('hddl:layout:active')
    } catch {
      activeLayout = null
    }
    const isFocusLayout = (activeLayout || 'focus') === 'focus'
    
    if (panel === 'sidebar') {
      if (isFocusLayout) {
        visible = false
        collapsed = false
      }

      this.panelState.sidebar = visible
      this.panelState.sidebarCollapsed = collapsed
      
      body.classList.toggle('sidebar-hidden', !visible)
      body.classList.toggle('sidebar-collapsed', collapsed)
    } else if (panel === 'auxiliary') {
      if (isFocusLayout) {
        visible = false
      }

      this.panelState.auxiliary = visible
      body.classList.toggle('aux-hidden', !visible)
    }
  }
  
  /**
   * Dispatch a custom event
   * @private
   */
  _dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      detail
    })
    document.dispatchEvent(event)
  }
  
  /**
   * Get current layout mode
   * @returns {string}
   */
  getMode() {
    return this.currentMode
  }
  
  /**
   * Get current container width
   * @returns {number}
   */
  getWidth() {
    return this.currentWidth
  }
  
  /**
   * Get panel state
   * @returns {object}
   */
  getPanelState() {
    return { ...this.panelState }
  }
  
  /**
   * Manually set panel visibility (overrides automatic behavior)
   * @param {string} panel - 'sidebar' or 'auxiliary'
   * @param {boolean} visible - Whether to show the panel
   */
  setPanel(panel, visible) {
    this._setPanelVisibility(panel, visible)
    
    this._dispatchEvent('hddl:layout:panel', {
      panel,
      visible,
      mode: this.currentMode
    })
  }
  
  /**
   * Force a layout recalculation
   */
  recalculate() {
    if (this.container) {
      this._processResize(this.container.clientWidth)
    }
  }
  
  /**
   * Cleanup and destroy the orchestrator
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = null
    }
    
    this.container = null
    this.isInitialized = false
  }
}

// Create singleton instance
export const layoutOrchestrator = new LayoutOrchestrator()

/**
 * Initialize the layout orchestrator (convenience function)
 * @param {HTMLElement} container - Optional container element
 * @param {object} options - Options passed to the orchestrator
 */
export function initLayoutOrchestrator(container, options = {}) {
  if (options.debounceDelay) {
    layoutOrchestrator.debounceDelay = options.debounceDelay
  }
  if (options.onModeChange) {
    layoutOrchestrator.onModeChange = options.onModeChange
  }
  
  layoutOrchestrator.init(container)
  return layoutOrchestrator
}
