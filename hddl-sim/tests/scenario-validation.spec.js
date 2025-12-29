import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * SCENARIO VALIDATION TESTS
 * 
 * Integration tests that run analysis scripts to validate scenario data quality.
 * These tests protect against data regressions and ensure scenarios meet HDDL spec.
 * 
 * Uses: analysis/scenario-analysis.mjs (conformance checking)
 */

test.describe('Scenario Data Validation', () => {
  
  test.skip('test-minimal scenario passes conformance', () => {
    const output = execSync('node analysis/scenario-analysis.mjs test-minimal', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    // Should not have critical errors
    expect(output).not.toContain('❌ Error loading scenario');
    expect(output).toContain('test-minimal');
    
    // Should validate structure
    const hasStructure = output.includes('Part 1') || output.includes('Scenario');
    expect(hasStructure).toBeTruthy();
  });

  test.skip('default scenario passes conformance', () => {
    const output = execSync('node analysis/scenario-analysis.mjs default', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    // Should not have critical errors
    expect(output).not.toContain('❌ Error loading scenario');
    expect(output).toContain('default');
  });

  test.skip('insurance-underwriting scenario passes conformance', () => {
    const output = execSync('node analysis/scenario-analysis.mjs insurance-underwriting', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    // Should not have critical errors
    expect(output).not.toContain('❌ Error loading scenario');
    expect(output).toContain('insurance-underwriting');
    
    // Should have particle flow validation
    expect(output).toContain('Particle Flow Validation') || expect(output).toContain('Part 8');
  });

  test.skip('conformance script validates all scenarios', () => {
    const output = execSync('npm run conformance', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 30000 // 30 seconds
    });
    
    // Canon registry should validate
    expect(output).toContain('[OK] Canon Registry validated');
    
    // At least some scenarios should be validated
    expect(output).toContain('scenario.json');
  });
});

test.describe('Scenario Loading in Browser', () => {
  
  test('test-minimal loads without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/?scenario=test-minimal');
    await page.waitForLoadState('networkidle');
    
    // No console errors
    expect(errors).toHaveLength(0);
    
    // Map should render
    await expect(page.locator('#hddl-map-container')).toBeVisible();
  });

  test('invalid scenario falls back gracefully', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/?scenario=nonexistent-scenario-12345');
    await page.waitForLoadState('networkidle');
    
    // Should still render something (fallback to default)
    await expect(page.locator('#hddl-map-container')).toBeVisible();
  });

  test('scenario selector shows all available scenarios', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find scenario selector
    const selector = page.locator('#scenario-select, select[data-testid="scenario-selector"]');
    
    if (await selector.count() > 0) {
      const options = await selector.locator('option').allTextContents();
      
      // Should have multiple scenarios
      expect(options.length).toBeGreaterThan(5);
      
      // Should include test-minimal
      const hasTestMinimal = options.some(opt => opt.includes('Test Minimal'));
      expect(hasTestMinimal).toBeTruthy();
    }
  });
});
