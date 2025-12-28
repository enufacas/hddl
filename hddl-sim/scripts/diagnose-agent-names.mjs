import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workspaceRoot = path.resolve(__dirname, '..')
const baseURL = process.env.HDDL_BASE_URL || 'http://localhost:5173'

function collectAgentNamesFromScenario(scenarioJson) {
  const names = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }

    // Agents appear as objects with agentId + name.
    if (typeof node.agentId === 'string' && typeof node.name === 'string') {
      names.push(node.name)
    }

    for (const value of Object.values(node)) visit(value)
  }

  visit(scenarioJson)
  return Array.from(new Set(names))
}

async function main() {
  const airForceScenarioPath = path.join(workspaceRoot, 'src', 'sim', 'scenarios', 'airforce-avionics-maintenance.scenario.json')
  const airForceScenario = JSON.parse(fs.readFileSync(airForceScenarioPath, 'utf-8'))
  const airForceAgentNames = collectAgentNamesFromScenario(airForceScenario)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const report = {
    baseURL,
    timestamp: new Date().toISOString(),
    scenarios: {},
  }

  const outDir = path.join(workspaceRoot, 'test-results', 'diagnostics')
  fs.mkdirSync(outDir, { recursive: true })

  const openLayoutAndSelect = async (presetId) => {
    await page.getByRole('button', { name: 'Layout presets' }).click()
    await page.locator('.layout-selector-dropdown[role="menu"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator(`[data-preset-id="${presetId}"]`).click()
    await page.waitForTimeout(750)
  }

  const captureMapAndText = async (tag) => {
    const mapContainer = page.locator('#hddl-map-container')
    await mapContainer.waitFor({ state: 'visible', timeout: 15000 })
    const mapSvg = page.locator('#hddl-map-container svg')
    await mapSvg.waitFor({ state: 'visible', timeout: 15000 })

    // Let any D3 transitions settle.
    await page.waitForTimeout(1000)

    await mapContainer.screenshot({ path: path.join(outDir, `map-${tag}.png`) })

    const svgTextVisible = await page.locator('#hddl-map-container svg text').evaluateAll((els) => {
      const visible = []
      for (const el of els) {
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (Number(style.opacity) <= 0.01) continue
        const text = (el.textContent || '').trim()
        if (!text) continue
        visible.push({
          text,
          className: el.getAttribute('class') || '',
          opacity: style.opacity,
        })
      }
      return visible
    })

    const agentNameText = await page.locator('#hddl-map-container text.agent-name').evaluateAll((els) => {
      return els.map((el) => {
        const style = getComputedStyle(el)
        return {
          text: (el.textContent || '').trim(),
          opacity: style.opacity,
          visibility: style.visibility,
          display: style.display,
          className: el.getAttribute('class') || '',
        }
      })
    })

    const activeLayout = await page.evaluate(() => localStorage.getItem('hddl:layout:active'))

    return {
      activeLayout,
      svgVisibleTextSample: svgTextVisible.slice(0, 60),
      svgVisibleTextCount: svgTextVisible.length,
      agentNameCount: agentNameText.length,
      agentNameNonEmpty: agentNameText.filter((x) => x.text.length > 0).length,
      agentNameAnyVisible: agentNameText.some((x) => x.text.length > 0 && x.visibility !== 'hidden' && x.display !== 'none' && Number(x.opacity) > 0.01),
    }
  }

  const selectScenarioByTitleContains = async (needle) => {
    const scenarioSelect = page.locator('.scenario-selector select')
    await scenarioSelect.waitFor({ state: 'visible', timeout: 15000 })
    const options = await scenarioSelect.locator('option').all()
    let value = null
    for (const opt of options) {
      const label = (await opt.textContent()) ?? ''
      if (label.toLowerCase().includes(needle.toLowerCase())) {
        value = await opt.getAttribute('value')
        break
      }
    }
    if (!value) throw new Error(`Scenario option not found for: ${needle}`)
    await scenarioSelect.selectOption(value)
    await page.waitForTimeout(750)
  }

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })

    // Scenario A: Air Force
    await selectScenarioByTitleContains('Air Force Avionics Maintenance')
    report.scenarios.airForce = {
      agentNamesSample: airForceAgentNames.slice(0, 25),
      defaultLayout: await captureMapAndText('airforce-default'),
    }
    await openLayoutAndSelect('focus')
    report.scenarios.airForce.focusLayout = await captureMapAndText('airforce-focus')

    // Scenario B: Default
    await openLayoutAndSelect('default')
    await selectScenarioByTitleContains('HDDL Replay — Four Fleets')
    report.scenarios.defaultScenario = {
      defaultLayout: await captureMapAndText('default-default'),
    }
    await openLayoutAndSelect('focus')
    report.scenarios.defaultScenario.focusLayout = await captureMapAndText('default-focus')

    // Also capture a full page screenshot for context (after last step).
    await page.screenshot({ path: path.join(outDir, 'page-after.png'), fullPage: true })
  } finally {
    const outPath = path.join(outDir, 'agent-name-diagnosis.json')
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')
    await browser.close()
  }

  console.log('Diagnosis written to test-results/diagnostics/agent-name-diagnosis.json')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
