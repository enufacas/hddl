import { describe, expect, test, vi } from 'vitest'
import { createDragHandlers } from './simulation-handlers'

describe('map/simulation-handlers', () => {
  test('drag handlers update fx/fy and nudge simulation alpha', () => {
    const simulation = {
      alphaTarget: vi.fn(() => simulation),
      restart: vi.fn(() => simulation),
    }

    const { dragstarted, dragged, dragended } = createDragHandlers({ simulation })

    const node = { x: 10, y: 20, targetX: 100, targetY: 200 }

    dragstarted({ active: false }, node)
    expect(simulation.alphaTarget).toHaveBeenCalledWith(0.3)
    expect(simulation.restart).toHaveBeenCalled()
    expect(node.fx).toBe(10)
    expect(node.fy).toBe(20)

    dragged({ x: 11, y: 22 }, node)
    expect(node.fx).toBe(11)
    expect(node.fy).toBe(22)

    dragended({ active: false }, node)
    expect(simulation.alphaTarget).toHaveBeenLastCalledWith(0)
    expect(node.fx).toBe(100)
    expect(node.fy).toBe(200)
  })

  test('drag handlers do not change alphaTarget when event is active', () => {
    const simulation = {
      alphaTarget: vi.fn(() => simulation),
      restart: vi.fn(() => simulation),
    }

    const { dragstarted, dragended } = createDragHandlers({ simulation })

    const node = { x: 1, y: 2, targetX: 3, targetY: 4 }

    dragstarted({ active: true }, node)
    dragended({ active: true }, node)

    expect(simulation.alphaTarget).not.toHaveBeenCalled()
    expect(simulation.restart).not.toHaveBeenCalled()

    // Still snaps back on end
    expect(node.fx).toBe(3)
    expect(node.fy).toBe(4)
  })
})
