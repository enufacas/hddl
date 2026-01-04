/**
 * Shared steward color palette for consistent styling across the app.
 * Each steward role maps to a distinct, accessible color.
 */

// Extended palette with more distinct colors
export const STEWARD_COLORS = {
  'Customer Steward': 'var(--steward-customer, #3794ff)',
  'HR Steward': 'var(--steward-hr, #89d185)',
  'Sales Steward': 'var(--steward-sales, #cca700)',
  'Data Steward': 'var(--steward-data, #b180d7)',
  'Domain Engineer': 'var(--steward-engineer, #f14c4c)',
  'Engineering Steward': 'var(--steward-engineering, #4ec9b0)',
  'Resiliency Steward': 'var(--steward-resiliency, #ce9178)',
  'Business Domain Steward': 'var(--steward-business, #dcdcaa)',
}

// Extended palette array for indexed access (24 distinct colors)
// Ensures variety when scenarios have custom steward roles
export const STEWARD_PALETTE = [
  // Core 8 (match STEWARD_COLORS)
  '#3794ff', // Customer - Blue
  '#89d185', // HR - Green  
  '#cca700', // Sales - Yellow/Gold
  '#b180d7', // Data - Purple
  '#f14c4c', // Engineer - Red
  '#4ec9b0', // Engineering - Teal
  '#ce9178', // Resiliency - Orange/Brown
  '#dcdcaa', // Business - Tan
  
  // Extended 16 (for custom roles)
  '#ff6b9d', // Pink
  '#76b9ed', // Sky Blue
  '#a8d08d', // Sage Green
  '#f4a261', // Coral Orange
  '#9d84b7', // Dusty Purple
  '#6eb5d0', // Ocean Blue
  '#e9c46a', // Warm Gold
  '#d4a373', // Caramel
  '#8ab4f8', // Periwinkle
  '#81c995', // Sea Green
  '#ffb347', // Pastel Orange
  '#b392ac', // Mauve
  '#7eb8da', // Steel Blue
  '#c9a0dc', // Lilac
  '#a8c256', // Lime
  '#ff9a8b', // Salmon Pink
]

// Distinct envelope color palette (different from steward colors)
export const ENVELOPE_PALETTE = [
  '#3794ff', // Blue
  '#89d185', // Green
  '#b180d7', // Purple
  '#f14c4c', // Red
  '#4ec9b0', // Teal
  '#cca700', // Gold
  '#ce9178', // Orange
  '#dcdcaa', // Tan
  '#ff6b9d', // Pink
  '#76b9ed', // Sky Blue
]

/**
 * Get color for a steward role
 * Uses named colors for standard roles, deterministic hash-based colors for custom roles.
 * @param {string} role - The steward role name
 * @returns {string} CSS color value
 */
export function getStewardColor(role) {
  // Use explicit color for known roles
  if (STEWARD_COLORS[role]) {
    return STEWARD_COLORS[role]
  }
  
  // For custom roles, use extended palette with better distribution
  const hash = hashRole(role)
  return STEWARD_PALETTE[hash % STEWARD_PALETTE.length]
}

/**
 * Get distinct color for an envelope based on its ID
 * Envelopes get unique colors regardless of their owner steward
 * @param {string} envelopeId - The envelope ID (e.g., "DE-001", "ENV-001")
 * @param {number} [index] - Optional index for predictable coloring
 * @returns {string} CSS color value
 */
export function getEnvelopeColor(envelopeId, index) {
  if (typeof index === 'number') {
    return ENVELOPE_PALETTE[index % ENVELOPE_PALETTE.length]
  }
  return ENVELOPE_PALETTE[hashRole(envelopeId) % ENVELOPE_PALETTE.length]
}

/**
 * Improved hash function for consistent color assignment to custom roles.
 * Uses a better distribution algorithm to minimize collisions.
 * Same input always produces same output (deterministic).
 * 
 * @param {string} role - The role name to hash
 * @returns {number} Non-negative integer hash
 */
