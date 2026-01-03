import { DETAIL_LEVELS } from './detail-levels'

export function truncateWithEllipsis(input, maxLen) {
  const text = input == null ? '' : String(input)
  const limit = Number.isFinite(maxLen) ? Math.max(0, maxLen) : 0

  if (!limit) return ''
  if (text.length <= limit) return text
  return text.substring(0, limit) + '...'
}

export function getNodeSubLabelText(node, detailLevel) {
  const d = node || {}

  // Skip sub-labels on COMPACT and MINIMAL
  if (detailLevel === DETAIL_LEVELS.COMPACT || detailLevel === DETAIL_LEVELS.MINIMAL) return ''

  if (d.type === 'agent') {
    if (!d.role) return ''
    const maxLen = detailLevel === DETAIL_LEVELS.STANDARD ? 16 : 20
    return truncateWithEllipsis(d.role, maxLen)
  }

  if (d.type === 'steward') return 'Steward'

  // Let envelopes carry their name clearly; other types remain compact.
  const maxLen = d.type === 'envelope'
    ? (detailLevel === DETAIL_LEVELS.STANDARD ? 18 : 24)
    : 18

  return truncateWithEllipsis(d.name, maxLen)
}
