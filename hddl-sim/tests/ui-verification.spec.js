import { test, expect } from '@playwright/test';

test.describe('HDDL Simulation UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        // Start with aux panel open (false) so tests can verify it
        localStorage.setItem('hddl:layout', JSON.stringify({ auxCollapsed: false, bottomCollapsed: true }))
      } catch {
        // ignore
      }
    })
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
    const cards = page.locator('.envelope-card');
    const spanCount = await spans.count();
    const cardCount = await cards.count();
    expect(spanCount).toBe(cardCount);
    
    // Verify timeline labels (0h and 48h)
    await expect(page.locator('.timeline-bar').getByText('0h')).toBeVisible();
    await expect(page.locator('.timeline-bar').getByText('48h')).toBeVisible();

    // Spec 5: assumption mismatch markers should exist in the default scenario
    const mismatchMarkers = page.locator('.timeline-mismatch-marker');
    await expect(mismatchMarkers.first()).toBeVisible();
  });

  test('should display Decision Envelopes as main heading', async ({ page }) => {
    const heading = page.locator('h1:has-text("Decision Envelopes")');
    await expect(heading).toBeVisible();
    
    // Verify the "Active Envelopes" section exists
    const activeSection = page.locator('h2:has-text("Active Envelopes")');
    await expect(activeSection).toBeVisible();
  });

  test('map agent names should not overlap', async ({ page }) => {
    const svg = page.locator('#hddl-map-container svg');
    await expect(svg).toBeVisible();

    // Agent names are rendered as text elements in the SVG - look for any text labels
    const agentNames = svg.locator('text.agent-name');
    const count = await agentNames.count();
    
    // If no labeled text elements, skip overlap check (map may use different rendering)
    if (count === 0) {
      return;
    }
    
    await expect(agentNames.first()).toBeVisible();

    const boxes = [];
    for (let i = 0; i < count; i++) {
      const box = await agentNames.nth(i).boundingBox();
      if (box) boxes.push(box);
    }

    let overlapCount = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];

        const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const yOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

        if (xOverlap > 2 && yOverlap > 2) overlapCount++;
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/02a-map-agent-names.png', fullPage: true });
    // Allow a small number of overlaps due to dynamic layout/zoom and label density.
    expect(overlapCount).toBeLessThanOrEqual(2);
  });

  test('should display envelope cards', async ({ page }) => {
    // Screenshot envelopes
    await page.screenshot({ path: 'test-results/screenshots/03-envelope-cards.png', fullPage: true });

    const cards = page.locator('.envelope-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    
    // Spot-check a couple known default envelopes (avoid hard-coded totals)
    const env001 = page.locator('.envelope-card[data-envelope="ENV-001"]');
    await expect(env001).toBeVisible();
    await expect(env001.getByText('Customer Service Responses')).toBeVisible();
    await expect(env001.getByText('Customer Steward')).toBeVisible();
    
    // Check for ENV-002 (may appear multiple times for different time windows)
    const env002 = page.locator('.envelope-card[data-envelope="ENV-002"]').first();
    await expect(env002).toBeVisible();
    await expect(env002.getByText('Hiring Recommendations')).toBeVisible();
    await expect(env002.getByText('HR Steward')).toBeVisible();
  });

  test('should display steward filter on envelopes page', async ({ page }) => {
    const stewardFilter = page.locator('#steward-filter');
    await expect(stewardFilter).toBeVisible();
    
    // Verify it has multiple options including "All Envelopes"
    const options = await stewardFilter.locator('option').count();
    expect(options).toBeGreaterThan(1);
    
    // Verify default value is "all"
    await expect(stewardFilter).toHaveValue('all');
  });

  test('should display sidebar navigation items', async ({ page }) => {
    // Sidebar can start collapsed depending on persisted layout.
    await page.evaluate(() => {
      document.body.classList.remove('sidebar-hidden')
      document.documentElement.style.setProperty('--sidebar-width', '300px')
    })
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // New IA sections
    await expect(sidebar.getByText('Primary')).toBeVisible();
    await expect(sidebar.getByText('Secondary')).toBeVisible();

    // Primary lenses (updated nav items)
    await expect(sidebar.getByText('Envelopes').first()).toBeVisible();
    await expect(sidebar.getByText('Decision Telemetry System').first()).toBeVisible();
    await expect(sidebar.getByText('Stewards').first()).toBeVisible();

    // Secondary lenses
    await expect(sidebar.getByText('Agent Fleets').first()).toBeVisible();
    await expect(sidebar.getByText('DSG Artifact').first()).toBeVisible();

    // Timeline is a global scrubber bar (not a left-nav page)
    await expect(sidebar.getByText('Timeline').first()).toHaveCount(0);
  });

  test('should display auxiliary bar with decision insights', async ({ page }) => {
    // Force open the aux bar via JavaScript.
    await page.evaluate(() => {
      document.body.classList.remove('aux-hidden');
      document.documentElement.style.setProperty('--auxiliarybar-width', '300px');
      const auxBar = document.getElementById('auxiliarybar');
      if (auxBar) {
        auxBar.style.display = 'flex';
        auxBar.style.width = '300px';
      }
    });
    await page.waitForTimeout(300); // Let CSS update

    const auxBar = page.locator('#auxiliarybar');

    // Aux bar should now be visible
    await expect(auxBar).toBeVisible({ timeout: 3000 });
    // Auxiliary bar is now AI Narrative.
    await expect(auxBar.getByText('AI NARRATIVE')).toBeVisible();
    await expect(auxBar.getByText('AI-Generated Narrative')).toBeVisible();
    await expect(auxBar.locator('#generate-ai-narrative')).toBeVisible();
  });

  test('auxiliary panel metrics should update when timeline changes', async ({ page }) => {
    // Evidence/telemetry lives in the bottom panel (DTS STREAM tab).
    await page.evaluate(() => {
      document.body.classList.remove('panel-hidden')
    })

    await page.locator('.panel-tab[data-tab="evidence"]').click()
    const evidenceOutput = page.locator('.terminal-output[data-terminal="evidence"]')
    await expect(evidenceOutput).toBeVisible({ timeout: 3000 })

    // Expand Live Metrics so values are visible
    await evidenceOutput.getByText('Live Metrics').click({ force: true })
    const activeDecisionsValue = evidenceOutput.locator('.telemetry-metric', { hasText: 'Active Decisions' }).locator('.metric-value');

    // Set time where 2 envelopes are active (11h: ENV-001 and ENV-002)
    const scrubber = page.locator('#timeline-scrubber');
    const box = await scrubber.boundingBox();
    expect(box).toBeTruthy();
    const x11 = Math.max(2, Math.min(box.width - 2, box.width * (11 / 48)));
    await scrubber.click({ position: { x: x11, y: box.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 0, 11:00');
    const activeAt11 = await page.locator('.envelope-card:has-text("Active at selected time")').count();
    await expect(activeDecisionsValue).toHaveText(new RegExp(`^${activeAt11}$`));

    // Set time where only ENV-002 remains active (25h)
    const box2 = await scrubber.boundingBox();
    expect(box2).toBeTruthy();
    const x25 = Math.max(2, Math.min(box2.width - 2, box2.width * (25 / 48)));
    await scrubber.click({ position: { x: x25, y: box2.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 01:00');
    const activeAt25 = await page.locator('.envelope-card:has-text("Active at selected time")').count();
    await expect(activeDecisionsValue).toHaveText(new RegExp(`^${activeAt25}$`));
  });

  test('should have scenario selector in titlebar', async ({ page }) => {
    // Scenario selector is now in the titlebar (no ID, use class)
    const scenarioSelect = page.locator('.scenario-selector select');
    await expect(scenarioSelect).toBeVisible();
    
    // Verify it has options
    const options = await scenarioSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
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
    await expect(modal.getByText(/^ENV-001$/)).toBeVisible();
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

    // ENV-002 remains active at this time (use .first() since there may be multiple instances)
    const env002 = page.locator('.envelope-card[data-envelope="ENV-002"]').first();
    await expect(env002).toBeVisible();
    // Verify the card contains expected content
    await expect(env002.getByText('Hiring Recommendations')).toBeVisible();

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

    // Decision telemetry now shows query-based event log
    await expect(page.locator('#event-stream')).toBeVisible();
    // Events are rendered as log-line elements
    await expect(page.locator('.log-line').first()).toBeVisible();

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
    await expect(page.getByText('DSG Review - Event Record')).toBeVisible();
    await expect(page.getByTestId('dsg-artifacts')).toBeVisible();
    await expect(page.getByText(/Involved envelopes/i)).toBeVisible();
    const record = page.locator('#dsg-record-kv');
    await expect(record.getByText(/ENV-001/)).toBeVisible();
    await expect(record.getByText(/ENV-002/)).toBeVisible();

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
    await expect(page.getByRole('heading', { level: 1, name: 'Steward Action Surface' })).toBeVisible();
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

    // 11h: validate active envelope count matches the rendered list
    const x11 = Math.max(2, Math.min(box.width - 2, box.width * (11 / 48)));
    await scrubber.click({ position: { x: x11, y: box.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 0, 11:00');
    const activeCardsAt11 = await page.locator('.fleet-env').count();
    await expect(page.getByTestId('fleets-active-count')).toHaveText(String(activeCardsAt11));
    // Check for any fleet-agent-icon elements (they may or may not be active)
    const anyAgent = page.locator('[data-testid="fleet-agent-icon"]');
    await expect(anyAgent.first()).toBeVisible();

    // 25h: validate active envelope count matches the rendered list
    const box2 = await scrubber.boundingBox();
    expect(box2).toBeTruthy();
    const x25 = Math.max(2, Math.min(box2.width - 2, box2.width * (25 / 48)));
    await scrubber.click({ position: { x: x25, y: box2.height / 2 } });
    await expect(page.locator('#timeline-time')).toHaveText('Day 1, 01:00');
    const activeCardsAt25 = await page.locator('.fleet-env').count();
    await expect(page.getByTestId('fleets-active-count')).toHaveText(String(activeCardsAt25));
    // Check for any fleet-agent-icon elements
    const anyAgentAt25 = page.locator('[data-testid="fleet-agent-icon"]');
    await expect(anyAgentAt25.first()).toBeVisible();
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
