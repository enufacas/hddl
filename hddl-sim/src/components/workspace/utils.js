/**
 * Workspace utility functions
 * Pure functions with no external dependencies or side effects
 */

const STORAGE_KEY = 'hddl:layout'

/**
 * Escape HTML special characters to prevent XSS
 * @param {*} value - Value to escape (will be converted to string)
 * @returns {string} Escaped string safe for HTML insertion
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Escape HTML and additionally escape backticks for attribute safety
 * @param {*} value - Value to escape
 * @returns {string} Escaped string safe for HTML attributes
 */
export function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;')
}

/**
 * Convert internal envelope ID to display format
 * @param {string} envelopeId - Internal ID (e.g., "ENV-001")
 * @returns {string} Display ID (e.g., "DE-001")
 */
export function displayEnvelopeId(envelopeId) {
  return String(envelopeId || '').replace(/^ENV-/, 'DE-')
}

/**
 * Check if event type should be included in narrative generation
 * @param {string} type - Event type
 * @returns {boolean} True if event is narratable
 */
export function isNarratableEventType(type) {
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

/**
 * Build unique key for narrative event
 * @param {object} e - Event object
 * @param {number} index - Event index
 * @returns {string} Unique key for event
 */
export function buildNarrativeEventKey(e, index) {
  const t = String(e?.type || 'event')
  const h = typeof e?.hour === 'number' ? String(e.hour).replace('.', '_') : 'na'
  const env = String(e?.envelopeId || e?.envelope_id || e?.sessionId || 'na')
  return `${t}:${h}:${env}:${index}`
}

/**
 * Determine primary object type for narrative event
 * @param {object} e - Event object
 * @returns {string} Primary object type
 */
export function narrativePrimaryObjectType(e) {
  const type = String(e?.type || '')
  if (type === 'decision') return 'decision'
  if (type === 'revision') return 'revision'
  if (type === 'boundary_interaction' || type === 'escalation') return 'exception'
  if (type === 'dsg_session' || type === 'dsg_message') return 'dsg'
  if (type === 'signal') return 'signal'
  if (type === 'annotation') return 'memory'
  return 'envelope'
}

/**
 * Load layout state from localStorage
 * @returns {object} Layout state object (empty object if not found or invalid)
 */
export function loadLayoutState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Save layout state to localStorage
 * @param {object} next - Layout state to save
 */
export function saveLayoutState(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore - localStorage may be unavailable
  }
}

/**
 * Get default layout state
 * @returns {object} Default layout configuration
 */
export function getDefaultLayoutState() {
  return {
    auxCollapsed: false,
    sidebarCollapsed: false,
    bottomCollapsed: false
  }
}
