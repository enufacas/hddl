import * as d3 from 'd3'

export function renderAuthority(container) {
  container.innerHTML = `
    <div class="page-container">
      <h1>🏛️ Decision Authority Hierarchy</h1>
      <p class="subtitle">Interactive visualization of stewardship authority levels</p>
      <div id="authority-viz" class="viz-container"></div>
      <div id="authority-details" class="details-panel"></div>
    </div>
  `

  // Authority hierarchy data
  const data = {
    name: "Enterprise Decision Space",
    authority: 100,
    children: [
      {
        name: "Strategic Decisions",
        authority: 90,
        steward: "Executive Steward",
        children: [
          { name: "Market Entry", authority: 85, steward: "Business Domain Steward", decisions: 12 },
          { name: "M&A Strategy", authority: 90, steward: "Executive Steward", decisions: 3 },
          { name: "Product Vision", authority: 80, steward: "Domain Steward", decisions: 45 }
        ]
      },
      {
        name: "Operational Decisions",
        authority: 70,
        steward: "Domain Steward",
        children: [
          { name: "Pricing", authority: 65, steward: "Sales Steward", decisions: 234 },
          { name: "Resource Allocation", authority: 70, steward: "Engineering Steward", decisions: 156 },
          { name: "Hiring", authority: 75, steward: "HR Steward", decisions: 89 }
        ]
      },
      {
        name: "Tactical Decisions",
        authority: 50,
        steward: "Domain Engineer",
        children: [
          { name: "Feature Prioritization", authority: 50, steward: "Domain Engineer", decisions: 567 },
          { name: "Data Quality", authority: 55, steward: "Data Steward", decisions: 423 },
          { name: "System Resilience", authority: 60, steward: "Resiliency Steward", decisions: 234 }
        ]
      }
    ]
  }

  createHierarchyViz(data)
}

function createHierarchyViz(data) {
  const width = 1200
  const height = 800
  
  const svg = d3.select('#authority-viz')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])

  const g = svg.append('g')
    .attr('transform', 'translate(100,100)')

  // Create hierarchy
  const root = d3.hierarchy(data)
  const treeLayout = d3.tree().size([width - 200, height - 200])
  treeLayout(root)

  // Draw links
  g.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y))
    .attr('fill', 'none')
    .attr('stroke', '#999')
    .attr('stroke-width', d => Math.max(1, d.target.data.authority / 30))
    .attr('opacity', 0.6)

  // Draw nodes
  const node = g.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => showDetails(d.data))

  node.append('circle')
    .attr('r', d => 5 + (d.data.authority / 10))
    .attr('fill', d => {
      const authority = d.data.authority || 50
      return d3.interpolateBlues(authority / 100)
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)

  node.append('text')
    .attr('dy', -15)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .text(d => d.data.name)

  node.append('text')
    .attr('dy', 25)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('fill', '#666')
    .text(d => d.data.steward || '')
}

function showDetails(data) {
  const details = document.querySelector('#authority-details')
  details.innerHTML = `
    <h3>${data.name}</h3>
    <div class="detail-item">
      <strong>Authority Level:</strong> ${data.authority || 'N/A'}
    </div>
    <div class="detail-item">
      <strong>Steward:</strong> ${data.steward || 'N/A'}
    </div>
    <div class="detail-item">
      <strong>Decisions:</strong> ${data.decisions || 'N/A'}
    </div>
    <div class="detail-item">
      <strong>Status:</strong> <span class="status-badge">Active</span>
    </div>
  `
}
