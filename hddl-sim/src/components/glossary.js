let glossaryPromise = null

function stripMarkdown(text) {
  return String(text || '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .trim()
}

function summarize(text, maxLen = 240) {
  const cleaned = stripMarkdown(text)
  if (cleaned.length <= maxLen) return cleaned
  return `${cleaned.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

function parseGlossaryMarkdown(md) {
  const lines = String(md || '').split(/\r?\n/)
  const map = new Map()

  let currentTerm = null
  let currentLines = []

  const flush = () => {
    if (!currentTerm) return

    const raw = currentLines
      .map(l => l.trim())
      .filter(Boolean)
      .filter(l => !/^See:\s*/i.test(l))
      .join(' ')
      .trim()

    if (raw) map.set(currentTerm, raw)
  }

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) {
      flush()
      currentTerm = m[1]
      currentLines = []
      continue
    }
    if (currentTerm) currentLines.push(line)
  }

  flush()
  return map
}

export async function loadGlossary() {
  if (!glossaryPromise) {
    glossaryPromise = fetch('/docs/Glossary.md')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load glossary: ${r.status}`)
        return r.text()
      })
      .then(md => parseGlossaryMarkdown(md))
      .catch(() => new Map())
  }
  return glossaryPromise
}

export async function initGlossaryInline(container, {
  panelSelector = '#glossary-inline',
  openDocs = null,
} = {}) {
  const panel = container.querySelector(panelSelector)
  if (!panel) return () => {}

  const termEls = Array.from(container.querySelectorAll('[data-glossary-term]'))
  if (!termEls.length) return () => {}

  const glossary = await loadGlossary()

  const setPanel = (term, body) => {
    panel.innerHTML = `
      <div style="display:flex; justify-content: space-between; gap: 12px; align-items: start;">
        <div style="min-width:0;">
          <div style="font-weight: 700;">${escapeHtml(term)}</div>
          <div style="font-size: 13px; color: var(--vscode-statusBar-foreground); margin-top: 4px;">${escapeHtml(body)}</div>
        </div>
        <div style="display:flex; gap: 8px; align-items: center;">
          <button class="monaco-button monaco-text-button" type="button" data-action="open-docs" style="padding: 4px 8px; min-width: unset;">Open Glossary</button>
          <button class="monaco-button monaco-text-button" type="button" data-action="close" style="padding: 4px 8px; min-width: unset;">Close</button>
        </div>
      </div>
    `.trim()

    const closeBtn = panel.querySelector('[data-action="close"]')
    if (closeBtn) closeBtn.addEventListener('click', () => {
      panel.style.display = 'none'
    })

    const openBtn = panel.querySelector('[data-action="open-docs"]')
    if (openBtn) openBtn.addEventListener('click', () => {
      if (typeof openDocs === 'function') openDocs()
    })

    panel.style.display = 'block'
  }

  const listeners = []

  termEls.forEach(el => {
    const term = el.getAttribute('data-glossary-term')
    if (!term) return

    const raw = glossary.get(term) || ''
    const shortDef = raw ? summarize(raw) : 'Definition not found in Glossary.'
    el.setAttribute('title', shortDef)

    const onClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      setPanel(term, shortDef)
    }

    el.addEventListener('click', onClick)
    listeners.push(() => el.removeEventListener('click', onClick))
  })

  const onDoc = (e) => {
    const action = e?.target?.getAttribute?.('data-action')
    if (action === 'open-docs' && typeof openDocs === 'function') openDocs()
  }

  panel.addEventListener('click', onDoc)
  listeners.push(() => panel.removeEventListener('click', onDoc))

  return () => listeners.forEach(fn => fn())
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
