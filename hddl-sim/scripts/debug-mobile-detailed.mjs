import { chromium, devices } from '@playwright/test'

const iPhone12 = devices['iPhone 12']

async function debugDetailed() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...iPhone12,
    viewport: { width: 390, height: 844 }
  })
  
  const page = await context.newPage()
  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')
  
  // Check all parts
  const parts = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('.part').forEach(el => {
      const rect = el.getBoundingBox()
      const styles = window.getComputedStyle(el)
      results.push({
        class: el.className,
        display: styles.display,
        width: styles.width,
        gridColumn: styles.gridColumn,
        box: rect ? `${rect.width}x${rect.height}` : 'no box'
      })
    })
    return results
  })
  
  console.log('📦 All .part elements:')
  parts.forEach(p => console.log(`  ${p.class}:`, p))
  
  // Check workbench grid
  const workbench = await page.evaluate(() => {
    const el = document.querySelector('.workbench')
    const styles = window.getComputedStyle(el)
    return {
      display: styles.display,
      gridTemplateColumns: styles.gridTemplateColumns,
      gridTemplateRows: styles.gridTemplateRows,
      width: styles.width,
      height: styles.height
    }
  })
  
  console.log('\n🏗️ .workbench grid:', workbench)
  
  await browser.close()
}

debugDetailed().catch(console.error)
