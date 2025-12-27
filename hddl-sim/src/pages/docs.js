async function loadMarkdown(path) {
  try {
    // Use BASE_URL to handle both development (/) and production (/hddl/) base paths
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    const fullPath = path.startsWith('/') ? `${baseUrl}${path}` : path;
    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`Failed to load ${fullPath}`);
    return await response.text();
  } catch (err) {
    console.error('Error loading markdown:', err);
    return `# Error\n\nCould not load document: ${path}`;
  }
}

function renderMarkdown(markdown) {
  // Simple markdown renderer - converts basic markdown to HTML
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Unordered lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

function showMarkdownViewer(title, path) {
  const viewer = document.createElement('div');
  viewer.className = 'markdown-viewer';
  viewer.innerHTML = `
    <div class="markdown-viewer-overlay"></div>
    <div class="markdown-viewer-content">
      <div class="markdown-viewer-header">
        <h2>${title}</h2>
        <button class="markdown-viewer-close" aria-label="Close">✕</button>
      </div>
      <div class="markdown-viewer-body">
        <div class="loading-spinner">Loading documentation...</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(viewer);
  
  const close = () => {
    viewer.classList.add('closing');
    setTimeout(() => viewer.remove(), 300);
  };
  
  viewer.querySelector('.markdown-viewer-close').onclick = close;
  viewer.querySelector('.markdown-viewer-overlay').onclick = close;
  
  // Load and render markdown
  loadMarkdown(path).then(markdown => {
    const body = viewer.querySelector('.markdown-viewer-body');
    body.innerHTML = renderMarkdown(markdown);
    body.scrollTop = 0;
  });
  
  // Animate in
  requestAnimationFrame(() => viewer.classList.add('visible'));
}

export function renderDocs(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="docs-hero">
        <h1>HDDL Documentation</h1>
        <p class="hero-subtitle">Comprehensive documentation for the Human-Derived Decision Layer</p>
        <div class="hero-description">
          Explore the architecture, operations, and governance frameworks that enable 
          AI-native decision systems with continuous human stewardship.
        </div>
      </div>
      
      <div class="docs-grid">
        <div class="docs-section">
          <div class="section-header">
            <h2>Foundations</h2>
            <p class="section-desc">Core concepts, principles, and system architecture</p>
          </div>
          <div class="docs-links">
            <a href="/docs/foundations/HDDL_System_Overview.md" class="doc-link" data-markdown data-title="System Overview">
              <div class="doc-content">
                <div class="doc-title">System Overview</div>
                <div class="doc-desc">High-level HDDL architecture and components</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/foundations/Executive_Reference.md" class="doc-link" data-markdown data-title="Executive Reference">
              <div class="doc-content">
                <div class="doc-title">Executive Reference</div>
                <div class="doc-desc">Executive summary and strategic context</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/foundations/Decision_Telemetry_Specification.md" class="doc-link" data-markdown data-title="Decision Telemetry Specification">
              <div class="doc-content">
                <div class="doc-title">Decision Telemetry Specification</div>
                <div class="doc-desc">Telemetry capture, monitoring, and observability</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/foundations/Human_Derived_Decision_Layer_Foundational_Principles.md" class="doc-link" data-markdown data-title="Foundational Principles">
              <div class="doc-content">
                <div class="doc-title">Foundational Principles</div>
                <div class="doc-desc">Core HDDL principles, values, and governance</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/foundations/Decision_Memory_and_AI_Native_Operations.md" class="doc-link" data-markdown data-title="Decision Memory & AI-Native Operations">
              <div class="doc-content">
                <div class="doc-title">Decision Memory & AI-Native Operations</div>
                <div class="doc-desc">Embedding systems and retrieval patterns</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <div class="section-header">
            <h2>Roles & Groups</h2>
            <p class="section-desc">Steward roles, responsibilities, and organizational structure</p>
          </div>
          <div class="docs-links">
            <a href="/docs/groups/Decision_Stewardship_Group.md" class="doc-link" data-markdown data-title="Decision Stewardship Group">
              <div class="doc-content">
                <div class="doc-title">Decision Stewardship Group (DSG)</div>
                <div class="doc-desc">Cross-domain arbitration and governance council</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/roles/Business_Domain_Steward.md" class="doc-link" data-markdown data-title="Business Domain Steward">
              <div class="doc-content">
                <div class="doc-title">Business Domain Steward</div>
                <div class="doc-desc">Business context and domain expertise</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/roles/Data_Steward.md" class="doc-link" data-markdown data-title="Data Steward">
              <div class="doc-content">
                <div class="doc-title">Data Steward</div>
                <div class="doc-desc">Data quality, governance, and lineage</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/roles/Engineering_Steward.md" class="doc-link" data-markdown data-title="Engineering Steward">
              <div class="doc-content">
                <div class="doc-title">Engineering Steward</div>
                <div class="doc-desc">Technical implementation and system health</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <div class="section-header">
            <h2>Operations</h2>
            <p class="section-desc">Day-to-day practices, ceremonies, and operational procedures</p>
          </div>
          <div class="docs-links">
            <a href="/docs/operations/Request_Lifecycle_Walkthrough.md" class="doc-link" data-markdown data-title="Request Lifecycle">
              <div class="doc-content">
                <div class="doc-title">Request Lifecycle</div>
                <div class="doc-desc">End-to-end decision request flow through envelopes</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/operations/Steward_Led_Decision_Calibration.md" class="doc-link" data-markdown data-title="Decision Calibration">
              <div class="doc-content">
                <div class="doc-title">Decision Calibration</div>
                <div class="doc-desc">Steward-led model tuning and drift correction</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/operations/Continuous_Stewardship.md" class="doc-link" data-markdown data-title="Continuous Stewardship">
              <div class="doc-content">
                <div class="doc-title">Continuous Stewardship</div>
                <div class="doc-desc">Ongoing monitoring and improvement practices</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/operations/Ceremonies_and_Operating_Cadence.md" class="doc-link" data-markdown data-title="Ceremonies & Operating Cadence">
              <div class="doc-content">
                <div class="doc-title">Ceremonies & Operating Cadence</div>
                <div class="doc-desc">Regular meetings, reviews, and rituals</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <div class="section-header">
            <h2>References</h2>
            <p class="section-desc">Specifications, glossaries, and canonical references</p>
          </div>
          <div class="docs-links">
            <a href="/docs/Canon_Registry.md" class="doc-link" data-markdown data-title="Canon Registry">
              <div class="doc-content">
                <div class="doc-title">Canon Registry</div>
                <div class="doc-desc">Decision templates, patterns, and precedents</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/Glossary.md" class="doc-link" data-markdown data-title="Glossary">
              <div class="doc-content">
                <div class="doc-title">Glossary</div>
                <div class="doc-desc">HDDL terminology and definitions</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/spec/Authority_Order.md" class="doc-link" data-markdown data-title="Authority Order">
              <div class="doc-content">
                <div class="doc-title">Authority Order Specification</div>
                <div class="doc-desc">Decision authority hierarchy and delegation</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <div class="section-header">
            <h2>Narratives</h2>
            <p class="section-desc">Story-driven walkthroughs of HDDL in action</p>
          </div>
          <div class="docs-links">
            <a href="/docs/narratives/Narrative_Tuesday_in_the_Near_Future.md" class="doc-link" data-markdown data-title="Tuesday in the Near Future">
              <div class="doc-content">
                <div class="doc-title">Tuesday in the Near Future</div>
                <div class="doc-desc">A day in the life with HDDL-powered systems</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/narratives/Narrative_The_Glen_Judgment_Drift.md" class="doc-link" data-markdown data-title="The Glen: Judgment Drift">
              <div class="doc-content">
                <div class="doc-title">The Glen: Judgment Drift</div>
                <div class="doc-desc">Detecting and correcting AI drift in property management</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/narratives/Narrative_The_Glen_Sales_Stewardship.md" class="doc-link" data-markdown data-title="The Glen: Sales Stewardship">
              <div class="doc-content">
                <div class="doc-title">The Glen: Sales Stewardship</div>
                <div class="doc-desc">Cross-domain decision making in sales operations</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <div class="section-header">
            <h2>Implementation</h2>
            <p class="section-desc">Technical specifications and implementation guides</p>
          </div>
          <div class="docs-links">
            <a href="/docs/spec/Implementers_Guide.md" class="doc-link" data-markdown data-title="Implementers Guide">
              <div class="doc-content">
                <div class="doc-title">Implementers Guide</div>
                <div class="doc-desc">Step-by-step guide to implementing HDDL</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/spec/Interactive_Scenario_Implementation.md" class="doc-link" data-markdown data-title="Interactive Scenarios">
              <div class="doc-content">
                <div class="doc-title">Interactive Scenario Implementation</div>
                <div class="doc-desc">Building scenarios for the simulation</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
            <a href="/docs/spec/Drift_Gap_Analysis.md" class="doc-link" data-markdown data-title="Drift & Gap Analysis">
              <div class="doc-content">
                <div class="doc-title">Drift & Gap Analysis</div>
                <div class="doc-desc">Detecting and measuring decision quality drift</div>
              </div>
              <span class="doc-arrow">→</span>
            </a>
          </div>
        </div>
      </div>

      <div class="info-banner">
        <div class="info-card">
          <div>
            <h3>Explore the Simulation</h3>
            <p>Experience HDDL concepts in action through interactive scenarios. See how decision stewardship works across diverse domains from healthcare to autonomous vehicles.</p>
          </div>
        </div>
        <div class="info-card">
          <div>
            <h3>GitHub Pages Ready</h3>
            <p>Click any document link above to view the full content. All documentation is markdown-based and version-controlled for continuous improvement.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add click handlers for markdown links
  setTimeout(() => {
    const markdownLinks = container.querySelectorAll('.doc-link[data-markdown]');
    markdownLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.getAttribute('href');
        const title = link.getAttribute('data-title') || 'Documentation';
        showMarkdownViewer(title, path);
      });
    });
  }, 0);
}
