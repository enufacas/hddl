import { chromium, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const iPhone12 = devices['iPhone 12']

async function verifyScreenshots() {
  console.log('🔍 Verifying mobile screenshots contain expected elements...\n')
  
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...iPhone12,
    viewport: { width: 390, height: 844 }
  })
  
  const page = await context.newPage()
  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')
  
  // Verify key elements
  const checks = {
    'Hamburger menu': await page.locator('.mobile-hamburger').isVisible(),
    'HDDL Map container': await page.locator('#hddl-map-container').isVisible(),
    'HDDL Map SVG': await page.locator('#hddl-map-container svg').isVisible(),
    'Timeline controls': await page.locator('.timeline-controls').isVisible(),
    'FAB button': await page.locator('.mobile-panel-fab').isVisible(),
    'Bottom sheet': await page.locator('.mobile-bottom-sheet').isVisible()
  }
  
  console.log('✅ Element visibility checks:')
  for (const [name, visible] of Object.entries(checks)) {
    console.log(`  ${visible ? '✅' : '❌'} ${name}`)
  }
  
  // Check canvas has content
  const svgHasContent = await page.locator('#hddl-map-container svg g').count()
  console.log(`\n📊 SVG has ${svgHasContent} groups (should be > 5 for map elements)`)
  
  // Get canvas dimensions
  const canvasBox = await page.locator('#hddl-map-container').boundingBox()
  if (canvasBox) {
    console.log(`📐 Canvas dimensions: ${canvasBox.width}x${canvasBox.height}`)
    if (canvasBox.width > 300 && canvasBox.height > 500) {
      console.log('✅ Canvas has good dimensions for mobile')
    } else {
      console.log('❌ Canvas dimensions seem too small')
    }
  }
  
  await browser.close()
  
  console.log('\n✨ Screenshot verification complete!')
}

verifyScreenshots().catch(console.error)
