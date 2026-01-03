import { describe, expect, test } from 'vitest'
import { adjustAgentTextPositions, stackYsInSlot } from './agent-layout'

describe('map/agent-layout', () => {
  test('stackYsInSlot clamps to slot bounds', () => {
    const ys = stackYsInSlot(0, 3, 100, 200, {
      topMargin: 38,
      usableHeight: 300,
      agentH: 30,
      agentStep: 30,
    })

    expect(ys).toHaveLength(3)
    for (const y of ys) {
      expect(Number.isFinite(y)).toBe(true)
      expect(y).toBeGreaterThanOrEqual(100)
      expect(y).toBeLessThanOrEqual(200)
    }
  })

  test('adjustAgentTextPositions offsets overlapping labels within same fleet', () => {
    const agents = [
      { id: 'a1', name: 'Alpha', fleetRole: 'FleetA', targetX: 100, targetY: 100 },
      { id: 'a2', name: 'Alpha', fleetRole: 'FleetA', targetX: 100, targetY: 100 },
    ]

    const adjusted = adjustAgentTextPositions(agents)
    expect(adjusted).toHaveLength(2)

    const [first, second] = adjusted
    expect(first.textYOffset).toBe(0)
    expect(second.textYOffset).toBeGreaterThan(0)
  })
})
