/**
 * Layout Manager - Panel Docking and Layout Presets
 * Provides layout presets and panel state management
 */

const LAYOUT_STORAGE_KEY = 'hddl:layout:presets'
const ACTIVE_PRESET_KEY = 'hddl:layout:active'

/**
 * Predefined layout presets
 */
export const LAYOUT_PRESETS = {
  default: {
    id: 'default',
    name: 'Default',
    icon: 'layout',
    description: 'Standard layout with all panels visible',
    sidebar: { visible: true, width: 300 },
    auxiliary: { visible: true, width: 350 },
    bottom: { visible: false, height: 200 }
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    icon: 'eye',
    description: 'Editor only - hide all panels for maximum focus',
    sidebar: { visible: false, width: 300 },
    auxiliary: { visible: false, width: 350 },
    bottom: { visible: false, height: 200 }
  },
  analysis: {
    id: 'analysis',
    name: 'Analysis',
    icon: 'graph',
    description: 'Wide auxiliary panel for detailed evidence review',
    sidebar: { visible: true, width: 240 },
    auxiliary: { visible: true, width: 500 },
    bottom: { visible: false, height: 200 }
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    icon: 'fold',
    description: 'Minimal chrome - narrow sidebar, no auxiliary',
    sidebar: { visible: true, width: 180 },
    auxiliary: { visible: false, width: 350 },
    bottom: { visible: false, height: 200 }
  },
  review: {
    id: 'review',
    name: 'Review',
    icon: 'checklist',
    description: 'Bottom panel visible for logs and CLI',
    sidebar: { visible: true, width: 280 },
    auxiliary: { visible: true, width: 320 },
    bottom: { visible: true, height: 240 }
  }
}

/**
 * Load custom presets from localStorage
 * @returns {Object} Map of custom preset IDs to preset configs
 */
