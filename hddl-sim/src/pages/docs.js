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
  const linkParent = link.parentElement;
  const existingContent = linkParent.querySelector('.inline-doc-content');
  
  if (existingContent) {
    existingContent.remove();
    link.classList.remove('expanded');
    return;
  }
  
  // Collapse any other expanded content in the same docs-links
  const docsLinks = link.closest('.docs-links');
  if (docsLinks) {
    docsLinks.querySelectorAll('.inline-doc-content').forEach(content => content.remove());
    docsLinks.querySelectorAll('.doc-link').forEach(l => l.classList.remove('expanded'));
  }
  
  // Create inline content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'inline-doc-content';
  contentDiv.style.cssText = `
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-sideBar-border);
    border-radius: 8px;
    padding: 16px;
    margin-top: 8px;
  `;
  contentDiv.innerHTML = `
    <div class="inline-doc-body">
      <div class="loading-spinner" style="text-align: center; padding: 24px; color: var(--vscode-statusBar-foreground);">Loading documentation...</div>
    </div>
  `;
  
  // Insert after the clicked link
  linkParent.insertBefore(contentDiv, link.nextSibling);
  link.classList.add('expanded');
  
  // Load and render markdown
  loadMarkdown(path).then(markdown => {
    const body = contentDiv.querySelector('.inline-doc-body');
    body.innerHTML = renderMarkdown(markdown);
    body.style.cssText = `
      line-height: 1.8;
      font-size: 13px;
    `;
  });
}

