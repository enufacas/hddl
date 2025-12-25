import { test, expect } from '@playwright/test';

test.describe('HDDL Simulation UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial load
    await page.screenshot({ path: 'test-results/screenshots/01-initial-load.png', fullPage: true });
  });

  test('should have timeline scrubber at top of page', async ({ page }) => {
    // Check timeline bar exists and is positioned at top
    const timelineBar = page.locator('[data-testid="timeline-bar"]');
    await expect(timelineBar).toBeVisible();
    
    // Screenshot timeline
    await page.screenshot({ path: 'test-results/screenshots/02-timeline-scrubber.png', fullPage: true });
    
    // Verify timeline controls are present
    await expect(page.locator('.timeline-bar button').first()).toBeVisible(); // Play button
    await expect(page.locator('.timeline-bar select')).toBeVisible(); // Speed selector
    
    // Check time display is present - use .first() to handle duplicates
    const timeDisplay = page.locator('#timeline-time');
    await expect(timeDisplay).toBeVisible();

    // Envelope span overlay should render windows for each envelope
    const spans = page.locator('.timeline-envelope-span');
    await expect(spans).toHaveCount(6);
    
    // Verify timeline labels (0h and 48h)
    await expect(page.locator('.timeline-bar').getByText('0h')).toBeVisible();
    await expect(page.locator('.timeline-bar').getByText('48h')).toBeVisible();
  });

  test('should display Decision Envelopes as main heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Decision Envelopes")');
    await expect(heading).toBeVisible();
    
    const subtitle = page.locator('text=Active envelopes ready for simulation replay');
    await expect(subtitle).toBeVisible();
  });

  test('should display all six envelope cards', async ({ page }) => {
    // Screenshot envelopes
    await page.screenshot({ path: 'test-results/screenshots/03-envelope-cards.png', fullPage: true });
    
    // Check for ENV-001
    const env001 = page.locator('.envelope-card[data-envelope="ENV-001"]');
    await expect(env001).toBeVisible();
    await expect(env001.getByText('Customer Service Responses')).toBeVisible();
    await expect(env001.getByText('Customer Steward')).toBeVisible();
    
    // Check for ENV-002
    const env002 = page.locator('.envelope-card[data-envelope="ENV-002"]');
    await expect(env002).toBeVisible();
    await expect(env002.getByText('Hiring Recommendations')).toBeVisible();
    await expect(env002.getByText('HR Steward')).toBeVisible();
    
    // Check for ENV-003
    const env003 = page.locator('.envelope-card[data-envelope="ENV-003"]');
    await expect(env003).toBeVisible();
    await expect(env003.getByText('Pricing Adjustments')).toBeVisible();
    await expect(env003.getByText('Domain Engineer')).toBeVisible();

    // Check for ENV-004
    const env004 = page.locator('.envelope-card[data-envelope="ENV-004"]');
    await expect(env004).toBeVisible();
    await expect(env004.getByText('Fraud Triage')).toBeVisible();
    await expect(env004.getByText('Resiliency Steward')).toBeVisible();

    // Check for ENV-005
    const env005 = page.locator('.envelope-card[data-envelope="ENV-005"]');
    await expect(env005).toBeVisible();
    await expect(env005.getByText('Inventory Rebalance')).toBeVisible();
    await expect(env005.getByText('Business Domain Steward')).toBeVisible();

    // Check for ENV-006
    const env006 = page.locator('.envelope-card[data-envelope="ENV-006"]');
    await expect(env006).toBeVisible();
    await expect(env006.getByText('Marketing Offers')).toBeVisible();
    await expect(env006.getByText('Sales Steward')).toBeVisible();
  });

  test('should display persona selector with Domain Engineer', async ({ page }) => {
    const personaSelector = page.locator('select').filter({ hasText: /Domain Engineer/ });
    await expect(personaSelector).toBeVisible();
    
    // Verify it has multiple options
    const options = await personaSelector.locator('option').count();
    expect(options).toBeGreaterThan(1);
  });

  test('should display sidebar navigation items', async ({ page }) => {
    // Check Simulation View section
    const sidebar = page.locator('.sidebar');
    await expect(sidebar.getByText('Simulation View')).toBeVisible();
    await expect(sidebar.getByText('Decision Envelopes').first()).toBeVisible();
    
    // Timeline is a global scrubber bar (not a left-nav page)
    await expect(sidebar.getByText('Timeline Scrubber')).toHaveCount(0);
    await expect(sidebar.getByText('Authority View')).toHaveCount(0);
    await expect(sidebar.getByText('Signals & Outcomes')).toBeVisible();
    await expect(sidebar.getByText('Steward Agent Fleets')).toBeVisible();
    
    // Check Key Events section
    await expect(sidebar.getByText('Key Events')).toBeVisible();
    await expect(sidebar.getByText('DSG Review')).toBeVisible();
    await expect(sidebar.getByText('Steward Actions')).toBeVisible();

    // Steward Fleets panel
    await expect(sidebar.getByText('Steward Fleets')).toBeVisible();
  });

  test('should display auxiliary bar with decision insights', async ({ page }) => {
    const auxBar = page.locator('#auxiliarybar');
    await expect(auxBar).toBeVisible();
    
    // Check for Decision Insights sections
    await expect(auxBar.getByText('LIVE METRICS')).toBeVisible();
    await expect(auxBar.getByText('DECISION QUALITY')).toBeVisible();
    await expect(auxBar.getByText('STEWARDSHIP')).toBeVisible();
    
    // Check for metric labels (values are time-driven)
    await expect(auxBar.getByText('ACTIVE DECISIONS')).toBeVisible();
    await expect(auxBar.getByText('ENVELOPE HEALTH')).toBeVisible();
    await expect(auxBar.getByText('DRIFT ALERTS')).toBeVisible();

    // Sanity check: each of these metrics has a non-empty value
    await expect(auxBar.locator('.telemetry-metric', { hasText: 'Active Decisions' }).locator('.metric-value')).toHaveText(/\d+/);
    await expect(auxBar.locator('.telemetry-metric', { hasText: 'Envelope Health' }).locator('.metric-value')).toHaveText(/\d+%/);
    await expect(auxBar.locator('.telemetry-metric', { hasText: 'Drift Alerts' }).locator('.metric-value')).toHaveText(/\d+/);
  });

  test('auxiliary panel metrics should update when timeline changes', async ({ page }) => {
    const auxBar = page.locator('#auxiliarybar');
    await expect(auxBar).toBeVisible();

    const activeDecisionsValue = auxBar.locator('.telemetry-metric', { hasText: 'Active Decisions' }).locator('.metric-value');

    // Set time where 2 envelopes are active (11h: ENV-001 and ENV-002)
    const scrubber = page.locator('#timeline-scrubber');
    const box = await scrubber.boundingBox();
    expect(box).toBeTruthy();
    const x11 = Math.max(2, Math.min(box.width - 2, box.width * (11 / 48)));
    await scrubber.click({ position: { x: x11, y: box.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 0, 11:00');
    await expect(activeDecisionsValue).toHaveText('2');

    // Set time where no envelopes are active (25h)
    const box2 = await scrubber.boundingBox();
    expect(box2).toBeTruthy();
    const x25 = Math.max(2, Math.min(box2.width - 2, box2.width * (25 / 48)));
    await scrubber.click({ position: { x: x25, y: box2.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 01:00');
    await expect(activeDecisionsValue).toHaveText('0');
  });

  test('should display Load Simulation Scenario buttons', async ({ page }) => {
    const actions = page.getByTestId('timeline-actions');
    await expect(actions).toBeVisible();
    await expect(actions.getByRole('button', { name: /Import events/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Add random events/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Add random envelope/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Clear & reset/i })).toBeVisible();
  });

  test('should open envelope detail modal when clicking envelope card', async ({ page }) => {
    // Screenshot before clicking
    await page.screenshot({ path: 'test-results/screenshots/04-before-modal.png', fullPage: true });
    
    // Wait for cards to be rendered and event handlers attached
    await page.waitForTimeout(500);
    
    // Trigger click using JavaScript to bypass overlays
    await page.evaluate(() => {
      const card = document.querySelector('.envelope-card[data-envelope="ENV-001"]');
      if (card) {
        card.click();
      }
    });
    
    // Wait for modal to appear
    await page.waitForSelector('.envelope-detail-modal', { timeout: 5000 });
    
    // Screenshot modal
    await page.screenshot({ path: 'test-results/screenshots/05-modal-open.png', fullPage: true });
    
    // Verify modal content
    const modal = page.locator('.envelope-detail-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('ENV-001')).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Customer Service Responses' })).toBeVisible();
    
    // Check for sections in modal - use heading role to be specific
    await expect(modal.getByRole('heading', { name: /Assumptions/i })).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Constraints/i })).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Signal Health/i })).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Revision History/i })).toBeVisible();
    
    // Close modal
    await modal.getByRole('button').first().click();
    await expect(modal).not.toBeVisible();
  });

  test('should have interactive timeline scrubber', async ({ page }) => {
    // Timeline scrubber should update time when clicked
    const scrubber = page.locator('#timeline-scrubber');
    await expect(scrubber).toBeVisible();

    const box = await scrubber.boundingBox();
    expect(box).toBeTruthy();
    const width = box.width;
    const height = box.height;

    // Click to set time near 34h (signal point in default scenario)
    const x = Math.max(2, Math.min(width - 2, width * (34 / 48)));
    await scrubber.click({ position: { x, y: height / 2 } });

    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 10:00');

    // ENV-003 should become active after 30h
    const env003 = page.locator('.envelope-card[data-envelope="ENV-003"]');
    await expect(env003).toBeVisible();
    await expect(env003.getByText('Active at selected time')).toBeVisible();

    // Play button should still toggle
    const playButton = page.locator('#timeline-play');
    await playButton.click();
    // Should advance time while playing
    await page.waitForTimeout(550);
    await expect(page.locator('#timeline-time')).not.toHaveText('Day 1, 10:00');
  });

  test('Signals page should reflect selected time and show scenario events', async ({ page }) => {
    // Set time to 34h on home
    const scrubber = page.locator('#timeline-scrubber');
    const box = await scrubber.boundingBox();
    expect(box).toBeTruthy();
    const x = Math.max(2, Math.min(box.width - 2, box.width * (34 / 48)));
    await scrubber.click({ position: { x, y: box.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 10:00');

    // Navigate to Signals & Outcomes
    await Promise.all([
      page.waitForURL('**/decision-telemetry', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/decision-telemetry"]').click();
      })
    ]);

    await expect(page.locator('#signals-time')).toHaveText('Day 1, 10:00');
    await expect(page.getByText('ENV-003: Pricing Adjustments')).toBeVisible();
    await expect(page.getByText('Signal divergence detected')).toBeVisible();
    await expect(page.getByText('Assumption Link')).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/11-signals-feed-cycle-a.png', fullPage: true });
  });

  test('DSG Review page should reflect selected time and show event record + artifacts', async ({ page }) => {
    // Set time to before DSG session (37h)
    const scrubber = page.locator('#timeline-scrubber');
    const box = await scrubber.boundingBox();
    expect(box).toBeTruthy();
    const xBefore = Math.max(2, Math.min(box.width - 2, box.width * (37 / 48)));
    await scrubber.click({ position: { x: xBefore, y: box.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 13:00');

    // Navigate to DSG Review
    await Promise.all([
      page.waitForURL('**/dsg-event', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/dsg-event"]').click();
      })
    ]);

    await expect(page.locator('[data-testid="dsg-page"]')).toBeVisible();
    await expect(page.getByText('No DSG session at selected time')).toBeVisible();
    await expect(page.locator('#dsg-time')).toHaveText('Day 1, 13:00');

    // Advance time past DSG messages (39h)
    const box2 = await scrubber.boundingBox();
    expect(box2).toBeTruthy();
    const xAfter = Math.max(2, Math.min(box2.width - 2, box2.width * (39 / 48)));
    await scrubber.click({ position: { x: xAfter, y: box2.height / 2 } });

    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 15:00');
    await expect(page.locator('#dsg-time')).toHaveText('Day 1, 15:00');

    // Event record should be visible and reference involved envelopes
    await expect(page.getByText('DSG Review — Event Record')).toBeVisible();
    await expect(page.getByTestId('dsg-artifacts')).toBeVisible();
    await expect(page.getByText(/Involved envelopes/i)).toBeVisible();
    const record = page.locator('#dsg-record-kv');
    await expect(record.getByText(/ENV-003/)).toBeVisible();
    await expect(record.getByText(/ENV-006/)).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/12-dsg-replay-cycle-a.png', fullPage: true });
  });

  test('should navigate to different pages from sidebar', async ({ page }) => {
    // Screenshot sidebar
    await page.screenshot({ path: 'test-results/screenshots/06-sidebar-nav.png', fullPage: true });
    
    // Navigate to Signals & Outcomes
    await Promise.all([
      page.waitForURL('**/decision-telemetry', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/decision-telemetry"]').click();
      })
    ]);
    await page.screenshot({ path: 'test-results/screenshots/07-signals-page.png', fullPage: true });

    // Navigate to Steward Agent Fleets
    await Promise.all([
      page.waitForURL('**/steward-fleets', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/steward-fleets"]').click();
      })
    ]);
    await page.screenshot({ path: 'test-results/screenshots/08-fleets-page.png', fullPage: true });

    // Navigate to Steward Actions
    await Promise.all([
      page.waitForURL('**/stewardship', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/stewardship"]').click();
      })
    ]);
    await expect(page.getByRole('heading', { level: 1, name: 'Steward Actions' })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/09-stewardship-page.png', fullPage: true });
    
    // Navigate back to home - wait for the page to actually change
    await page.evaluate(() => {
      document.querySelector('.sidebar [data-route="/"]').click();
    });
    await page.waitForURL('**/', { timeout: 5000 });
    await expect(page).toHaveURL(/\/$/);
    
    // Screenshot back to home
    await page.screenshot({ path: 'test-results/screenshots/10-back-home.png', fullPage: true });
  });

  test('Steward Agent Fleets page should update when timeline changes', async ({ page }) => {
    // Go to fleets view
    await Promise.all([
      page.waitForURL('**/steward-fleets', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/steward-fleets"]').click();
      })
    ]);
    await expect(page.getByRole('heading', { level: 1, name: 'Steward Agent Fleets' })).toBeVisible();
    await expect(page.getByTestId('fleets-page')).toBeVisible();

    const scrubber = page.locator('#timeline-scrubber');
    const box = await scrubber.boundingBox();
    expect(box).toBeTruthy();

    // 11h: two envelopes active (ENV-001 and ENV-002)
    const x11 = Math.max(2, Math.min(box.width - 2, box.width * (11 / 48)));
    await scrubber.click({ position: { x: x11, y: box.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 0, 11:00');
    await expect(page.getByTestId('fleets-active-count')).toHaveText('2');
    const anyActiveAgent = page.locator('[data-testid="fleet-agent-icon"].active');
    await expect(anyActiveAgent.first()).toBeVisible();

    // 25h: no envelopes active
    const box2 = await scrubber.boundingBox();
    expect(box2).toBeTruthy();
    const x25 = Math.max(2, Math.min(box2.width - 2, box2.width * (25 / 48)));
    await scrubber.click({ position: { x: x25, y: box2.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 01:00');
    await expect(page.getByTestId('fleets-active-count')).toHaveText('0');
    await expect(page.locator('[data-testid="fleet-agent-icon"].active')).toHaveCount(0);
  });

  test('should have status bar with live clock', async ({ page }) => {
    const statusBar = page.locator('.statusbar');
    await expect(statusBar).toBeVisible();
    
    // Check for connection status
    await expect(statusBar.getByText('Connected')).toBeVisible();
    
    // Check for version info
    await expect(statusBar.getByText(/Simulation v/)).toBeVisible();
    
    // Check for clock - should have time format HH:MM:SS
    const clock = statusBar.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/');
    await expect(clock).toBeVisible();
  });

  test('should display hover effects on envelope cards', async ({ page }) => {
    const envCard = page.locator('.envelope-card[data-envelope="ENV-001"]');
    
    // Force hover to bypass overlays
    await envCard.hover({ force: true });
    
    // Card should be visible and clickable
    await expect(envCard).toBeVisible();
    await expect(envCard).toHaveCSS('cursor', 'pointer');
  });

  test('should have proper layout structure', async ({ page }) => {
    // Verify main layout components are in correct order
    const titlebar = page.locator('.titlebar');
    const timelineBar = page.locator('.timeline-bar');
    const workbench = page.locator('.workbench');
    const statusbar = page.locator('.statusbar');
    
    await expect(titlebar).toBeVisible();
    await expect(timelineBar).toBeVisible();
    await expect(workbench).toBeVisible();
    await expect(statusbar).toBeVisible();
    
    // Verify timeline bar appears above workbench by checking bounding boxes
    const timelineBox = await timelineBar.boundingBox();
    const workbenchBox = await workbench.boundingBox();
    
    expect(timelineBox.y).toBeLessThan(workbenchBox.y);
  });
});
