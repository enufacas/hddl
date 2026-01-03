import { makeFlowCurve } from './bezier-math'
import { formatParticleLabel } from './particle-labels'
import {
  computeOrbitDurationTicks,
  computeOrbitTicksLeft,
  getParticleCurveSign,
  getParticleLife,
  getWaypointPulseMax
} from './particle-logic'
import { getResolutionTime } from './event-resolution'

function getEnvelopeId(event) {
  return event?.envelopeId || event?.envelope_id || null
}

function makeParticleId(event) {
  const e = event || {}
  return e.eventId || e.id || `${e.type}-${String(e.hour)}-${getEnvelopeId(e)}`
}

function findEnvelopeNode(nodes, envelopeId) {
  if (!Array.isArray(nodes) || !envelopeId) return null
  return nodes.find(n => n?.type === 'envelope' && n?.id === envelopeId) || null
}

function findStewardNode(nodes, actorRole) {
  if (!Array.isArray(nodes) || !actorRole) return null
  return nodes.find(n => n?.type === 'steward' && n?.name === actorRole) || null
}

function findAgentNodeById(nodes, agentId) {
  if (!Array.isArray(nodes) || !agentId) return null
  return nodes.find(n => n?.type === 'agent' && n?.id === agentId) || null
}

function findAgentNodeByName(nodes, actorName) {
  if (!Array.isArray(nodes) || !actorName) return null
  return nodes.find(n => n?.type === 'agent' && n?.name === actorName) || null
}

function pickDefaultSource(width, height, random) {
  const rnd = typeof random === 'function' ? random : Math.random
  const sourceX = rnd() < 0.5 ? -20 : width + 20
  const sourceY = rnd() * height
  return { sourceX, sourceY }
}

function computeParticleEndpoints({ event, envelopeNode, stewardNode, agentNode, nodes, width, height, mapHeight, random }) {
  const e = event || {}
  const rnd = typeof random === 'function' ? random : Math.random

  // Default: start off-screen
  let { sourceX, sourceY } = pickDefaultSource(width, height, rnd)
  let targetX = envelopeNode.x
  let targetY = envelopeNode.y

  if (e.type === 'signal') {
    // world -> envelope
    sourceX = envelopeNode.x + (rnd() * 40 - 20)
    sourceY = -24
    targetX = envelopeNode.x
    targetY = envelopeNode.y
  }

  if (e.type === 'decision') {
    // agent -> envelope (all decisions go to envelope first)
    if (agentNode) {
      sourceX = agentNode.x
      sourceY = agentNode.y
    }
    targetX = envelopeNode.x
    targetY = envelopeNode.y
  }

  if (e.type === 'boundary_interaction') {
    // agent -> envelope (agent requests escalation, envelope forwards to steward)
    const boundaryAgentNode = findAgentNodeByName(nodes, e.actorName)

    if (boundaryAgentNode) {
      sourceX = boundaryAgentNode.x
      sourceY = boundaryAgentNode.y
    } else {
      sourceX = envelopeNode.x
      sourceY = envelopeNode.y
    }

    targetX = envelopeNode.x
    targetY = envelopeNode.y
  }

  if (e.type === 'revision') {
    // steward -> envelope
    if (stewardNode) {
      sourceX = stewardNode.x
      sourceY = stewardNode.y
    }
    targetX = envelopeNode.x
    targetY = envelopeNode.y
  }

  if (e.type === 'retrieval') {
    // embedding store -> agent
    sourceX = width * 0.5 + (rnd() * 100 - 50)
    sourceY = mapHeight + 40

    const retrievalAgentNode = findAgentNodeByName(nodes, e.actorName)
    if (retrievalAgentNode) {
      targetX = retrievalAgentNode.x
      targetY = retrievalAgentNode.y
    } else {
      targetX = envelopeNode.x
      targetY = envelopeNode.y
    }
  }

  return { sourceX, sourceY, targetX, targetY }
}

export function nextParticles({
  particles,
  recentEvents,
  nodes,
  allEvents,
  hour,
  width,
  height,
  mapHeight,
  random
}) {
  const existing = Array.isArray(particles) ? particles.slice() : []
  const events = Array.isArray(recentEvents) ? recentEvents : []
  const scenarioEvents = Array.isArray(allEvents) ? allEvents : []

  const flowEvents = events.filter(e =>
    e && (e.type === 'signal' || e.type === 'boundary_interaction' || e.type === 'revision' || e.type === 'decision' || e.type === 'retrieval')
  )

  for (const e of flowEvents) {
    const pid = makeParticleId(e)
    if (existing.find(p => p?.id === pid)) continue

    const envelopeId = getEnvelopeId(e)
    const envelopeNode = findEnvelopeNode(nodes, envelopeId)
    if (!envelopeNode) continue

    const stewardNode = findStewardNode(nodes, e.actorRole)
    const agentNode = findAgentNodeById(nodes, e.agentId)

    const { sourceX, sourceY, targetX, targetY } = computeParticleEndpoints({
      event: e,
      envelopeNode,
      stewardNode,
      agentNode,
      nodes,
      width,
      height,
      mapHeight,
      random
    })

    const resolutionHour = e.type === 'boundary_interaction' && e.eventId
      ? getResolutionTime(scenarioEvents, e.eventId)
      : null

    const orbitDuration = computeOrbitDurationTicks(e, resolutionHour)

    existing.push({
      id: pid,
      type: e.type,
      severity: e.severity || 'info',
      status: e.status || (e.boundary_kind === 'escalated' ? 'blocked' : 'allowed'),
      text: formatParticleLabel(e),
      sourceX,
      sourceY,
      targetX,
      targetY,
      targetNodeId: (e.type === 'revision' && stewardNode)
        ? stewardNode.id
        : (e.type === 'boundary_interaction' && stewardNode)
          ? stewardNode.id
          : envelopeNode.id,
      x: sourceX,
      y: sourceY,
      t: 0,
      curve: (() => {
        const type = String(e.type || '').toLowerCase()
        const status = String(e.status || '').toLowerCase()
        return makeFlowCurve(sourceX, sourceY, targetX, targetY, getParticleCurveSign(type, status))
      })(),
      life: getParticleLife(e.type),
      labelOpacity: 0.85,

      orbit: false,
      orbitAfterTravel: false,
      orbitAngle: (typeof random === 'function' ? random : Math.random)() * Math.PI * 2,
      orbitTicksLeft: computeOrbitTicksLeft(e, orbitDuration),

      hasWaypoint: e.type === 'boundary_interaction',
      waypointPulseTicks: 0,
      waypointPulseMax: getWaypointPulseMax(e.type),
      finalTargetX: (e.type === 'boundary_interaction' && stewardNode)
        ? stewardNode.x
        : (e.type === 'decision' && (e.status === 'blocked' || e.status === 'denied') && stewardNode)
          ? stewardNode.x
          : null,
      finalTargetY: (e.type === 'boundary_interaction' && stewardNode)
        ? stewardNode.y
        : (e.type === 'decision' && (e.status === 'blocked' || e.status === 'denied') && stewardNode)
          ? stewardNode.y
          : null,
      shouldOrbitAfterWaypoint: e.type === 'boundary_interaction'
    })
  }

  return existing.filter(p => (p?.life ?? 0) > 0)
}
