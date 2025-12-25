// Timeline Scrubber - Envelope Lifecycle View
import * as d3 from 'd3';

export function render() {
  const container = document.createElement('div');
  container.className = 'page-container';
  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
      <span class="codicon codicon-history" style="font-size: 28px;"></span>
      <div>
        <h1 style="margin: 0;">Timeline Scrubber</h1>
        <p style="margin: 0;">Envelope lifecycle and decision authority over time</p>
      </div>
    </div>
  `;

  // Timeline controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display: flex; gap: 12px; align-items: center; margin-bottom: 24px; padding: 16px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 6px;';
  
  const playButton = document.createElement('button');
  playButton.className = 'monaco-button';
  playButton.innerHTML = '<span class="codicon codicon-play"></span>';
  playButton.style.cssText = 'padding: 8px 12px;';
  
  const timeDisplay = document.createElement('div');
  timeDisplay.style.cssText = 'font-family: monospace; font-size: 14px; font-weight: 600;';
  timeDisplay.textContent = 'Day 0, 09:00';
  
  const speedControl = document.createElement('select');
  speedControl.style.cssText = 'padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-editor-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px;';
  speedControl.innerHTML = `
    <option value="1">1x Speed</option>
    <option value="2">2x Speed</option>
    <option value="4" selected>4x Speed</option>
    <option value="8">8x Speed</option>
  `;
  
  controls.appendChild(playButton);
  controls.appendChild(timeDisplay);
  controls.appendChild(document.createTextNode('Speed:'));
  controls.appendChild(speedControl);
  
  container.appendChild(controls);

  // Timeline scrubber visualization
  const timelineViz = document.createElement('div');
  timelineViz.id = 'timeline-viz';
  timelineViz.style.cssText = 'margin-bottom: 32px;';
  container.appendChild(timelineViz);

  // Envelope lifecycle panels
  const lifecycleSection = document.createElement('div');
  lifecycleSection.innerHTML = `
    <h2 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
      <span class="codicon codicon-shield"></span>
      Active Envelopes at Selected Time
    </h2>
  `;
  
  const envelopeGrid = document.createElement('div');
  envelopeGrid.className = 'card-grid';
  envelopeGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px;';
  
  // Sample envelopes
  const envelopes = [
    {
      id: 'ENV-001',
      name: 'Customer Service Responses',
      owner: 'Customer Steward',
      status: 'active',
      created: 'Day 0, 08:00',
      constraints: ['Max response time: 2min', 'Escalate on: negative sentiment', 'Require human review: refunds > $100']
    },
    {
      id: 'ENV-002',
      name: 'Hiring Recommendations',
      owner: 'HR Steward',
      status: 'active',
      created: 'Day 0, 08:30',
      constraints: ['No inference on protected classes', 'Human-only final decision', 'Transparency required']
    },
    {
      id: 'ENV-003',
      name: 'Pricing Adjustments',
      owner: 'Domain Engineer',
      status: 'revised',
      created: 'Day 1, 14:00',
      constraints: ['Max discount: 15%', 'Geographic restrictions apply', 'Audit trail required']
    }
  ];
  
  envelopes.forEach(env => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); padding: 16px; border-radius: 6px;';
    
    const statusColor = env.status === 'active' ? 'var(--status-success)' : 'var(--status-warning)';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <div style="font-size: 11px; color: var(--vscode-statusBar-foreground); font-family: monospace;">${env.id}</div>
          <h3 style="margin: 4px 0; font-size: 15px;">${env.name}</h3>
        </div>
        <span class="codicon codicon-${env.status === 'active' ? 'pass-filled' : 'warning'}" 
              style="color: ${statusColor}; font-size: 20px;"></span>
      </div>
      
      <div style="font-size: 12px; color: var(--vscode-statusBar-foreground); margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span class="codicon codicon-person"></span>
          <span>${env.owner}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="codicon codicon-clock"></span>
          <span>Created: ${env.created}</span>
        </div>
      </div>
      
      <div style="border-top: 1px solid var(--vscode-sideBar-border); padding-top: 12px;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Constraints
        </div>
        ${env.constraints.map(c => `
          <div style="display: flex; align-items: start; gap: 6px; margin-bottom: 6px; font-size: 12px;">
            <span class="codicon codicon-check" style="color: var(--status-success); margin-top: 2px;"></span>
            <span>${c}</span>
          </div>
        `).join('')}
      </div>
      
      <button class="monaco-button" style="margin-top: 12px; width: 100%; justify-content: center;">
        <span class="codicon codicon-eye"></span>
        <span>Inspect Envelope</span>
      </button>
    `;
    
    envelopeGrid.appendChild(card);
  });
  
  lifecycleSection.appendChild(envelopeGrid);
  container.appendChild(lifecycleSection);

  // Key events timeline
  const eventsSection = document.createElement('div');
  eventsSection.style.cssText = 'margin-top: 32px;';
  eventsSection.innerHTML = `
    <h2 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
      <span class="codicon codicon-calendar"></span>
      Key Events
    </h2>
  `;
  
  const eventsList = document.createElement('div');
  eventsList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
  
  const events = [
    { time: 'Day 0, 08:00', icon: 'add', color: 'var(--status-success)', label: 'Envelope ENV-001 promoted', detail: 'Customer Service Responses active' },
    { time: 'Day 0, 08:30', icon: 'add', color: 'var(--status-success)', label: 'Envelope ENV-002 promoted', detail: 'Hiring Recommendations active' },
    { time: 'Day 1, 10:23', icon: 'warning', color: 'var(--status-warning)', label: 'Signal divergence detected', detail: 'Response times exceeding assumptions' },
    { time: 'Day 1, 14:00', icon: 'edit', color: 'var(--status-info)', label: 'Envelope ENV-001 revised', detail: 'Constraints adjusted after review' },
    { time: 'Day 2, 09:15', icon: 'comment-discussion', color: 'var(--status-info)', label: 'DSG Review triggered', detail: 'Cross-domain envelope interaction' }
  ];
  
  events.forEach(evt => {
    const eventCard = document.createElement('div');
    eventCard.style.cssText = 'display: flex; gap: 12px; padding: 12px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-sideBar-border); border-radius: 6px; align-items: center;';
    
    eventCard.innerHTML = `
      <span class="codicon codicon-${evt.icon}" style="font-size: 24px; color: ${evt.color}; flex-shrink: 0;"></span>
      <div style="flex: 1;">
        <div style="font-family: monospace; font-size: 11px; color: var(--vscode-statusBar-foreground); margin-bottom: 2px;">${evt.time}</div>
        <div style="font-weight: 600; margin-bottom: 2px;">${evt.label}</div>
        <div style="font-size: 12px; color: var(--vscode-statusBar-foreground);">${evt.detail}</div>
      </div>
      <button class="monaco-button" style="padding: 6px 12px;">
        <span class="codicon codicon-go-to-file"></span>
      </button>
    `;
    
    eventsList.appendChild(eventCard);
  });
  
  eventsSection.appendChild(eventsList);
  container.appendChild(eventsSection);

  // Render D3 timeline visualization
  setTimeout(() => renderTimelineViz(), 0);

  return container;
}

