import { test, expect } from '@playwright/test'

test.describe('Agent Names with Steward Filter', () => {
  test('should hide agent names when filtered view has 7+ agents', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(500)

    // Get available steward options
    const filterSelect = page.locator('#steward-filter')
    const options = await filterSelect.locator('option').allTextContents()
    console.log('Available steward options:', options)
    
    // Try to find a steward with many agents (prefer Operations, Training, or Safety)
    let selectedSteward = null
    for (const opt of ['Operations Steward', 'Training Steward', 'Safety Steward', 'Supply Steward']) {
      if (options.includes(opt)) {
        selectedSteward = opt
        break
      }
    }
    
    if (!selectedSteward) {
      console.log('No steward with expected large agent count found, using first option')
      selectedSteward = options[1] // Skip "All Envelopes"
    }
    
    console.log(`Selecting steward: ${selectedSteward}`)
    await filterSelect.selectOption(selectedSteward)
    await page.waitForTimeout(1000) // Wait for map to update

    // Get all agent name text elements
    const agentNames = page.locator('text.agent-name')
    const count = await agentNames.count()
    console.log(`Found ${count} agent name elements`)

    // Check opacity on each agent name
    for (let i = 0; i < Math.min(count, 15); i++) {
      const elem = agentNames.nth(i)
      const opacity = await elem.getAttribute('opacity')
      const styleOpacity = await elem.evaluate(el => getComputedStyle(el).opacity)
      const text = await elem.textContent()
      console.log(`Agent ${i}: "${text}" - attr opacity: ${opacity}, style opacity: ${styleOpacity}`)
    }

    // If there are 7+ agents, all should have opacity 0
    if (count >= 7) {
      for (let i = 0; i < count; i++) {
        const elem = agentNames.nth(i)
        const opacity = await elem.getAttribute('opacity')
        const styleOpacity = await elem.evaluate(el => getComputedStyle(el).opacity)
        expect(parseFloat(styleOpacity)).toBe(0)
      }
    }
  })

  test('should hide agent names in Air Force scenario', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(500)

    // Find and click the scenario selector
    const scenarioButtons = page.locator('button').filter({ hasText: /SaaS|Air Force/i })
    const count = await scenarioButtons.count()
    console.log(`Found ${count} scenario buttons`)
    
    if (count === 0) {
      // Try dropdown if buttons don't exist
      const scenarioSelect = page.locator('select').first()
      const options = await scenarioSelect.locator('option').allTextContents()
      console.log('Scenario options:', options)
      const airForceOption = options.find(opt => opt.includes('Air Force'))
      if (airForceOption) {
        await scenarioSelect.selectOption(airForceOption)
      }
    } else {
      // Click Air Force button if it exists
      const airForceButton = scenarioButtons.filter({ hasText: /Air Force/i }).first()
      if (await airForceButton.count() > 0) {
        await airForceButton.click()
      }
    }
    
    await page.waitForTimeout(1000)

    // Get all agent name text elements
    const agentNames = page.locator('text.agent-name')
    const agentCount = await agentNames.count()
    console.log(`Air Force scenario has ${agentCount} agent name elements`)

    // Check first 20 agents
    for (let i = 0; i < Math.min(agentCount, 20); i++) {
      const elem = agentNames.nth(i)
      const opacity = await elem.getAttribute('opacity')
      const styleOpacity = await elem.evaluate(el => getComputedStyle(el).opacity)
      const text = await elem.textContent()
      console.log(`Agent ${i}: "${text}" - attr opacity: ${opacity}, style opacity: ${styleOpacity}`)
    }

    // All agents should have opacity 0 (fleets of 8-11 agents each)
    for (let i = 0; i < agentCount; i++) {
      const elem = agentNames.nth(i)
      const styleOpacity = await elem.evaluate(el => getComputedStyle(el).opacity)
      expect(parseFloat(styleOpacity)).toBe(0)
    }
  })
})
