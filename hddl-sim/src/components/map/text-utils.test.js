import { describe, it, expect } from 'vitest'
import { DETAIL_LEVELS } from './detail-levels'
import { truncateWithEllipsis, getNodeSubLabelText } from './text-utils'

describe('text-utils', () => {
  it('truncateWithEllipsis returns empty for zero/negative maxLen', () => {
    expect(truncateWithEllipsis('abc', 0)).toBe('')
    expect(truncateWithEllipsis('abc', -1)).toBe('')
  })

  it('truncateWithEllipsis leaves short strings unchanged', () => {
    expect(truncateWithEllipsis('abc', 3)).toBe('abc')
    expect(truncateWithEllipsis('ab', 3)).toBe('ab')
  })

  it('truncateWithEllipsis appends ellipsis when truncated', () => {
    expect(truncateWithEllipsis('abcdef', 3)).toBe('abc...')
  })

  it('getNodeSubLabelText hides for compact/minimal', () => {
    expect(getNodeSubLabelText({ type: 'agent', role: 'Engineer' }, DETAIL_LEVELS.COMPACT)).toBe('')
    expect(getNodeSubLabelText({ type: 'steward' }, DETAIL_LEVELS.MINIMAL)).toBe('')
  })

  it('getNodeSubLabelText formats agent role by level', () => {
    expect(getNodeSubLabelText({ type: 'agent', role: 'A very long role name here' }, DETAIL_LEVELS.STANDARD)).toBe(
      'A very long role...'
    )
    expect(getNodeSubLabelText({ type: 'agent', role: 'A very long role name here' }, DETAIL_LEVELS.FULL)).toBe(
      'A very long role nam...'
    )
  })

  it('getNodeSubLabelText handles steward and envelope/name', () => {
    expect(getNodeSubLabelText({ type: 'steward' }, DETAIL_LEVELS.FULL)).toBe('Steward')
    expect(getNodeSubLabelText({ type: 'envelope', name: 'A very long envelope name' }, DETAIL_LEVELS.STANDARD)).toBe(
      'A very long envelo...'
    )
  })
})
