/**
 * Bezier curve mathematics for particle flow animation
 * Pure functions with no external dependencies
 */

/**
 * Calculate a point on a cubic Bezier curve
 * @param {number} t - Parameter from 0 to 1
 * @param {object} p0 - Start point {x, y}
 * @param {object} p1 - First control point {x, y}
 * @param {object} p2 - Second control point {x, y}
 * @param {object} p3 - End point {x, y}
 * @returns {object} Point on curve {x, y}
 */
export function bezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  return {
    x: (uuu * p0.x) + (3 * uu * t * p1.x) + (3 * u * tt * p2.x) + (ttt * p3.x),
    y: (uuu * p0.y) + (3 * uu * t * p1.y) + (3 * u * tt * p2.y) + (ttt * p3.y),
  }
}

/**
 * Generate control points for a flow curve between two points
 * Creates a smooth curved path with perpendicular offset
 * @param {number} sourceX - Start X coordinate
 * @param {number} sourceY - Start Y coordinate
 * @param {number} targetX - End X coordinate
 * @param {number} targetY - End Y coordinate
 * @param {number} sign - Curve direction multiplier (-1 or 1), default -1
 * @returns {object} Control points {p0, p1, p2, p3} for cubic Bezier
 */
export function makeFlowCurve(sourceX, sourceY, targetX, targetY, sign = -1) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const nx = -dy
  const ny = dx
  const norm = Math.sqrt(nx * nx + ny * ny) || 1

  // Offset magnitude: proportional to lane width, capped.
  const base = Math.min(140, Math.max(48, Math.abs(dx) * 0.36))
  const ox = (nx / norm) * base * sign
  const oy = (ny / norm) * base * sign

  const p0 = { x: sourceX, y: sourceY }
  const p3 = { x: targetX, y: targetY }
  const p1 = { x: sourceX + dx * 0.33 + ox, y: sourceY + dy * 0.33 + oy }
  const p2 = { x: sourceX + dx * 0.66 + ox, y: sourceY + dy * 0.66 + oy }
  return { p0, p1, p2, p3 }
}
