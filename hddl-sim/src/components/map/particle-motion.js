import { bezierPoint, makeFlowCurve } from './bezier-math'
import { getParticleCurveSign } from './particle-logic'

export function stepParticle(particle, nodes, options = {}) {
  const p = particle
  if (!p) return

  const nodeAttachThreshold = Number.isFinite(options.nodeAttachThreshold)
    ? options.nodeAttachThreshold
    : 80
  const orbitAngleStep = Number.isFinite(options.orbitAngleStep) ? options.orbitAngleStep : 0.11
  const travelSpeed = Number.isFinite(options.travelSpeed) ? options.travelSpeed : 0.011
  const curveUpdateThreshold = Number.isFinite(options.curveUpdateThreshold)
    ? options.curveUpdateThreshold
    : 2

  // Keep particles tracking their intended endpoints as nodes move.
  if (Array.isArray(nodes)) {
    const targetMatch = nodes.find(n => Math.abs(n.x - p.targetX) < nodeAttachThreshold && Math.abs(n.y - p.targetY) < nodeAttachThreshold)
    if (targetMatch) {
      p.targetX = targetMatch.x
      p.targetY = targetMatch.y
    }
  }

  p.labelOpacity = 0.85

  if (p.orbit && p.orbitTicksLeft > 0) {
    const center = Array.isArray(nodes) ? (nodes.find(n => n.id === p.targetNodeId) || null) : null
    const r = center?.r ? Math.max(10, Math.min(22, center.r * 0.45)) : 16
    const cx = center?.x ?? p.targetX
    const cy = center?.y ?? p.targetY

    const baseAngle = Number.isFinite(p.orbitAngle) ? p.orbitAngle : 0
    p.orbitAngle = baseAngle + orbitAngleStep

    p.x = cx + Math.cos(p.orbitAngle) * r
    p.y = cy + Math.sin(p.orbitAngle) * r
    p.orbitTicksLeft -= 1
    // Much slower decay during orbit - needs to survive 150 ticks max
    p.life -= 0.003
    return
  }

  // Move along the curve from source->target.
  p.t = Math.min(1, (p.t ?? 0) + travelSpeed)

  if (p.curve) {
    // Re-bake curve endpoints so the curve stays attached as nodes move.
    // OPTIMIZATION #2: Only recalculate bezier curve when endpoints change significantly
    const threshold = curveUpdateThreshold // pixels
    const sign = getParticleCurveSign(p.type, p.status)

    const needsUpdate = !p.curveCache ||
      Math.abs(p.sourceX - p.curveCache.sourceX) > threshold ||
      Math.abs(p.sourceY - p.curveCache.sourceY) > threshold ||
      Math.abs(p.targetX - p.curveCache.targetX) > threshold ||
      Math.abs(p.targetY - p.curveCache.targetY) > threshold

    if (needsUpdate) {
      p.curveCache = {
        curve: makeFlowCurve(p.sourceX, p.sourceY, p.targetX, p.targetY, sign),
        sourceX: p.sourceX,
        sourceY: p.sourceY,
        targetX: p.targetX,
        targetY: p.targetY
      }
      p.curve = p.curveCache.curve
    } else {
      p.curve = p.curveCache.curve
    }

    const pt = bezierPoint(p.t, p.curve.p0, p.curve.p1, p.curve.p2, p.curve.p3)
    p.x = pt.x
    p.y = pt.y
  } else {
    // Fallback to linear if curve is missing.
    p.x = p.sourceX + (p.targetX - p.sourceX) * p.t
    p.y = p.sourceY + (p.targetY - p.sourceY) * p.t
  }

  if (p.t >= 1) {
    // Handle waypoint pulse for denied/blocked decisions and boundary_interactions at envelope
    if (p.hasWaypoint && p.waypointPulseTicks < p.waypointPulseMax) {
      // Pulse at envelope to show rejection or boundary check
      p.waypointPulseTicks += 1
      const pulsePhase = p.waypointPulseTicks / p.waypointPulseMax
      // Pulse effect: scale particle up/down
      p.pulseScale = 1.0 + Math.sin(pulsePhase * Math.PI * 3) * 0.5 // 3 pulses
      p.life -= 0.005

      // After pulse completes, redirect to steward
      if (p.waypointPulseTicks >= p.waypointPulseMax && p.finalTargetX && p.finalTargetY) {
        p.hasWaypoint = false
        p.sourceX = p.x
        p.sourceY = p.y
        p.targetX = p.finalTargetX
        p.targetY = p.finalTargetY
        p.t = 0
        // Invalidate curve cache when redirecting
        p.curveCache = null
        p.curve = makeFlowCurve(p.sourceX, p.sourceY, p.targetX, p.targetY, -1)
        p.pulseScale = 1.0

        // If this is a boundary_interaction, prepare to orbit at steward
        if (p.shouldOrbitAfterWaypoint && p.orbitTicksLeft > 0) {
          p.orbitAfterTravel = true
        }
      }
      return
    }

    if (p.orbitAfterTravel && p.orbitTicksLeft > 0) {
      // Boundary interactions orbit at steward after arrival
      p.orbit = true
      p.life -= 0.002
    } else if (p.type === 'decision' && p.status !== 'blocked' && p.status !== 'denied') {
      // Allowed decisions orbit at envelope
      p.orbit = true
      p.orbitTicksLeft = 18
      p.life -= 0.01
    } else {
      p.life -= 0.025
    }
  }
}
