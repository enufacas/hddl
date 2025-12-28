import { test, expect } from '@playwright/test'

async function selectAirForceScenario(page) {
  const scenarioSelect = page.locator('.scenario-selector select')
  await expect(scenarioSelect).toBeVisible()

  const options = await scenarioSelect.locator('option').all()
  let airForceValue = null
  for (const opt of options) {
    const label = (await opt.textContent()) ?? ''
    if (label.toLowerCase().includes('air force avionics maintenance')) {
      airForceValue = await opt.getAttribute('value')
      break
    }
  }

  expect(airForceValue, 'Air Force scenario option should exist').toBeTruthy()
  await scenarioSelect.selectOption(airForceValue)

  // Let the map re-render after scenario change.
  await page.waitForTimeout(750)
}

async function openLayoutMenu(page) {
  const button = page.getByRole('button', { name: 'Layout presets' })
  await expect(button).toBeVisible()
  await button.click()

  // Dropdown is a div[role=menu] under .layout-selector
  const menu = page.locator('.layout-selector-dropdown[role="menu"]')
  await expect(menu).toBeVisible()
  return menu
}

test.describe('Layout preset should not affect agent-name hiding', () => {
  test('Default vs Focus keeps agent names hidden for large fleets', async ({ page }) => {
    await page.goto('/')
    await selectAirForceScenario(page)

    const getVisibleAgentNameTexts = async () => {
      const nodes = await page.locator('text.agent-name').evaluateAll((els) => {
        return els
          .map((el) => {
            const style = getComputedStyle(el)
            return {
              text: (el.textContent || '').trim(),
              opacity: style.opacity,
              visibility: style.visibility,
              display: style.display,
            }
          })
          .filter((x) => x.text.length > 0 && x.display !== 'none' && x.visibility !== 'hidden' && Number(x.opacity) > 0.01)
          .map((x) => x.text)
      })
      return nodes
    }

    // Baseline in Default: Air Force fleets are 8-11 agents, names should be hidden.
    let visible = await getVisibleAgentNameTexts()
    expect(visible).toEqual([])
    await page.screenshot({
      path: 'test-results/screenshots/layout-focus-agent-names-default.png',
      fullPage: true,
    })

    // Switch to Focus layout preset.
    const menu = await openLayoutMenu(page)
    await menu.locator('[data-preset-id="focus"]').click()
    await page.waitForTimeout(500)

    visible = await getVisibleAgentNameTexts()
    expect(visible).toEqual([])
    await page.screenshot({
      path: 'test-results/screenshots/layout-focus-agent-names-focus.png',
      fullPage: true,
    })

    // Switch back to Default layout preset.
    await openLayoutMenu(page)
    await page.locator('[data-preset-id="default"]').click()
    await page.waitForTimeout(500)

    visible = await getVisibleAgentNameTexts()
    expect(visible).toEqual([])
    await page.screenshot({
      path: 'test-results/screenshots/layout-focus-agent-names-default-again.png',
      fullPage: true,
    })
  })
})
