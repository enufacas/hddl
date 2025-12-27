import { getTimeHour } from './sim/sim-state'

const STORAGE_KEY = 'hddl:uxReview'

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveState(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function isReviewModeEnabled() {
  return Boolean(loadState().enabled)
}

export function setReviewModeEnabled(enabled) {
  const state = loadState()
  const next = { ...state, enabled: Boolean(enabled) }
  saveState(next)
  window.dispatchEvent(new CustomEvent('hddl:ux-review', { detail: { enabled: next.enabled } }))
  return next.enabled
}

function getPersona() {
  try {
    const el = document.querySelector('#persona-selector')
    if (el && typeof el.value === 'string') return el.value
  } catch {
    // ignore
  }
  return null
}

function snapshotContext() {
  const t = getTimeHour()
  return {
    ts: new Date().toISOString(),
    path: window.location.pathname,
    timeHour: typeof t === 'number' ? t : null,
    persona: getPersona(),
    userAgent: navigator.userAgent,
  }
}

function appendNote(note) {
  const state = loadState()
  const notes = Array.isArray(state.notes) ? state.notes.slice() : []
  notes.push(note)
  saveState({ ...state, notes })
  return notes
}

function getNotes() {
  const state = loadState()
  return Array.isArray(state.notes) ? state.notes : []
}

function clearNotes() {
  const state = loadState()
  saveState({ ...state, notes: [] })
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 200)
}

export function initReviewHarness() {
  // Single mount guard
  if (document.getElementById('ux-review-widget')) return

  const root = document.createElement('div')
  root.id = 'ux-review-widget'
  root.style.cssText = [
    'position: fixed',
    'right: 12px',
    'bottom: 12px',
    'width: 320px',
    'max-width: calc(100vw - 24px)',
    'z-index: 9999',
    'border: 1px solid var(--vscode-sideBar-border)',
    'border-radius: 8px',
    'background: var(--vscode-editorWidget-background)',
    'color: var(--vscode-editor-foreground)',
    'box-shadow: 0 8px 22px rgba(0,0,0,0.25)',
    'font-size: 12px',
  ].join(';')

  root.innerHTML = `
    <div style="display:flex; justify-content: space-between; align-items:center; gap: 8px; padding: 10px 10px 8px; border-bottom: 1px solid var(--vscode-sideBar-border);">
      <div style="display:flex; align-items:center; gap: 8px; font-weight: 700;">
        <span class="codicon codicon-comment-discussion" aria-hidden="true"></span>
        <span>UX Review Mode</span>
      </div>
      <button type="button" id="ux-review-close" class="monaco-button monaco-text-button" style="padding: 2px 8px; min-width: unset;">Close</button>
    </div>

    <div style="padding: 10px; display:flex; flex-direction: column; gap: 8px;">
      <div style="color: var(--vscode-statusBar-foreground);">
        Outside-in notes: write what you didn’t understand and why.
      </div>

      <label style="display:flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 10px; color: var(--vscode-statusBar-foreground); letter-spacing: 0.5px; text-transform: uppercase;">Category</span>
        <select id="ux-review-category" class="monaco-select" style="background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); padding: 4px 6px;">
          <option value="confusing-term">Confusing term</option>
          <option value="missing-next-step">Missing next step</option>
          <option value="data-doesnt-make-sense">Data doesn’t make sense</option>
          <option value="ui-overload">UI overload / busy</option>
          <option value="expected-different">Expected something else</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label style="display:flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 10px; color: var(--vscode-statusBar-foreground); letter-spacing: 0.5px; text-transform: uppercase;">Note</span>
        <textarea id="ux-review-note" rows="4" style="resize: vertical; min-height: 72px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); padding: 6px; border-radius: 4px;"></textarea>
      </label>

      <div style="display:flex; gap: 8px;">
        <button type="button" id="ux-review-save" class="monaco-button" style="padding: 4px 10px; min-width: unset;">Save note</button>
        <button type="button" id="ux-review-export" class="monaco-button monaco-text-button" style="padding: 4px 10px; min-width: unset;">Export JSON</button>
        <button type="button" id="ux-review-clear" class="monaco-button monaco-text-button" style="padding: 4px 10px; min-width: unset;">Clear</button>
      </div>

      <div id="ux-review-recent" style="padding-top: 6px; border-top: 1px solid var(--vscode-sideBar-border); color: var(--vscode-statusBar-foreground);"></div>
    </div>
  `

  const renderRecent = () => {
    const recent = root.querySelector('#ux-review-recent')
    if (!recent) return

    const notes = getNotes()
    const last = notes.slice(-3).reverse()

    if (!notes.length) {
      recent.textContent = 'No saved notes yet.'
      return
    }

    recent.innerHTML = `
      <div style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">Recent (${notes.length})</div>
      ${last.map(n => {
        const when = (n?.context?.ts || '').replace('T', ' ').replace('Z', '')
        const path = n?.context?.path || '/'
        const hour = typeof n?.context?.timeHour === 'number' ? n.context.timeHour : '?'
        const cat = n?.category || 'other'
        const text = String(n?.text || '').slice(0, 140)
        return `
          <div style="margin-bottom: 6px; padding: 6px; border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; background: var(--vscode-sideBar-background);">
            <div style="display:flex; justify-content: space-between; gap: 8px;">
              <div style="font-weight: 700;">${cat}</div>
              <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">t=${hour} • ${path}</div>
            </div>
            <div style="margin-top: 4px;">${text || '(empty)'}</div>
            <div style="margin-top: 4px; font-size: 11px; opacity: 0.9;">${when}</div>
          </div>
        `
      }).join('')}
    `
  }

  const syncVisibility = () => {
    root.style.display = isReviewModeEnabled() ? 'block' : 'none'
  }

  // Button wiring
  root.querySelector('#ux-review-close')?.addEventListener('click', () => {
    setReviewModeEnabled(false)
  })

  root.querySelector('#ux-review-save')?.addEventListener('click', () => {
    const category = root.querySelector('#ux-review-category')?.value || 'other'
    const text = String(root.querySelector('#ux-review-note')?.value || '').trim()
    const note = {
      id: `note:${Date.now()}`,
      category,
      text,
      context: snapshotContext(),
    }

    appendNote(note)

    const textarea = root.querySelector('#ux-review-note')
    if (textarea) textarea.value = ''

    renderRecent()

    window.dispatchEvent(new CustomEvent('hddl:status', { detail: { message: 'Saved UX note.', kind: 'info' } }))
  })

  root.querySelector('#ux-review-export')?.addEventListener('click', () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      notes: getNotes(),
    }
    downloadJson(`hddl-ux-review-${Date.now()}.json`, payload)
    window.dispatchEvent(new CustomEvent('hddl:status', { detail: { message: 'Exported UX notes JSON.', kind: 'info' } }))
  })

  root.querySelector('#ux-review-clear')?.addEventListener('click', () => {
    clearNotes()
    renderRecent()
    window.dispatchEvent(new CustomEvent('hddl:status', { detail: { message: 'Cleared UX notes.', kind: 'warning' } }))
  })

  // React to external toggles
  window.addEventListener('hddl:ux-review', () => {
    syncVisibility()
    renderRecent()
  })

  document.body.appendChild(root)
  syncVisibility()
  renderRecent()
}
