export function getParticleCurveSign(type, status) {
  const t = String(type || '').toLowerCase()
  if (t === 'revision') return +1
  return -1
}

export function computeOrbitDurationTicks(event, resolutionHour, options = {}) {
  const e = event || {}
  const type = String(e.type || '').toLowerCase()
  if (type !== 'boundary_interaction') return 0

  const ticksPerHour = Number.isFinite(options.ticksPerHour) ? options.ticksPerHour : 25
  const minTicks = Number.isFinite(options.minTicks) ? options.minTicks : 25
  const maxTicks = Number.isFinite(options.maxTicks) ? options.maxTicks : 150
  const defaultTicks = Number.isFinite(options.defaultTicks) ? options.defaultTicks : 30

  if (typeof resolutionHour !== 'number' || typeof e.hour !== 'number') return defaultTicks

  const hoursDiff = resolutionHour - e.hour
  return Math.max(minTicks, Math.min(maxTicks, hoursDiff * ticksPerHour))
}

export function getParticleLife(type) {
  const t = String(type || '').toLowerCase()
  return t === 'boundary_interaction' ? 1.5 : 1.0
}

export function computeOrbitTicksLeft(event, orbitDurationTicks) {
  const e = event || {}
  const type = String(e.type || '').toLowerCase()
  const status = String(e.status || '').toLowerCase()

  if (type === 'boundary_interaction') return orbitDurationTicks

  if (type === 'decision' && status !== 'blocked' && status !== 'denied') return 18

  return 0
}

export function getWaypointPulseMax(type) {
  const t = String(type || '').toLowerCase()
  return t === 'boundary_interaction' ? 8 : 12
}
