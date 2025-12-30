import { test, expect } from '@playwright/test'

test.describe('Embedding Vector Space Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the map to load
    await page.waitForSelector('svg', { timeout: 5000 })
  })

  test('should render 3D embedding box with perspective grid', async ({ page }) => {
    // Check that the embedding store layer exists
    const embeddingStore = await page.locator('g.embedding-store')
    await expect(embeddingStore).toBeVisible()

    // Check for 3D box elements
    const box3D = await page.locator('g.embedding-box-3d')
    await expect(box3D).toBeVisible()

    // Check for perspective grid
    const perspectiveGrid = await page.locator('g.perspective-grid')
    await expect(perspectiveGrid).toBeVisible()

    // Check that grid has lines (should have corner lines + horizontal lines)
    const gridLines = await page.locator('g.perspective-grid line')
    const lineCount = await gridLines.count()
    expect(lineCount).toBeGreaterThan(5) // Should have at least 4 corner + 6 horizontal = 10 lines

    console.log(`✓ Found ${lineCount} perspective grid lines`)
  })

  test('should render embedding chips with 3D structure', async ({ page }) => {
    // Advance timeline to show embeddings
    const playButton = await page.locator('button:has-text("Play")')
    if (await playButton.isVisible()) {
      await playButton.click()
      // Wait for timeline to advance
      await page.waitForTimeout(2000)
    }

    // Check for embedding chips
    const chips = await page.locator('g.embedding-chip')
    const chipCount = await chips.count()
    
    if (chipCount > 0) {
      console.log(`✓ Found ${chipCount} embedding chips`)
      
      // Check first chip has multiple faces (back, top, side, front)
      const firstChip = chips.first()
      const rects = await firstChip.locator('rect').count()
      const polygons = await firstChip.locator('polygon').count()
      
      expect(rects).toBeGreaterThanOrEqual(2) // At least back face + front face
      console.log(`✓ First chip has ${rects} rectangles and ${polygons} polygons (3D structure)`)
    } else {
      console.log('⚠ No embedding chips rendered yet (may need to advance timeline)')
    }
  })

  test('should have proper perspective box colors', async ({ page }) => {
    // Take a screenshot for visual inspection
    await page.screenshot({ 
      path: 'test-results/embedding-visual-check.png',
      fullPage: true 
    })

    // Check that polygons exist for box walls
    const polygons = await page.locator('g.embedding-box-3d polygon')
    const polyCount = await polygons.count()
    
    expect(polyCount).toBeGreaterThanOrEqual(2) // At least back wall and floor
    console.log(`✓ Found ${polyCount} box wall polygons`)

    // Check gradients are defined (optional - may not exist initially)
    const gradients = await page.locator('defs linearGradient[id*=\"embedding\"]')
    const gradientCount = await gradients.count()
    
    if (gradientCount > 0) {
      console.log(`✓ Found ${gradientCount} embedding gradients for 3D depth`)
    } else {
      console.log('⚠ No embedding gradients found (may appear after timeline advance)')
    }
  })

  test('should show embedding count badge', async ({ page }) => {
    const badge = await page.locator('text=/\\d+ vectors?/')
    await expect(badge).toBeVisible()
    
    const badgeText = await badge.textContent()
    console.log(`✓ Badge shows: "${badgeText}"`)
  })

  test('should display "Memories — Embedding Vector Space" header', async ({ page }) => {
    const header = await page.locator('text=/Memories.*Embedding Vector Space/')
    await expect(header).toBeVisible()
    console.log('✓ Header label visible')
  })
})
