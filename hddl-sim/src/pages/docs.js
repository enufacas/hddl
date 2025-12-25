export function renderDocs(container) {
  container.innerHTML = `
    <div class="page-container">
      <h1>📚 HDDL Documentation</h1>
      <p class="subtitle">Comprehensive documentation and architecture diagrams</p>
      
      <div class="docs-grid">
        <div class="docs-section">
          <h2>🎨 Visual Architecture</h2>
          <div class="docs-links">
            <a href="/docs/architecture.html" target="_blank" class="doc-link">
              <span class="doc-icon">🏗️</span>
              <div>
                <div class="doc-title">Architecture — Logical View</div>
                <div class="doc-desc">System components and relationships</div>
              </div>
            </a>
            <a href="/docs/stewardship.html" target="_blank" class="doc-link">
              <span class="doc-icon">👥</span>
              <div>
                <div class="doc-title">Stewardship — Process View</div>
                <div class="doc-desc">Stewardship workflows and ceremonies</div>
              </div>
            </a>
            <a href="/docs/simulation.html" target="_blank" class="doc-link">
              <span class="doc-icon">🎮</span>
              <div>
                <div class="doc-title">Simulation — Scenario View</div>
                <div class="doc-desc">Interactive simulation scenarios</div>
              </div>
            </a>
            <a href="/docs/visuals.html" target="_blank" class="doc-link">
              <span class="doc-icon">🎨</span>
              <div>
                <div class="doc-title">Visual Index (All Views)</div>
                <div class="doc-desc">Complete visual documentation index</div>
              </div>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <h2>📖 Foundations</h2>
          <div class="docs-links">
            <a href="/docs/foundations/HDDL_System_Overview.md" class="doc-link" data-markdown>
              <span class="doc-icon">🌐</span>
              <div>
                <div class="doc-title">System Overview</div>
                <div class="doc-desc">High-level HDDL architecture</div>
              </div>
            </a>
            <a href="/docs/foundations/Executive_Reference.md" class="doc-link" data-markdown>
              <span class="doc-icon">📊</span>
              <div>
                <div class="doc-title">Executive Reference</div>
                <div class="doc-desc">Executive summary and key concepts</div>
              </div>
            </a>
            <a href="/docs/foundations/Decision_Telemetry_Specification.md" class="doc-link" data-markdown>
              <span class="doc-icon">📈</span>
              <div>
                <div class="doc-title">Decision Telemetry Specification</div>
                <div class="doc-desc">Telemetry capture and monitoring</div>
              </div>
            </a>
            <a href="/docs/foundations/Human_Derived_Decision_Layer_Foundational_Principles.md" class="doc-link" data-markdown>
              <span class="doc-icon">⚖️</span>
              <div>
                <div class="doc-title">Foundational Principles</div>
                <div class="doc-desc">Core HDDL principles and values</div>
              </div>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <h2>👥 Roles & Groups</h2>
          <div class="docs-links">
            <a href="/docs/groups/Decision_Stewardship_Group.md" class="doc-link" data-markdown>
              <span class="doc-icon">🤝</span>
              <div>
                <div class="doc-title">Decision Stewardship Group</div>
                <div class="doc-desc">DSG structure and operations</div>
              </div>
            </a>
            <a href="/docs/roles/Business_Domain_Steward.md" class="doc-link" data-markdown>
              <span class="doc-icon">💼</span>
              <div>
                <div class="doc-title">Business Domain Steward</div>
                <div class="doc-desc">Business stewardship responsibilities</div>
              </div>
            </a>
            <a href="/docs/roles/Data_Steward.md" class="doc-link" data-markdown>
              <span class="doc-icon">📊</span>
              <div>
                <div class="doc-title">Data Steward</div>
                <div class="doc-desc">Data quality and governance</div>
              </div>
            </a>
            <a href="/docs/roles/Sales_Steward.md" class="doc-link" data-markdown>
              <span class="doc-icon">💰</span>
              <div>
                <div class="doc-title">Sales Steward</div>
                <div class="doc-desc">Sales decision stewardship</div>
              </div>
            </a>
          </div>
        </div>

        <div class="docs-section">
          <h2>📚 References</h2>
          <div class="docs-links">
            <a href="/docs/Canon_Registry.md" class="doc-link" data-markdown>
              <span class="doc-icon">📜</span>
              <div>
                <div class="doc-title">Canon Registry</div>
                <div class="doc-desc">Decision templates and patterns</div>
              </div>
            </a>
            <a href="/docs/Glossary.md" class="doc-link" data-markdown>
              <span class="doc-icon">📖</span>
              <div>
                <div class="doc-title">Glossary</div>
                <div class="doc-desc">HDDL terminology and definitions</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h2>💡 About the Documentation</h2>
        <p>The HDDL documentation includes interactive architecture diagrams, detailed role descriptions, operational guides, and narrative examples. All documents are version-controlled and continuously updated.</p>
        <p><strong>Note:</strong> HTML architecture diagrams open in new tabs. Markdown documents can be viewed in VS Code or rendered with your preferred markdown viewer.</p>
      </div>
    </div>
  `
}
