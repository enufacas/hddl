// Script to generate mobile screenshots
import { chromium, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = 'test-results/screenshots';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch();
  
  const scenarios = [
    {
      name: 'iPhone-12-Home',
      device: devices['iPhone 12'],
      actions: async (page) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
      }
    },
    {
      name: 'iPhone-12-Sidebar-Open',
      device: devices['iPhone 12'],
      actions: async (page) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        await page.click('.mobile-hamburger');
        await page.waitForTimeout(500);
      }
    },
    {
      name: 'iPhone-12-Bottom-Sheet-Expanded',
      device: devices['iPhone 12'],
      actions: async (page) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        await page.click('.mobile-bottom-sheet-handle');
        await page.waitForTimeout(500);
      }
    },
    {
      name: 'iPhone-12-Panel-Modal',
      device: devices['iPhone 12'],
      actions: async (page) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        await page.click('.mobile-panel-fab');
        await page.waitForTimeout(500);
      }
    },
    {
      name: 'iPad-Tablet-View',
      device: devices['iPad (gen 7)'],
      actions: async (page) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
      }
    },
    {
      name: 'iPhone-12-Landscape',
      device: { ...devices['iPhone 12'], viewport: { width: 844, height: 390 } },
      actions: async (page) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`📸 Capturing: ${scenario.name}`);
    
    const context = await browser.newContext({
      ...scenario.device,
    });
    
    const page = await context.newPage();
    
    try {
      await scenario.actions(page);
      
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${scenario.name}.png`);
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      
      console.log(`✅ Saved: ${screenshotPath}`);
    } catch (error) {
      console.error(`❌ Failed to capture ${scenario.name}:`, error.message);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n🎉 All screenshots captured!');
  console.log(`📁 Location: ${path.resolve(SCREENSHOTS_DIR)}`);
}

captureScreenshots().catch(console.error);
