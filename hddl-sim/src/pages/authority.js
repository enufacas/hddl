import { getStewardColor } from '../sim/steward-colors'

export function renderAuthority(container) {
  // Get steward colors for visual consistency
  const tierOneColor = getStewardColor('Customer Steward')  // Blue
  const tierTwoColor = getStewardColor('Data Steward')      // Purple
  const nonNormativeColor = 'var(--vscode-statusBar-foreground)'
  
  container.innerHTML = `
    <div class="page-container" style="max-width: 900px; margin: 0 auto; padding: 20px;">
      <h1>What Counts (Normative vs Illustrative)</h1>
      <p class="subtitle" style="margin-bottom: 30px; color: var(--vscode-statusBar-foreground);">
        A quick map of which docs are binding vs just guidance.
      </p>

      <section style="margin-bottom: 40px;">
        <h2 style="border-bottom: 2px solid ${tierOneColor}; padding-bottom: 8px; margin-bottom: 20px;">
          <span class="codicon codicon-shield" style="margin-right: 8px; color: ${tierOneColor};"></span>
          Normative (Authoritative)
        </h2>
        <p style="margin-bottom: 20px; color: var(--vscode-statusBar-foreground);">
          These documents define <strong>what HDDL is</strong> and <strong>what implementations MUST comply with</strong>. 
          Changes require the ADR process.
        </p>

        <div class="tier-section" style="margin-bottom: 30px;">
          <h3 style="color: ${tierOneColor}; margin-bottom: 15px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${tierOneColor}; margin-right: 8px;"></span>
            Tier 1: Core Canon
          </h3>
          <ul style="list-style: none; padding-left: 0;">
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierOneColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierOneColor}; border-radius: 4px;">
              <strong>Canon Registry</strong> <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">docs/Canon_Registry.md</code><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">Index of all normative documents</span>
            </li>
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierOneColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierOneColor}; border-radius: 4px;">
              <strong>Glossary</strong> <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">docs/Glossary.md</code><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">Canonical definitions of HDDL terms</span>
            </li>
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierOneColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierOneColor}; border-radius: 4px;">
              <strong>Foundations</strong> <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">docs/foundations/</code><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">
                Core principles, system overview, Decision Telemetry Specification, Decision Memory
              </span>
            </li>
          </ul>
        </div>

        <div class="tier-section" style="margin-bottom: 30px;">
          <h3 style="color: ${tierTwoColor}; margin-bottom: 15px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${tierTwoColor}; margin-right: 8px;"></span>
            Tier 2: Portable Spec Artifacts
          </h3>
          <ul style="list-style: none; padding-left: 0;">
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierTwoColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierTwoColor}; border-radius: 4px;">
              <strong>Scenario Replay Wire Format</strong><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">
                Schema: <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">hddl-sim/schemas/hddl-scenario.schema.json</code>
              </span>
            </li>
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierTwoColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierTwoColor}; border-radius: 4px;">
              <strong>Scenario Interaction Format</strong><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">
                Schema: <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">hddl-sim/schemas/hddl-interaction.schema.json</code>
              </span>
            </li>
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierTwoColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierTwoColor}; border-radius: 4px;">
              <strong>Drift + Gap Analysis</strong><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">
                Catalog of spec vs SIM differences
              </span>
            </li>
            <li style="margin-bottom: 12px; padding: 12px; background: color-mix(in srgb, ${tierTwoColor} 8%, var(--vscode-sideBar-background)); border-left: 3px solid ${tierTwoColor}; border-radius: 4px;">
              <strong>Conformance Scripts</strong><br>
              <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">
                Validators: <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">validate-canon-registry.mjs</code>, <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">validate-scenarios.mjs</code>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section style="margin-bottom: 40px;">
        <h2 style="border-bottom: 2px solid ${nonNormativeColor}; padding-bottom: 8px; margin-bottom: 20px; opacity: 0.7;">
          <span class="codicon codicon-book" style="margin-right: 8px;"></span>
          Non-Normative (Illustrative)
        </h2>
        <p style="margin-bottom: 20px; color: var(--vscode-statusBar-foreground);">
          These documents provide <strong>guidance, examples, and teaching</strong> but are <strong>not binding</strong> on implementations.
        </p>

        <div class="non-normative-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="padding: 12px; background: var(--vscode-sideBar-background); border-left: 3px solid ${nonNormativeColor}; border-radius: 4px; opacity: 0.75;">
            <strong>Operations</strong><br>
            <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">Ceremonies, cadence, playbooks</span>
          </div>
          <div style="padding: 12px; background: var(--vscode-sideBar-background); border-left: 3px solid ${nonNormativeColor}; border-radius: 4px; opacity: 0.75;">
            <strong>Roles</strong><br>
            <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">Role definitions & workflows</span>
          </div>
          <div style="padding: 12px; background: var(--vscode-sideBar-background); border-left: 3px solid ${nonNormativeColor}; border-radius: 4px; opacity: 0.75;">
            <strong>SIM Implementation</strong><br>
            <span style="color: var(--vscode-statusBar-foreground); font-size: 13px;">Reference UI (not binding)</span>
          </div>
        </div>
      </section>

      <section style="margin-bottom: 40px;">
        <h2 style="border-bottom: 2px solid var(--status-warning); padding-bottom: 8px; margin-bottom: 20px;">
          <span class="codicon codicon-checklist" style="margin-right: 8px; color: var(--status-warning);"></span>
          Conformance Checklist
        </h2>
        
        <div style="background: color-mix(in srgb, var(--status-success) 8%, var(--vscode-sideBar-background)); border-left: 3px solid var(--status-success); border-radius: 4px; padding: 15px; margin-bottom: 15px;">
          <p style="margin-bottom: 10px; font-weight: 600;">You <strong>MUST</strong>:</p>
          <ul style="padding-left: 20px; line-height: 1.8; margin: 0;">
            <li>✅ Parse scenario packs conforming to <code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">hddl-scenario.schema.json</code></li>
            <li>✅ Respect event taxonomy (9 event types)</li>
            <li>✅ Use numeric hour for time sequencing</li>
            <li>✅ Pass headless conformance checks (<code style="background: var(--vscode-input-background); padding: 2px 6px; border-radius: 3px; font-size: 11px;">npm run conformance</code>)</li>
          </ul>
        </div>

        <div style="background: color-mix(in srgb, var(--status-info) 8%, var(--vscode-sideBar-background)); border-left: 3px solid var(--status-info); border-radius: 4px; padding: 15px; margin-bottom: 15px;">
          <p style="margin-bottom: 10px; font-weight: 600;">You <strong>MAY</strong>:</p>
          <ul style="padding-left: 20px; line-height: 1.8; margin: 0;">
            <li>Use different UI/UX (colors, layouts) as long as semantics are preserved</li>
            <li>Add implementation-specific features not part of the spec</li>
          </ul>
        </div>

        <div style="background: color-mix(in srgb, var(--status-error) 8%, var(--vscode-sideBar-background)); border-left: 3px solid var(--status-error); border-radius: 4px; padding: 15px;">
          <p style="margin-bottom: 10px; font-weight: 600;">You <strong>MUST NOT</strong>:</p>
          <ul style="padding-left: 20px; line-height: 1.8; margin: 0;">
            <li>❌ Claim conformance without passing the conformance suite</li>
            <li>❌ Invent new event types without ADR process</li>
            <li>❌ Break determinism (same scenario → same replay)</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 style="border-bottom: 2px solid var(--vscode-focusBorder); padding-bottom: 8px; margin-bottom: 20px;">
          <span class="codicon codicon-question" style="margin-right: 8px; color: var(--vscode-focusBorder);"></span>
          FAQ
        </h2>
        <div style="margin-bottom: 20px; padding: 12px; background: var(--vscode-sideBar-background); border-radius: 4px;">
          <strong style="color: var(--vscode-editor-foreground);">Q: Is X normative?</strong><br>
          <span style="color: var(--vscode-statusBar-foreground); margin-top: 5px; display: block;">Check if it's in Tier 1 or Tier 2. If yes, it's normative. If no, it's illustrative.</span>
        </div>
        <div style="margin-bottom: 20px; padding: 12px; background: var(--vscode-sideBar-background); border-radius: 4px;">
          <strong style="color: var(--vscode-editor-foreground);">Q: Can I change X?</strong><br>
          <span style="color: var(--vscode-statusBar-foreground); margin-top: 5px; display: block;">If normative, use the ADR process. If non-normative, change freely.</span>
        </div>
        <div style="margin-bottom: 20px; padding: 12px; background: var(--vscode-sideBar-background); border-radius: 4px;">
          <strong style="color: var(--vscode-editor-foreground);">Q: What if the SIM does something not in the spec?</strong><br>
          <span style="color: var(--vscode-statusBar-foreground); margin-top: 5px; display: block;">File an issue; either the spec needs updating or the SIM is drifting.</span>
        </div>
      </section>

      <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--vscode-sideBar-border); text-align: center; color: var(--vscode-statusBar-foreground); font-size: 12px;">
        <p>Full document: <a href="/docs#spec/Authority_Order.md" style="color: var(--vscode-textLink-foreground); text-decoration: none;">docs/spec/Authority_Order.md</a></p>
      </footer>
    </div>
  `
}