function loadCustomPresets() {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save custom presets to localStorage
 * @param {Object} presets - Map of preset IDs to configs
 */
function saveCustomPresets(presets) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the active preset ID
 * @returns {string}
 */
function getActivePresetId() {
  try {
    return localStorage.getItem(ACTIVE_PRESET_KEY) || 'default'
  } catch {
    return 'default'
  }
}

/**
 * Set the active preset ID
 * @param {string} id - Preset ID
 */
function setActivePresetId(id) {
  try {
    localStorage.setItem(ACTIVE_PRESET_KEY, id)
  } catch {
    // Ignore storage errors
  }
}

/**
 * LayoutManager class for managing panel layouts
 */
export class LayoutManager {
  constructor() {
    this.presets = { ...LAYOUT_PRESETS }
    this.customPresets = loadCustomPresets()
    this.activePresetId = getActivePresetId()
    this.listeners = []
    
    // DOM references (set during init)
    this.sidebar = null
    this.auxiliary = null
    this.bottom = null
    
    // Functions to toggle panels (set during init)
    this.setAuxCollapsed = null
    this.setBottomCollapsed = null
  }
  
  /**
   * Initialize the layout manager with DOM references
   * @param {Object} options
   */
  init(options = {}) {
    this.sidebar = options.sidebar || document.querySelector('.sidebar')
    this.auxiliary = options.auxiliary || document.querySelector('.auxiliarybar')
    this.bottom = options.bottom || document.querySelector('.panel')
    this.setSidebarCollapsed = options.setSidebarCollapsed || (() => {})
    this.setAuxCollapsed = options.setAuxCollapsed || (() => {})
    this.setBottomCollapsed = options.setBottomCollapsed || (() => {})
    
    // Apply the active preset on init
    const activePreset = this.getPreset(this.activePresetId)
    if (activePreset) {
      this.applyPreset(activePreset, false) // Don't save on init
    }
  }
  
  /**
   * Get all available presets (built-in + custom)
   * @returns {Object[]}
   */
  getAllPresets() {
    const custom = Object.values(this.customPresets).map(p => ({ ...p, isCustom: true }))
    const builtIn = Object.values(this.presets).map(p => ({ ...p, isCustom: false }))
    return [...builtIn, ...custom]
  }
  
  /**
   * Get a specific preset by ID
   * @param {string} id - Preset ID
   * @returns {Object|null}
   */
  getPreset(id) {
    return this.presets[id] || this.customPresets[id] || null
  }
  
  /**
   * Apply a layout preset
   * @param {Object|string} presetOrId - Preset object or ID
   * @param {boolean} save - Whether to save as active preset
   */
  applyPreset(presetOrId, save = true) {
    const preset = typeof presetOrId === 'string' 
      ? this.getPreset(presetOrId) 
      : presetOrId
    
    if (!preset) {
      console.warn('Layout preset not found:', presetOrId)
      return
    }
    
    // Apply sidebar settings
    if (this.sidebar && preset.sidebar) {
      this.setSidebarCollapsed(!preset.sidebar.visible)
      // Only set width when visible - body class handles collapse
      if (preset.sidebar.visible && this.sidebar) {
        this.sidebar.style.width = `${preset.sidebar.width}px`
        document.documentElement.style.setProperty('--sidebar-width', `${preset.sidebar.width}px`)
      }
    }
    
    // Apply auxiliary settings
    if (preset.auxiliary) {
      this.setAuxCollapsed(!preset.auxiliary.visible)
      if (this.auxiliary && preset.auxiliary.visible) {
        this.auxiliary.style.width = `${preset.auxiliary.width}px`
        document.documentElement.style.setProperty('--auxiliarybar-width', `${preset.auxiliary.width}px`)
      }
    }
    
    // Apply bottom panel settings
    if (preset.bottom) {
      this.setBottomCollapsed(!preset.bottom.visible)
      if (preset.bottom.visible) {
        document.documentElement.style.setProperty('--panel-height', `${preset.bottom.height}px`)
      }
    }
    
    // Save active preset
    if (save) {
      this.activePresetId = preset.id
      setActivePresetId(preset.id)
    }
    
    // Notify listeners
    this._notifyListeners(preset)
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('hddl:layout:change', {
      detail: { preset, presetId: preset.id }
    }))
  }
  
  /**
   * Save the current layout as a custom preset
   * @param {string} name - Preset name
   * @returns {Object} The saved preset
   */
  saveCurrentAsPreset(name) {
    const id = `custom-${Date.now()}`
    
    const preset = {
      id,
      name,
      icon: 'bookmark',
      description: 'Custom layout',
      isCustom: true,
      sidebar: {
        visible: this.sidebar ? parseInt(getComputedStyle(this.sidebar).width) > 50 : true,
        width: this.sidebar ? parseInt(getComputedStyle(this.sidebar).width) : 300
      },
      auxiliary: {
        visible: !document.body.classList.contains('aux-hidden'),
        width: this.auxiliary ? parseInt(getComputedStyle(this.auxiliary).width) : 350
      },
      bottom: {
        visible: !document.body.classList.contains('panel-hidden'),
        height: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-height')) || 200
      }
    }
    
    this.customPresets[id] = preset
    saveCustomPresets(this.customPresets)
    
    return preset
  }
  
  /**
   * Delete a custom preset
   * @param {string} id - Preset ID
   * @returns {boolean} Success
   */
  deleteCustomPreset(id) {
    if (!this.customPresets[id]) return false
    
    delete this.customPresets[id]
    saveCustomPresets(this.customPresets)
    
    // If this was the active preset, switch to default
    if (this.activePresetId === id) {
      this.applyPreset('default')
    }
    
    return true
  }
  
  /**
   * Reset to default layout
   */
  reset() {
    this.applyPreset('default')
  }
  
  /**
   * Subscribe to layout changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }
  
  _notifyListeners(preset) {
    this.listeners.forEach(l => {
      try {
        l(preset)
      } catch (e) {
        console.error('Layout listener error:', e)
      }
    })
  }
}

/**
 * Create the layout selector UI component
 * @param {LayoutManager} layoutManager
 * @returns {HTMLElement}
 */
export function createLayoutSelector(layoutManager) {
  const container = document.createElement('div')
  container.className = 'layout-selector'
  
  const button = document.createElement('button')
  button.className = 'layout-selector-button'
  button.setAttribute('type', 'button')
  button.setAttribute('aria-label', 'Layout presets')
  button.setAttribute('aria-haspopup', 'true')
  button.setAttribute('aria-expanded', 'false')
  button.innerHTML = `
    <span class="codicon codicon-layout" aria-hidden="true"></span>
    <span class="layout-selector-label">Layout</span>
    <span class="codicon codicon-chevron-down" aria-hidden="true"></span>
  `
  
  const dropdown = document.createElement('div')
  dropdown.className = 'layout-selector-dropdown'
  dropdown.setAttribute('role', 'menu')
  dropdown.hidden = true
  
  function renderDropdown() {
    const presets = layoutManager.getAllPresets()
    const activeId = layoutManager.activePresetId
    
    dropdown.innerHTML = `
      <div class="layout-selector-header">Layout Presets</div>
      <div class="layout-selector-presets">
        ${presets.map(p => `
          <button
            class="layout-preset-item ${p.id === activeId ? 'active' : ''}"
            type="button"
            role="menuitem"
            data-preset-id="${p.id}"
            title="${p.description || ''}"
          >
            <span class="codicon codicon-${p.icon || 'layout'}" aria-hidden="true"></span>
            <span class="preset-name">${p.name}</span>
            ${p.isCustom ? '<span class="preset-badge">Custom</span>' : ''}
            ${p.id === activeId ? '<span class="codicon codicon-check" aria-hidden="true"></span>' : ''}
          </button>
        `).join('')}
      </div>
      <div class="layout-selector-actions">
        <button class="layout-action-item" type="button" role="menuitem" data-action="save">
          <span class="codicon codicon-save" aria-hidden="true"></span>
          <span>Save current layout</span>
        </button>
        <button class="layout-action-item" type="button" role="menuitem" data-action="reset">
          <span class="codicon codicon-discard" aria-hidden="true"></span>
          <span>Reset to default</span>
        </button>
      </div>
    `
    
    // Preset click handlers
    dropdown.querySelectorAll('.layout-preset-item').forEach(item => {
      item.addEventListener('click', () => {
        const presetId = item.dataset.presetId
        layoutManager.applyPreset(presetId)
        closeDropdown()
        renderDropdown() // Re-render to update active state
      })
    })
    
    // Save current layout
    dropdown.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      const name = prompt('Enter a name for this layout:')
      if (name) {
        layoutManager.saveCurrentAsPreset(name)
        renderDropdown()
      }
    })
    
    // Reset to default
    dropdown.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      layoutManager.reset()
      closeDropdown()
      renderDropdown()
    })
  }
  
  function openDropdown() {
    dropdown.hidden = false
    button.setAttribute('aria-expanded', 'true')
    // Append dropdown to body to escape statusbar stacking context
    document.body.appendChild(dropdown)
    renderDropdown()
  }
  
  function closeDropdown() {
    dropdown.hidden = true
    button.setAttribute('aria-expanded', 'false')
    // Remove from body when closed
    if (dropdown.parentNode === document.body) {
      document.body.removeChild(dropdown)
    }
  }
  
  function toggleDropdown() {
    if (dropdown.hidden) {
      openDropdown()
    } else {
      closeDropdown()
    }
  }
  
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleDropdown()
  })
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeDropdown()
    }
  })
  
  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      closeDropdown()
      button.focus()
    }
  })
  
  container.appendChild(button)
  // Don't append dropdown to container - it will be added to body when opened
  
  // Add highlight arrow
  const arrow = document.createElement('div')
  arrow.className = 'layout-highlight-arrow'
  arrow.innerHTML = '<span class="codicon codicon-arrow-right"></span>'
  container.appendChild(arrow)

  // Remove arrow on first interaction
  const removeArrow = () => {
    if (arrow.parentNode) {
      arrow.remove()
    }
    button.removeEventListener('click', removeArrow)
  }
  button.addEventListener('click', removeArrow)
  
  return container
}

// Export singleton instance
export const layoutManager = new LayoutManager()