function renderTimelineViz() {
  const container = document.getElementById('timeline-viz');
  if (!container) return;

  const width = container.clientWidth || 800;
  const height = 200;
  const margin = { top: 20, right: 40, bottom: 40, left: 60 };

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Timeline data - envelope lifecycle
  const data = [
    { name: 'ENV-001', start: 0, end: 48, status: 'active', color: '#3fb950' },
    { name: 'ENV-002', start: 0.5, end: 48, status: 'active', color: '#3fb950' },
    { name: 'ENV-003', start: 30, end: 48, status: 'revised', color: '#d29922' }
  ];

  const xScale = d3.scaleLinear()
    .domain([0, 48])
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

  // Add x-axis
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => `Day ${Math.floor(d/24)}`))
    .style('color', '#7d8590');

  // Add y-axis
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale))
    .style('color', '#7d8590');

  // Add envelope bars
  svg.selectAll('.envelope-bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'envelope-bar')
    .attr('x', d => xScale(d.start))
    .attr('y', d => yScale(d.name))
    .attr('width', d => xScale(d.end) - xScale(d.start))
    .attr('height', yScale.bandwidth())
    .attr('fill', d => d.color)
    .attr('opacity', 0.7)
    .attr('rx', 3);

  // Add current time indicator
  const currentTime = 25;
  svg.append('line')
    .attr('x1', xScale(currentTime))
    .attr('x2', xScale(currentTime))
    .attr('y1', margin.top)
    .attr('y2', height - margin.bottom)
    .attr('stroke', '#1f6feb')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,4');

  svg.append('text')
    .attr('x', xScale(currentTime))
    .attr('y', margin.top - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#1f6feb')
    .attr('font-size', '12px')
    .text('Current Time');
}
