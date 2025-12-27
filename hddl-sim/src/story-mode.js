const STORAGE_KEY = 'hddl:storyMode'
const EVENT_NAME = 'hddl:story-mode'

export function getStoryModeEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setStoryModeEnabled(enabled) {
  const next = Boolean(enabled)
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
  } catch {
    // ignore
  }

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled: next } }))
  return next
}

export function onStoryModeChange(handler) {
  const fn = (e) => {
    try {
      handler(Boolean(e?.detail?.enabled))
    } catch {
      // ignore
    }
  }
  window.addEventListener(EVENT_NAME, fn)
  return () => window.removeEventListener(EVENT_NAME, fn)
}
