/**
 * Detail levels for responsive SVG rendering
 * Determines what level of detail to show based on available width
 */
export const DETAIL_LEVELS = {
  FULL: 'full',       // >1000px - Full names, all labels, complete info
  STANDARD: 'standard', // 600-1000px - First names, abbreviated labels
  COMPACT: 'compact',  // 400-600px - Initials, icons only
  MINIMAL: 'minimal'   // <400px - Hide text, minimal icons
}

/**
 * Get the appropriate detail level based on container width
 * @param {number} width - Container width in pixels
 * @returns {string} Detail level constant
 */
export function getDetailLevel(width) {
  if (width > 1000) return DETAIL_LEVELS.FULL
  if (width > 600) return DETAIL_LEVELS.STANDARD
  if (width > 400) return DETAIL_LEVELS.COMPACT
  return DETAIL_LEVELS.MINIMAL
}

/**
 * Get adaptive agent display name based on detail level
 * @param {string} name - Full agent name
 * @param {string} level - Detail level
 * @returns {string} Formatted name for display
 */
export function getAdaptiveAgentName(name, level) {
  if (!name) return ''
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return name
    case DETAIL_LEVELS.STANDARD:
      // First name or first part before space/hyphen
      return name.split(/[\s-]/)[0]
    case DETAIL_LEVELS.COMPACT:
      // Initials (first letters of each word)
      return name.split(/[\s-]/).map(w => w[0]).join('').toUpperCase()
    case DETAIL_LEVELS.MINIMAL:
      return '' // Hide on minimal
    default:
      return name
  }
}

/**
 * Get adaptive envelope label based on detail level
 * @param {string} label - Full envelope label (e.g., "DE-001")
 * @param {string} name - Envelope name
 * @param {string} level - Detail level
 * @returns {{ label: string, showName: boolean }}
 */
export function getAdaptiveEnvelopeLabel(label, name, level) {
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return { label, showName: true }
    case DETAIL_LEVELS.STANDARD:
      return { label, showName: false }
    case DETAIL_LEVELS.COMPACT:
      // Shorter label
      return { label: label.replace('DE-', ''), showName: false }
    case DETAIL_LEVELS.MINIMAL:
      return { label: '', showName: false }
    default:
      return { label, showName: true }
  }
}

/**
 * Get adaptive steward label based on detail level
 * @param {string} name - Steward role name
 * @param {string} version - Version string
 * @param {string} level - Detail level
 * @returns {{ name: string, showVersion: boolean }}
 */
export function getAdaptiveStewardLabel(name, version, level) {
  switch (level) {
    case DETAIL_LEVELS.FULL:
      return { name, showVersion: true }
    case DETAIL_LEVELS.STANDARD:
      // Abbreviated name
      return { name: name.replace(' Steward', '').replace('Steward', ''), showVersion: false }
    case DETAIL_LEVELS.COMPACT:
      // First word only
      return { name: name.split(/[\s]/)[0], showVersion: false }
    case DETAIL_LEVELS.MINIMAL:
      return { name: '', showVersion: false }
    default:
      return { name, showVersion: true }
  }
}

/**
 * Check if agent roles should be shown at this detail level
 * @param {string} level - Detail level
 * @returns {boolean}
 */
export function shouldShowAgentRole(level) {
  return level === DETAIL_LEVELS.FULL || level === DETAIL_LEVELS.STANDARD
}

/**
 * Get column header text based on detail level
 * @param {string} header - Full header text
 * @param {string} level - Detail level
 * @returns {string}
 */
export function getAdaptiveHeader(header, level) {
  if (level === DETAIL_LEVELS.MINIMAL) return ''
  if (level === DETAIL_LEVELS.COMPACT) {
    // Abbreviated headers
    const abbrevs = {
      'AGENT FLEETS': 'AGENTS',
      'DECISION ENVELOPES': 'ENVELOPES',
      'STEWARDS': 'STEWARDS'
    }
    return abbrevs[header] || header
  }
  return header
}

/**
 * Envelope density modes mapped to detail levels
 * - detailed: Full envelope with all visual elements
 * - normal: Standard envelope with basic visual elements  
 * - compact: Simplified envelope outline
 * - icon: Status circle only
 */
