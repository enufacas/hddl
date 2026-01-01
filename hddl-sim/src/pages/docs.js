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

function showInlineContent(link, title, path) {
  // Check if content is already expanded
  const section = link.closest('.docs-section');
  const existingContent = section.querySelector('.inline-doc-content');
  const chevron = link.querySelector('.doc-chevron');
  
  if (existingContent) {
    existingContent.remove();
    link.classList.remove('expanded');
    if (chevron) {
      chevron.style.transform = 'rotate(0deg)';
    }
    return;
  }
  
  // Collapse any other expanded content in the same section
  section.querySelectorAll('.inline-doc-content').forEach(content => content.remove());
  section.querySelectorAll('.doc-link').forEach(l => {
    l.classList.remove('expanded');
    const otherChevron = l.querySelector('.doc-chevron');
    if (otherChevron) {
      otherChevron.style.transform = 'rotate(0deg)';
    }
  });
  
  // Create inline content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'inline-doc-content';
  contentDiv.innerHTML = `
    <div class="inline-doc-body">
      <div class="loading-spinner">Loading documentation...</div>
    </div>
  `;
  
  // Insert after the clicked link
  link.insertAdjacentElement('afterend', contentDiv);
  link.classList.add('expanded');
  if (chevron) {
    chevron.style.transform = 'rotate(180deg)';
  }
  
  // Load and render markdown
  loadMarkdown(path).then(markdown => {
    const body = contentDiv.querySelector('.inline-doc-body');
    body.innerHTML = renderMarkdown(markdown);
  });
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
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/foundations/Executive_Reference.md" class="doc-link" data-markdown data-title="Executive Reference">
              <div class="doc-content">
                <div class="doc-title">Executive Reference</div>
                <div class="doc-desc">Executive summary and strategic context</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/foundations/Decision_Telemetry_Specification.md" class="doc-link" data-markdown data-title="Decision Telemetry Specification">
              <div class="doc-content">
                <div class="doc-title">Decision Telemetry Specification</div>
                <div class="doc-desc">Telemetry capture, monitoring, and observability</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/foundations/Human_Derived_Decision_Layer_Foundational_Principles.md" class="doc-link" data-markdown data-title="Foundational Principles">
              <div class="doc-content">
                <div class="doc-title">Foundational Principles</div>
                <div class="doc-desc">Core HDDL principles, values, and governance</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/foundations/Decision_Memory_and_AI_Native_Operations.md" class="doc-link" data-markdown data-title="Decision Memory & AI-Native Operations">
              <div class="doc-content">
                <div class="doc-title">Decision Memory & AI-Native Operations</div>
                <div class="doc-desc">Embedding systems and retrieval patterns</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
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
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/roles/Business_Domain_Steward.md" class="doc-link" data-markdown data-title="Business Domain Steward">
              <div class="doc-content">
                <div class="doc-title">Business Domain Steward</div>
                <div class="doc-desc">Business context and domain expertise</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/roles/Data_Steward.md" class="doc-link" data-markdown data-title="Data Steward">
              <div class="doc-content">
                <div class="doc-title">Data Steward</div>
                <div class="doc-desc">Data quality, governance, and lineage</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/roles/Engineering_Steward.md" class="doc-link" data-markdown data-title="Engineering Steward">
              <div class="doc-content">
                <div class="doc-title">Engineering Steward</div>
                <div class="doc-desc">Technical implementation and system health</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
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
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/operations/Steward_Led_Decision_Calibration.md" class="doc-link" data-markdown data-title="Decision Calibration">
              <div class="doc-content">
                <div class="doc-title">Decision Calibration</div>
                <div class="doc-desc">Steward-led model tuning and drift correction</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/operations/Continuous_Stewardship.md" class="doc-link" data-markdown data-title="Continuous Stewardship">
              <div class="doc-content">
                <div class="doc-title">Continuous Stewardship</div>
                <div class="doc-desc">Ongoing monitoring and improvement practices</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/operations/Ceremonies_and_Operating_Cadence.md" class="doc-link" data-markdown data-title="Ceremonies & Operating Cadence">
              <div class="doc-content">
                <div class="doc-title">Ceremonies & Operating Cadence</div>
                <div class="doc-desc">Regular meetings, reviews, and rituals</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
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
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/Glossary.md" class="doc-link" data-markdown data-title="Glossary">
              <div class="doc-content">
                <div class="doc-title">Glossary</div>
                <div class="doc-desc">HDDL terminology and definitions</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/spec/Authority_Order.md" class="doc-link" data-markdown data-title="What Counts">
              <div class="doc-content">
                <div class="doc-title">What Counts (Normative vs Illustrative)</div>
                <div class="doc-desc">A quick map of what's binding vs guidance</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/specification" class="doc-link" data-route>
              <div class="doc-content">
                <div class="doc-title">Interactive Specification Explorer</div>
                <div class="doc-desc">Explore HDDL scenarios and decision telemetry</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
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
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/spec/Interactive_Scenario_Implementation.md" class="doc-link" data-markdown data-title="Interactive Scenarios">
              <div class="doc-content">
                <div class="doc-title">Interactive Scenario Implementation</div>
                <div class="doc-desc">Building scenarios for the simulation</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
            </a>
            <a href="/docs/spec/Drift_Gap_Analysis.md" class="doc-link" data-markdown data-title="Drift & Gap Analysis">
              <div class="doc-content">
                <div class="doc-title">Drift & Gap Analysis</div>
                <div class="doc-desc">Detecting and measuring decision quality drift</div>
              </div>
              <span class="codicon codicon-chevron-down doc-chevron"></span>
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
        showInlineContent(link, title, path);
      });
    });
    
    // Handle hash navigation (e.g., #glossary)
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash) {
      // Try to find and click the corresponding link
      const targetLink = container.querySelector(`.doc-link[data-title="${hash}"]`) ||
                         container.querySelector(`.doc-link[data-title="${hash.charAt(0).toUpperCase() + hash.slice(1)}"]`);
      if (targetLink) {
        targetLink.click();
      } else {
        // Try to scroll to an element with that ID
        const targetElement = document.getElementById(hash);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, 0);
}


