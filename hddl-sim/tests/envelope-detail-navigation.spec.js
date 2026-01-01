import { test, expect } from '@playwright/test'

test.describe('Envelope Detail Modal - Open Glossary Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate to docs page when Open Glossary button is clicked', async ({ page }) => {
    // Click on an envelope card to open the modal
    const envelopeCard = page.locator('.envelope-card').first()
    await envelopeCard.waitFor({ state: 'visible' })
    await envelopeCard.click()

    // Wait for modal to appear
    const modal = page.locator('.envelope-detail-modal')
    await expect(modal).toBeVisible()

    // Find and click the "Open Glossary" button
    const glossaryBtn = modal.locator('#open-glossary-btn')
    await expect(glossaryBtn).toBeVisible()
    await glossaryBtn.click()

    // Verify modal is closed immediately after click
    await expect(modal).not.toBeAttached({ timeout: 1000 })

    // Wait for navigation to complete
    await page.waitForURL('**/docs**')

    // Verify we're on the docs page
    expect(page.url()).toContain('/docs')
    
    // Verify docs page content is visible
    const docsTitle = page.locator('h1:has-text("HDDL Documentation")')
    await expect(docsTitle).toBeVisible()
  })

  test('should navigate to glossary section when button is clicked', async ({ page }) => {
    // Click on an envelope card to open the modal
    const envelopeCard = page.locator('.envelope-card').first()
    await envelopeCard.click()

    // Wait for modal and click Open Glossary
    const modal = page.locator('.envelope-detail-modal')
    await expect(modal).toBeVisible()
    
    const glossaryBtn = modal.locator('#open-glossary-btn')
    await glossaryBtn.click()

    // Wait for navigation
    await page.waitForURL('**/docs**')

    // Check if URL contains hash for glossary section
    expect(page.url()).toContain('#glossary')
    
    // Wait for the glossary inline content to open automatically
    const glossaryContent = page.locator('.inline-doc-content')
    await expect(glossaryContent).toBeVisible({ timeout: 3000 })
    
    // Verify the glossary content is shown
    const glossaryHeader = glossaryContent.locator('h1:has-text("Glossary"), h2:has-text("Glossary"), h3:has-text("Glossary")')
    await expect(glossaryHeader).toBeVisible()
  })
})
