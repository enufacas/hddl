/**
 * AI Narrative - Default Open Behavior
 *
 * Requirement: AI Narrative panel is always open by default for desktop users.
 * - Every load: aux panel visible (no body.aux-hidden)
 * - Persists across reloads
 */
import { test, expect } from '@playwright/test'

test.describe('AI Narrative - always open by default', () => {
  test('opens on every load', async ({ page }) => {
    // Ensure a wide viewport so the layout orchestrator doesn't hide the aux panel.
    await page.setViewportSize({ width: 1600, height: 900 })

    await page.goto('/?scenario=test-minimal')
    await page.waitForLoadState('networkidle')

    // First visit: aux should be open.
    await expect(page.locator('body')).not.toHaveClass(/\baux-hidden\b/)

    // After reload: aux should still be open.
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toHaveClass(/\baux-hidden\b/)
  })
})