const ENVELOPE_DENSITY = {
  [DETAIL_LEVELS.FULL]: 'detailed',
  [DETAIL_LEVELS.STANDARD]: 'normal',
  [DETAIL_LEVELS.COMPACT]: 'compact',
  [DETAIL_LEVELS.MINIMAL]: 'icon'
}

/**
 * Envelope dimensions by density mode
 * baseWidth: envelope body width
 * baseHeight: envelope body height  
 * radius: radius for icon mode circle
 */
const ENVELOPE_SIZES = {
  detailed: { baseWidth: 140, baseHeight: 88, scale: 1.0 },
  normal: { baseWidth: 110, baseHeight: 68, scale: 0.75 },
  compact: { baseWidth: 80, baseHeight: 50, scale: 0.55 },
  icon: { baseWidth: 48, baseHeight: 48, scale: 0.35, radius: 22 }
}

/**
 * Get envelope dimensions based on detail level
 * @param {string} level - Detail level from DETAIL_LEVELS
 * @param {number} baseR - Base radius from layout calculations
 * @returns {object} - { width, height, scale, isIcon, radius }
 */
export function getEnvelopeDimensions(level, baseR) {
  const density = ENVELOPE_DENSITY[level] || 'normal'
  const sizes = ENVELOPE_SIZES[density]
  
  // Scale based on available space (baseR) but cap to size limits
  const scaledWidth = Math.max(sizes.baseWidth * 0.7, Math.min(sizes.baseWidth, baseR * 3.2))
  const scaledHeight = Math.max(sizes.baseHeight * 0.7, Math.min(sizes.baseHeight, baseR * 2.05))
  
  return {
    width: scaledWidth,
    height: scaledHeight,
    scale: sizes.scale,
    isIcon: density === 'icon',
    radius: sizes.radius || 18,
    density
  }
}

/**
 * Check if envelope element should render at this density
 * @param {string} element - Element name (glow, flap, fold, status, version)
 * @param {string} density - Density mode
 * @returns {boolean}
 */
export function shouldRenderEnvelopeElement(element, density) {
  const rules = {
    glow: ['detailed'],
    revisionBurst: ['detailed', 'normal'],
    flap: ['detailed', 'normal'],
    fold: ['detailed'],
    status: ['detailed', 'normal'],
    version: ['detailed', 'normal', 'compact'],
    constraintBadges: ['detailed']
  }
  return (rules[element] || []).includes(density)
}

/**
 * Agent density modes mapped to detail levels
 * - full: Full bot glyph with name, role, activity halo
 * - standard: Bot glyph with name (truncated), fleet grouping
 * - compact: Small dot with fleet count badge, no individual names
 * - minimal: Fleet indicator bar only (colored rectangle)
 */
const AGENT_DENSITY = {
  [DETAIL_LEVELS.FULL]: 'full',
  [DETAIL_LEVELS.STANDARD]: 'standard',
  [DETAIL_LEVELS.COMPACT]: 'compact',
  [DETAIL_LEVELS.MINIMAL]: 'minimal'
}

/**
 * Agent dimensions by density mode
 */
const AGENT_SIZES = {
  full: { botScale: 1.0, showName: true, showRole: true, showHalo: true },
  standard: { botScale: 0.9, showName: true, showRole: false, showHalo: true },
  compact: { botScale: 0.6, showName: false, showRole: false, showHalo: false, showCount: true },
  minimal: { botScale: 0, showName: false, showRole: false, showHalo: false, showFleetBar: true }
}

/**
 * Get agent display properties based on detail level
 * @param {string} level - Detail level from DETAIL_LEVELS
 * @returns {object} - Agent display configuration
 */
export function getAgentDensity(level) {
  const density = AGENT_DENSITY[level] || 'standard'
  return { density, ...AGENT_SIZES[density] }
}

/**
 * Check if individual agents should be rendered vs fleet summary
 * @param {string} level - Detail level
 * @returns {boolean}
 */
export function shouldRenderIndividualAgents(level) {
  return level === DETAIL_LEVELS.FULL || level === DETAIL_LEVELS.STANDARD
}
