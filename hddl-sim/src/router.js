import { renderHome } from './pages/home'
import { renderAuthority } from './pages/authority'
import { renderCapabilityMatrix } from './pages/capability-matrix'
import { renderDecisionTelemetry } from './pages/decision-telemetry'
import { renderDSGEvent } from './pages/dsg-event'
import { renderDocs } from './pages/docs'
import { render as renderTimeline } from './pages/timeline'
import { render as renderStewardship } from './pages/stewardship'
import { render as renderInteractive } from './pages/interactive'
import { render as renderSpecification } from './pages/specification'
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
  '/specification': renderSpecification,
}

// Create peek handles for collapsed panels
function ensurePeekHandles() {
  const editorArea = document.querySelector('#editor-area')
  if (!editorArea) return
  
  // Check if peek handles already exist
  if (editorArea.querySelector('.sidebar-peek') && editorArea.querySelector('.aux-peek')) {
    return
  }
  
  // Create sidebar peek handle
  const sidebarPeek = document.createElement('div')
  sidebarPeek.className = 'sidebar-peek'
  sidebarPeek.setAttribute('role', 'button')
  sidebarPeek.setAttribute('tabindex', '0')
  sidebarPeek.setAttribute('aria-label', 'Open HDDL Simulation panel')
  sidebarPeek.innerHTML = `
    <span class="codicon codicon-chevron-right" aria-hidden="true"></span>
    <span class="sidebar-peek__label">HDDL SIMULATION</span>
  `.trim()
  sidebarPeek.addEventListener('click', () => {
    document.body.classList.remove('sidebar-hidden')
    const state = JSON.parse(localStorage.getItem('hddl:layout') || '{}')
    localStorage.setItem('hddl:layout', JSON.stringify({ ...state, sidebarCollapsed: false }))
  })
  sidebarPeek.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      sidebarPeek.click()
    }
  })
  
  // Create aux peek handle
  const auxPeek = document.createElement('div')
  auxPeek.className = 'aux-peek'
  auxPeek.setAttribute('role', 'button')
  auxPeek.setAttribute('tabindex', '0')
  auxPeek.setAttribute('aria-label', 'Open AI Narrative panel')
  auxPeek.innerHTML = `
    <span class="codicon codicon-chevron-left" aria-hidden="true"></span>
    <span class="aux-peek__label">AI NARRATIVE</span>
  `.trim()
  auxPeek.addEventListener('click', () => {
    document.body.classList.remove('aux-hidden')
    const state = JSON.parse(localStorage.getItem('hddl:layout') || '{}')
    localStorage.setItem('hddl:layout', JSON.stringify({ ...state, auxCollapsed: false }))
  })
  auxPeek.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      auxPeek.click()
    }
  })
  
  // Append to editor area (will be preserved during navigations)
  editorArea.appendChild(sidebarPeek)
  editorArea.appendChild(auxPeek)
}

export function initRouter() {
  // Handle initial load
  navigate(normalizePath(window.location.pathname))
  
  // Create peek handles after initial navigation
  ensurePeekHandles()

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
  // Extract hash before normalization
  const hashIndex = path.indexOf('#')
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const pathWithoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  
  const normalized = normalizePath(pathWithoutHash)
  // Use base-aware path for pushState
  const base = import.meta.env.BASE_URL
  const fullPath = base !== '/' ? base.slice(0, -1) + normalized + hash : normalized + hash
  history.pushState(null, null, fullPath)
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
  
  // Preserve peek handles before clearing
  const sidebarPeek = editorArea.querySelector('.sidebar-peek')
  const auxPeek = editorArea.querySelector('.aux-peek')
  
  editorArea.innerHTML = ''
  
  // Restore peek handles
  if (sidebarPeek) editorArea.appendChild(sidebarPeek)
  if (auxPeek) editorArea.appendChild(auxPeek)
  
  route(editorArea)
  
  // Update active state in navigation
  updateActiveNav(normalized)

  // Notify global UI (timeline header, etc.)
  window.dispatchEvent(new CustomEvent('hddl:navigate', { detail: { path: normalized } }))
}

function normalizePath(pathname) {
  if (!pathname) return '/'
  let noQuery = String(pathname).split('?')[0].split('#')[0]
  
  // Strip base path for production deployment (e.g., /hddl/)
  const base = import.meta.env.BASE_URL
  if (base !== '/' && noQuery.startsWith(base)) {
    // Remove base path, keeping the leading slash
    noQuery = '/' + noQuery.slice(base.length)
  }
  
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1)
  // Back-compat: old route name.
  if (noQuery === '/capability-matrix') return '/steward-fleets'
  return noQuery
}