function hashRole(role) {
  const str = String(role || '')
  let hash = 5381 // DJB2 hash algorithm - better distribution than simple hash
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) + hash) + char // hash * 33 + char
  }
  
  // Ensure positive and distribute across palette
  return Math.abs(hash >>> 0) // unsigned right shift for positive int
}

/**
 * Convert integer version to semver format
 * Version 1 -> 1.0.0, Version 2 -> 1.1.0 (minor bump), etc.
 * @param {number} version - Integer version number
 * @param {number} [prevVersion] - Previous version for determining bump type
 * @returns {string} Semver string
 */
export function toSemver(version, prevVersion) {
  const v = Number(version) || 1
  // Major version stays at 1 unless explicitly bumped
  // Minor increments with each revision
  // Patch stays at 0 for envelope-level versioning
  const major = 1
  const minor = Math.max(0, v - 1)
  const patch = 0
  return `${major}.${minor}.${patch}`
}

/**
 * Get version badge style based on version change
 * @param {number} currentVersion 
 * @param {number} [previousVersion]
 * @returns {{ color: string, label: string, isNew: boolean }}
 */
export function getVersionBadgeInfo(currentVersion, previousVersion) {
  const current = Number(currentVersion) || 1
  const prev = Number(previousVersion) || 1
  const semver = toSemver(current)
  
  if (current > prev) {
    return {
      semver,
      color: 'var(--status-warning)',
      label: `↑ v${semver}`,
      isNew: true,
      bump: current - prev > 1 ? 'major' : 'minor'
    }
  }
  
  return {
    semver,
    color: 'var(--vscode-badge-background)',
    label: `v${semver}`,
    isNew: false,
    bump: null
  }
}

/**
 * Get all steward colors as CSS custom properties string
 * Inject this into the document to enable var(--steward-*) usage
 */
export function getStewardColorStyles() {
  return `
    :root {
      --steward-customer: #3794ff;
      --steward-hr: #89d185;
      --steward-sales: #cca700;
      --steward-data: #b180d7;
      --steward-engineer: #f14c4c;
      --steward-engineering: #4ec9b0;
      --steward-resiliency: #ce9178;
      --steward-business: #dcdcaa;
    }
  `
}

/**
 * Event type colors - intentionally distinct from steward colors.
 * Used for particles, timeline markers, and narrative dots.
 * 
 * Design: Uses white/gray/saturated accents to differentiate from
 * the steward palette which uses muted, accessible colors.
 */
export const EVENT_COLORS = {
  signal: '#7eb8da',           // Light steel blue - info events
  revision: '#98d4a0',         // Mint green - positive changes
  decision: '#a8a8a8',         // Neutral gray - standard decisions
  decision_blocked: '#e8846c', // Salmon - blocked/warning decisions
  boundary_interaction: '#f0b866', // Amber - boundary events
  envelope_promoted: '#c4a7e7',    // Lavender - promotions
  dsg_session: '#f0b866',      // Amber - DSG events (same as boundary)
  dsg_message: '#f0b866',      // Amber - DSG messages
  embedding: '#d4a8d4',        // Lavender purple - memory embeddings
  retrieval: '#b8b8d8',        // Cool gray-purple - memory queries
}

/**
 * Get color for an event type
 * @param {string} type - Event type
 * @param {string} [severity] - Optional severity (warning, error)
 * @param {string} [status] - Optional status (blocked, denied)
 * @returns {string} CSS color value
 */
export function getEventColor(type, severity, status) {
  if (type === 'decision') {
    if (status === 'blocked' || status === 'denied' || severity === 'warning' || severity === 'error') {
      return EVENT_COLORS.decision_blocked
    }
    return EVENT_COLORS.decision
  }
  return EVENT_COLORS[type] || EVENT_COLORS.signal
}