export function renderDocs(container) {
  container.innerHTML = `
    <div class="page-container" style="max-width: 1200px; margin: 0 auto;">
      <style>
        .docs-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          border: 1px solid var(--vscode-sideBar-border);
          border-radius: 10px;
          background: color-mix(in srgb, var(--vscode-editor-background) 75%, var(--vscode-sideBar-background));
          margin-bottom: 20px;
        }

        .docs-hero-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .docs-hero-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: color-mix(in srgb, var(--vscode-button-background) 12%, var(--vscode-sideBar-background));
          border: 1px solid var(--vscode-sideBar-border);
          flex: 0 0 auto;
        }

        .docs-title {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
        }

        .docs-subtitle {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: var(--vscode-statusBar-foreground);
        }

        .docs-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .docs-card {
          border: 1px solid var(--vscode-sideBar-border);
          border-radius: 10px;
          overflow: hidden;
          background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, var(--vscode-editor-background));
        }

        .docs-card-header {
          padding: 14px 16px;
          background: color-mix(in srgb, var(--vscode-button-background) 10%, var(--vscode-sideBar-background));
          border-bottom: 1px solid var(--vscode-sideBar-border);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
        }

        .docs-card-header:hover {
          background: color-mix(in srgb, var(--vscode-button-background) 14%, var(--vscode-sideBar-background));
        }

        .docs-card-title {
          margin: 0 0 4px 0;
          font-size: 16px;
        }

        .docs-card-desc {
          margin: 0;
          font-size: 13px;
          color: var(--vscode-statusBar-foreground);
        }

        .docs-card-content {
          padding: 16px;
          display: none;
        }

        .docs-links {
          display: grid;
          gap: 8px;
        }

        .doc-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: var(--vscode-editor-background);
          border: 1px solid var(--vscode-sideBar-border);
          border-radius: 8px;
          text-decoration: none;
          color: var(--vscode-editor-foreground);
          transition: all 0.2s;
          cursor: pointer;
          user-select: none;
        }

        .doc-link:hover {
          background: color-mix(in srgb, var(--vscode-button-background) 14%, var(--vscode-sideBar-background));
          border-color: var(--vscode-focusBorder);
        }

        .doc-content {
          flex: 1;
          min-width: 0;
        }

        .doc-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .doc-desc {
          font-size: 13px;
          color: var(--vscode-statusBar-foreground);
        }

        .doc-chevron {
          font-size: 20px;
          color: var(--vscode-statusBar-foreground);
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .docs-card.expanded .doc-chevron {
          transform: rotate(180deg);
        }

        @media (max-width: 900px) {
          .docs-hero-left {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      </style>
      <div class="docs-hero">
        <div class="docs-hero-left">
          <div class="docs-hero-icon"><span class="codicon codicon-book" style="font-size: 20px;"></span></div>
          <div style="min-width: 0;">
            <h1 class="docs-title">HDDL Documentation</h1>
            <p class="docs-subtitle">Comprehensive documentation for the Human-Derived Decision Layer</p>
          </div>
        </div>
      </div>
      
      <div class="docs-grid" id="docs-content">
        <div class="docs-card">
          <div class="docs-card-header">
            <div>
              <h2 class="docs-card-title">Foundations</h2>
              <p class="docs-card-desc">Core concepts, principles, and system architecture</p>
            </div>
            <span class="codicon codicon-chevron-down doc-chevron"></span>
          </div>
          <div class="docs-card-content">
            <div class="docs-links">
              <a href="/docs/foundations/HDDL_System_Overview.md" class="doc-link" data-markdown data-title="System Overview">
                <div class="doc-content">
                  <div class="doc-title">System Overview</div>
                  <div class="doc-desc">High-level HDDL architecture and components</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/foundations/Executive_Reference.md" class="doc-link" data-markdown data-title="Executive Reference">
                <div class="doc-content">
                  <div class="doc-title">Executive Reference</div>
                  <div class="doc-desc">Executive summary and strategic context</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/foundations/Decision_Telemetry_Specification.md" class="doc-link" data-markdown data-title="Decision Telemetry Specification">
                <div class="doc-content">
                  <div class="doc-title">Decision Telemetry Specification</div>
                  <div class="doc-desc">Telemetry capture, monitoring, and observability</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/foundations/Human_Derived_Decision_Layer_Foundational_Principles.md" class="doc-link" data-markdown data-title="Foundational Principles">
                <div class="doc-content">
                  <div class="doc-title">Foundational Principles</div>
                  <div class="doc-desc">Core HDDL principles, values, and governance</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/foundations/Decision_Memory_and_AI_Native_Operations.md" class="doc-link" data-markdown data-title="Decision Memory & AI-Native Operations">
                <div class="doc-content">
                  <div class="doc-title">Decision Memory & AI-Native Operations</div>
                  <div class="doc-desc">Embedding systems and retrieval patterns</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
            </div>
          </div>
        </div>

        <div class="docs-card">
          <div class="docs-card-header">
            <div>
              <h2 class="docs-card-title">Roles & Groups</h2>
              <p class="docs-card-desc">Steward roles, responsibilities, and organizational structure</p>
            </div>
            <span class="codicon codicon-chevron-down doc-chevron"></span>
          </div>
          <div class="docs-card-content">
            <div class="docs-links">
              <a href="/docs/groups/Decision_Stewardship_Group.md" class="doc-link" data-markdown data-title="Decision Stewardship Group">
                <div class="doc-content">
                  <div class="doc-title">Decision Stewardship Group (DSG)</div>
                  <div class="doc-desc">Cross-domain arbitration and governance council</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/roles/Business_Domain_Steward.md" class="doc-link" data-markdown data-title="Business Domain Steward">
                <div class="doc-content">
                  <div class="doc-title">Business Domain Steward</div>
                  <div class="doc-desc">Business context and domain expertise</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/roles/Data_Steward.md" class="doc-link" data-markdown data-title="Data Steward">
                <div class="doc-content">
                  <div class="doc-title">Data Steward</div>
                  <div class="doc-desc">Data quality, governance, and lineage</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/roles/Engineering_Steward.md" class="doc-link" data-markdown data-title="Engineering Steward">
                <div class="doc-content">
                  <div class="doc-title">Engineering Steward</div>
                  <div class="doc-desc">Technical implementation and system health</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
            </div>
          </div>
        </div>

        <div class="docs-card">
          <div class="docs-card-header">
            <div>
              <h2 class="docs-card-title">Operations</h2>
              <p class="docs-card-desc">Day-to-day practices, ceremonies, and operational procedures</p>
            </div>
            <span class="codicon codicon-chevron-down doc-chevron"></span>
          </div>
          <div class="docs-card-content">
            <div class="docs-links">
              <a href="/docs/operations/Request_Lifecycle_Walkthrough.md" class="doc-link" data-markdown data-title="Request Lifecycle">
                <div class="doc-content">
                  <div class="doc-title">Request Lifecycle</div>
                  <div class="doc-desc">End-to-end decision request flow through envelopes</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/operations/Steward_Led_Decision_Calibration.md" class="doc-link" data-markdown data-title="Decision Calibration">
                <div class="doc-content">
                  <div class="doc-title">Decision Calibration</div>
                  <div class="doc-desc">Steward-led model tuning and drift correction</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/operations/Continuous_Stewardship.md" class="doc-link" data-markdown data-title="Continuous Stewardship">
                <div class="doc-content">
                  <div class="doc-title">Continuous Stewardship</div>
                  <div class="doc-desc">Ongoing monitoring and improvement practices</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/operations/Ceremonies_and_Operating_Cadence.md" class="doc-link" data-markdown data-title="Ceremonies & Operating Cadence">
                <div class="doc-content">
                  <div class="doc-title">Ceremonies & Operating Cadence</div>
                  <div class="doc-desc">Regular meetings, reviews, and rituals</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
            </div>
          </div>
        </div>

        <div class="docs-card">
          <div class="docs-card-header">
            <div>
              <h2 class="docs-card-title">References</h2>
              <p class="docs-card-desc">Specifications, glossaries, and canonical references</p>
            </div>
            <span class="codicon codicon-chevron-down doc-chevron"></span>
          </div>
          <div class="docs-card-content">
            <div class="docs-links">
              <a href="/docs/Canon_Registry.md" class="doc-link" data-markdown data-title="Canon Registry">
                <div class="doc-content">
                  <div class="doc-title">Canon Registry</div>
                  <div class="doc-desc">Decision templates, patterns, and precedents</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/Glossary.md" class="doc-link" data-markdown data-title="Glossary">
                <div class="doc-content">
                  <div class="doc-title">Glossary</div>
                  <div class="doc-desc">HDDL terminology and definitions</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/spec/Authority_Order.md" class="doc-link" data-markdown data-title="What Counts">
                <div class="doc-content">
                  <div class="doc-title">What Counts (Normative vs Illustrative)</div>
                  <div class="doc-desc">A quick map of what's binding vs guidance</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/specification" class="doc-link" data-route>
                <div class="doc-content">
                  <div class="doc-title">Interactive Specification Explorer</div>
                  <div class="doc-desc">Explore HDDL scenarios and decision telemetry</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
            </div>
          </div>
        </div>

        <div class="docs-card">
          <div class="docs-card-header">
            <div>
              <h2 class="docs-card-title">Implementation</h2>
              <p class="docs-card-desc">Technical specifications and implementation guides</p>
            </div>
            <span class="codicon codicon-chevron-down doc-chevron"></span>
          </div>
          <div class="docs-card-content">
            <div class="docs-links">
              <a href="/docs/spec/Implementers_Guide.md" class="doc-link" data-markdown data-title="Implementers Guide">
                <div class="doc-content">
                  <div class="doc-title">Implementers Guide</div>
                  <div class="doc-desc">Step-by-step guide to implementing HDDL</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/spec/Interactive_Scenario_Implementation.md" class="doc-link" data-markdown data-title="Interactive Scenarios">
                <div class="doc-content">
                  <div class="doc-title">Interactive Scenario Implementation</div>
                  <div class="doc-desc">Building scenarios for the simulation</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
              <a href="/docs/spec/Drift_Gap_Analysis.md" class="doc-link" data-markdown data-title="Drift & Gap Analysis">
                <div class="doc-content">
                  <div class="doc-title">Drift & Gap Analysis</div>
                  <div class="doc-desc">Detecting and measuring decision quality drift</div>
                </div>
                <span class="codicon codicon-chevron-right" style="font-size: 16px;"></span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="info-banner" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 24px;">
        <div class="info-card" style="padding: 16px; background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, var(--vscode-editor-background)); border: 1px solid var(--vscode-sideBar-border); border-radius: 10px;">
          <div>
            <h3 style="font-size: 16px; margin: 0 0 8px; color: var(--vscode-editor-foreground);">Explore the Simulation</h3>
            <p style="font-size: 13px; margin: 0; color: var(--vscode-statusBar-foreground); line-height: 1.6;">Experience HDDL concepts in action through interactive scenarios. See how decision stewardship works across diverse domains from healthcare to autonomous vehicles.</p>
          </div>
        </div>
        <div class="info-card" style="padding: 16px; background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, var(--vscode-editor-background)); border: 1px solid var(--vscode-sideBar-border); border-radius: 10px;">
          <div>
            <h3 style="font-size: 16px; margin: 0 0 8px; color: var(--vscode-editor-foreground);">GitHub Pages Ready</h3>
            <p style="font-size: 13px; margin: 0; color: var(--vscode-statusBar-foreground); line-height: 1.6;">Click any document link above to view the full content. All documentation is markdown-based and version-controlled for continuous improvement.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add click handlers for collapsible card headers
  setTimeout(() => {
    const cardHeaders = container.querySelectorAll('.docs-card-header');
    cardHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.docs-card');
        const content = card.querySelector('.docs-card-content');
        const isExpanded = content.style.display === 'block';
        
        // Toggle this card
        content.style.display = isExpanded ? 'none' : 'block';
        if (isExpanded) {
          card.classList.remove('expanded');
        } else {
          card.classList.add('expanded');
        }
      });
    });
    
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


