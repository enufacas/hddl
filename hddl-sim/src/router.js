import { renderHome } from './pages/home'
import { renderAuthority } from './pages/authority'
import { renderCapabilityMatrix } from './pages/capability-matrix'
import { renderDecisionTelemetry } from './pages/decision-telemetry'
import { renderDSGEvent } from './pages/dsg-event'
import { renderDocs } from './pages/docs'
import { render as renderTimeline } from './pages/timeline'
import { render as renderStewardship } from './pages/stewardship'
import { render as renderInteractive } from './pages/interactive'
import { updateActiveNav } from './components/workspace'

const routes = {
  '/': renderHome,
  '/authority': renderAuthority,
  '/steward-fleets': renderCapabilityMatrix,
  '/decision-telemetry': renderDecisionTelemetry,
  '/dsg-event': renderDSGEvent,
  '/docs': renderDocs,
  // Timeline is controlled by the global scrubber; keep route for deep-links but redirect to home.
  '/timeline': renderHome,
  '/stewardship': renderStewardship,
  '/interactive': renderInteractive,
}

export function initRouter() {
  // Handle initial load
  navigate(normalizePath(window.location.pathname))

  // Handle back/forward
  window.addEventListener('popstate', () => {
    navigate(normalizePath(window.location.pathname))
  })

  // Handle link clicks
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-link]')) {
      e.preventDefault()
      navigateTo(e.target.getAttribute('href'))
    }
  })
}

export function navigateTo(path) {
  const normalized = normalizePath(path)
  history.pushState(null, null, normalized)
  navigate(normalized)
}

function navigate(path) {
  const normalized = normalizePath(path)
  const route = routes[normalized] || routes['/']
  const editorArea = document.querySelector('#editor-area')
  
  if (!editorArea) {
    console.error('Editor area not found!')
    return
  }
  
  editorArea.innerHTML = ''
  route(editorArea)
  
  // Update active state in navigation
  updateActiveNav(normalized)

  // Notify global UI (timeline header, etc.)
  window.dispatchEvent(new CustomEvent('hddl:navigate', { detail: { path: normalized } }))
}

function normalizePath(pathname) {
  if (!pathname) return '/'
  const noQuery = String(pathname).split('?')[0].split('#')[0]
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1)
  // Back-compat: old route name.
  if (noQuery === '/capability-matrix') return '/steward-fleets'
  return noQuery
}
