export function initNav() {
  const nav = document.querySelector('#nav')
  nav.innerHTML = `
    <div class="nav-container">
      <h1 class="nav-title">HDDL Simulation Platform</h1>
      <div class="nav-links">
        <a href="/" data-link class="nav-link">Home</a>
        <a href="/docs" data-link class="nav-link">Docs</a>
        <a href="/authority" data-link class="nav-link">Authority</a>
        <a href="/steward-fleets" data-link class="nav-link">Agent Fleets</a>
        <a href="/decision-telemetry" data-link class="nav-link">Decision Telemetry</a>
        <a href="/dsg-event" data-link class="nav-link">DSG Event</a>
      </div>
    </div>
  `
}
