export function stackYsInSlot(centerY, count, slotTop, slotBottom, options = {}) {
  const {
    topMargin = 0,
    usableHeight = Number.POSITIVE_INFINITY,
    agentH = 0,
    agentStep = 36,
    pad = 8,
    safeMinStep = 36,
  } = options

  const minY = Math.max(topMargin, slotTop + pad + (agentH / 2))
  const maxY = Math.min(topMargin + usableHeight, slotBottom - pad - (agentH / 2))
  const clampedCenter = Math.max(minY, Math.min(maxY, centerY))
  if (count <= 1) return [clampedCenter]

  const span = Math.max(0, maxY - minY)
  const ideal = span / Math.max(1, (count - 1))
  const step = Math.max(safeMinStep, Math.min(agentStep, ideal))

  const total = (count - 1) * step
  let start = clampedCenter - (total / 2)
  if (start < minY) start = minY
  if ((start + total) > maxY) start = Math.max(minY, maxY - total)

  const ys = []
  for (let i = 0; i < count; i++) ys.push(start + i * step)
  return ys
}

function groupBy(items, getKey) {
  const map = new Map()
  for (const item of items) {
    const key = getKey(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

// Smart text positioning to avoid overlaps.
// Returns shallow-cloned agent objects with `textYOffset` and `useLeftSide` fields.
export function adjustAgentTextPositions(agentNodes) {
  if (!agentNodes || !agentNodes.length) return []

  const textBoxes = new Map()
  const adjusted = []

  const byFleet = groupBy(agentNodes, (d) => d.fleetRole || 'default')

  byFleet.forEach((fleetAgents, fleetRole) => {
    const sorted = [...fleetAgents].sort((a, b) => a.targetY - b.targetY)

    sorted.forEach((agent) => {
      const baseTextY = -3
      const estimatedTextWidth = (agent.name?.length || 10) * 5.5
      const textHeight = 24

      let textYOffset = 0
      let useLeftSide = false

      let hasOverlap = true
      let attempts = 0

      while (hasOverlap && attempts < 4) {
        hasOverlap = false
        const candidateY = agent.targetY + baseTextY + textYOffset

        for (const [otherId, box] of textBoxes.entries()) {
          if (!otherId.startsWith(`${fleetRole}:`)) continue

          const yDist = Math.abs(candidateY - box.y)
          const xOverlap = Math.abs(agent.targetX - box.x) < estimatedTextWidth + 20

          if (yDist < textHeight && xOverlap) {
            hasOverlap = true
            if (attempts < 2) {
              textYOffset += 14
            } else {
              useLeftSide = true
            }
            break
          }
        }

        attempts++
      }

      textBoxes.set(`${fleetRole}:${agent.id}`, {
        x: agent.targetX,
        y: agent.targetY + baseTextY + textYOffset,
        width: estimatedTextWidth,
        height: textHeight
      })

      adjusted.push({
        ...agent,
        textYOffset,
        useLeftSide
      })
    })
  })

  return adjusted
}
