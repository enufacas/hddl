import { chromium, devices } from '@playwright/test'

const iPhone12 = devices['iPhone 12']

async function debugMobileCanvas() {
  console.log('🔍 Debugging mobile canvas visibility...\n')
  
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...iPhone12,
    viewport: { width: 390, height: 844 }
  })
  
  const page = await context.newPage()
  
  // Navigate to home
  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')
  
  // Check what elements exist
  console.log('📋 Checking DOM elements:')
  
  const appExists = await page.locator('#app').count()
  console.log(`  #app: ${appExists > 0 ? '✅' : '❌'}`)
  
  const workbenchExists = await page.locator('.workbench').count()
  console.log(`  .workbench: ${workbenchExists > 0 ? '✅' : '❌'}`)
  
  const editorAreaExists = await page.locator('.editor-area').count()
  console.log(`  .editor-area: ${editorAreaExists > 0 ? '✅' : '❌'}`)
  
  const editorContainerExists = await page.locator('#editor-area').count()
  console.log(`  #editor-area: ${editorContainerExists > 0 ? '✅' : '❌'}`)
  
  const mapContainerExists = await page.locator('#hddl-map-container').count()
  console.log(`  #hddl-map-container: ${mapContainerExists > 0 ? '✅' : '❌'}`)
  
  const svgExists = await page.locator('#hddl-map-container svg').count()
  console.log(`  #hddl-map-container svg: ${svgExists > 0 ? '✅' : '❌'}`)
  
  // Check dimensions
  if (appExists > 0) {
    const appBox = await page.locator('#app').boundingBox()
    console.log(`\n📐 #app dimensions: ${appBox ? `${appBox.width}x${appBox.height}` : 'NO BOUNDING BOX'}`)
  }
  
  if (editorAreaExists > 0) {
    const editorBox = await page.locator('.editor-area').boundingBox()
    console.log(`📐 .editor-area dimensions: ${editorBox ? `${editorBox.width}x${editorBox.height}` : 'NO BOUNDING BOX'}`)
  }
  
  if (editorContainerExists > 0) {
    const containerBox = await page.locator('#editor-area').boundingBox()
    console.log(`📐 #editor-area dimensions: ${containerBox ? `${containerBox.width}x${containerBox.height}` : 'NO BOUNDING BOX'}`)
  }
  
  if (mapContainerExists > 0) {
    const mapBox = await page.locator('#hddl-map-container').boundingBox()
    console.log(`📐 #hddl-map-container dimensions: ${mapBox ? `${mapBox.width}x${mapBox.height}` : 'NO BOUNDING BOX'}`)
    
    // Check computed styles
    const mapStyles = await page.locator('#hddl-map-container').evaluate(el => ({
      display: window.getComputedStyle(el).display,
      visibility: window.getComputedStyle(el).visibility,
      opacity: window.getComputedStyle(el).opacity,
      height: window.getComputedStyle(el).height,
      overflow: window.getComputedStyle(el).overflow
    }))
    console.log(`📐 #hddl-map-container styles:`, mapStyles)
  }
  
  if (svgExists > 0) {
    const svgBox = await page.locator('#hddl-map-container svg').boundingBox()
    console.log(`📐 svg dimensions: ${svgBox ? `${svgBox.width}x${svgBox.height}` : 'NO BOUNDING BOX'}`)
  }
  
  // Check if elements are in viewport
  if (mapContainerExists > 0) {
    const inViewport = await page.locator('#hddl-map-container').isVisible()
    console.log(`\n👁️ #hddl-map-container visible in viewport: ${inViewport ? '✅' : '❌'}`)
  }
  
  // Take a screenshot
  await page.screenshot({ 
    path: 'test-results/screenshots/debug-mobile.png',
    fullPage: true
  })
  console.log('\n📸 Full page screenshot saved to test-results/screenshots/debug-mobile.png')
  
  await browser.close()
}

debugMobileCanvas().catch(console.error)
