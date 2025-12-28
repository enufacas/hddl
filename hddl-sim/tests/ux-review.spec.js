import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function safeFileSegment(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'step'
}

async function captureStep(page, outDir, step) {
  const slug = safeFileSegment(`${String(step.index).padStart(2, '0')}-${step.id}`)

  const screenshotPath = path.join(outDir, 'screenshots', `${slug}.png`)
  const htmlPath = path.join(outDir, 'dom', `${slug}.html`)
  const a11yPath = path.join(outDir, 'a11y', `${slug}.json`)

  await page.screenshot({ path: screenshotPath, fullPage: true })

  const html = await page.content()
  fs.writeFileSync(htmlPath, html, 'utf8')

  let a11y = null
  try {
    if (page.accessibility && typeof page.accessibility.snapshot === 'function') {
      a11y = await page.accessibility.snapshot({ interestingOnly: true })
    }
  } catch {
    a11y = null
  }
  fs.writeFileSync(a11yPath, JSON.stringify({ available: Boolean(a11y), snapshot: a11y }, null, 2), 'utf8')

  const context = await page.evaluate(() => {
    const time = document.querySelector('#timeline-time')?.textContent || null
    const stewardFilter = document.querySelector('#steward-filter')?.value || null
    const storyMode = document.querySelector('#timeline-story-mode')?.checked ?? null

    // crude visible-text sample (for quick AI inspection without images)
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .map(h => (h.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 20)

    const nav = Array.from(document.querySelectorAll('.sidebar [data-route]'))
      .map(el => (el.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 30)

    return {
      url: window.location.href,
      path: window.location.pathname,
      timelineTime: time,
      stewardFilter,
      storyMode,
      headings,
      nav,
    }
  })

  return {
    ...step,
    capturedAt: new Date().toISOString(),
    files: {
      screenshot: screenshotPath,
      html: htmlPath,
      a11y: a11yPath,
    },
    context,
  }
}

test.describe('AI-led UX review harness', () => {
  test('generate outside-in review bundle', async ({ page }) => {
    // Force a consistent layout for captures.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('hddl:layout', JSON.stringify({ auxCollapsed: true, bottomCollapsed: true }))
        localStorage.setItem('hddl:storyMode', 'false')
        localStorage.setItem('hddl:uxReview', JSON.stringify({ enabled: false, notes: [] }))
      } catch {
        // ignore
      }
    })

    const root = path.join(process.cwd(), 'review', 'artifacts')
    const runId = `run-${Date.now()}`
    const outDir = path.join(root, runId)

    mkdirp(path.join(outDir, 'screenshots'))
    mkdirp(path.join(outDir, 'dom'))
    mkdirp(path.join(outDir, 'a11y'))

    const steps = []

    // Step 1: Home
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="timeline-bar"]')).toBeVisible()
    steps.push(await captureStep(page, outDir, { index: 1, id: 'home', intent: 'First impression (authority + time control)' }))

    // Step 1b: Capture Map Animation Sequence
    // Play for a few seconds and capture frames to verify animation/stability
    const playBtn = page.locator('#timeline-play')
    await playBtn.click()
    
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1000) // Wait 1s
      const time = await page.locator('#timeline-time').innerText()
      steps.push(await captureStep(page, outDir, { 
        index: 1, 
        id: `home-map-frame-${i}`, 
        intent: `Verify map animation stability at ${time}`,
        time 
      }))
    }
    await playBtn.click() // Pause

    // Step 1c: Capture Map Lifecycle
    // Scrub through the timeline to see how the map evolves
    const scrubber = page.locator('#timeline-scrubber')
    const box = await scrubber.boundingBox()
    if (box) {
      // Capture every 4 hours to get a good spread of the lifecycle
      for (let h = 0; h <= 48; h += 4) {
        const x = Math.max(2, Math.min(box.width - 2, box.width * (h / 48)))
        await scrubber.click({ position: { x, y: box.height / 2 } })
        // Wait for D3 simulation to tick a bit and settle
        await page.waitForTimeout(800) 
        const time = await page.locator('#timeline-time').innerText()
        steps.push(await captureStep(page, outDir, { 
          index: 1, 
          id: `map-lifecycle-${String(h).padStart(2, '0')}h`, 
          intent: `Observe map state at ${time}`,
          time 
        }))
      }
    }

    // Step 2: Story Mode has been removed from UI - skip
    // Previously: await page.locator('#timeline-story-mode').setChecked(true)
    steps.push({ index: 2, id: 'home-story-mode', intent: 'Story Mode removed from UI - skipped', skipped: true })

    // Step 3: Scrub to drift window (~34h)
    // Reuse scrubber locator from Step 1c
    const box3 = await scrubber.boundingBox()
    expect(box3).toBeTruthy()
    const timeBefore34 = await page.locator('#timeline-time').innerText()
    const x34 = Math.max(2, Math.min(box3.width - 2, box3.width * (34 / 48)))
    await scrubber.click({ position: { x: x34, y: box3.height / 2 } })
    await expect(page.locator('#timeline-time')).not.toHaveText(timeBefore34)
    const timeAt34ish = await page.locator('#timeline-time').innerText()
    steps.push(await captureStep(page, outDir, { index: 3, id: 'home-scrub-34h', intent: 'Can I tell what changed at this time?', time: timeAt34ish }))

    // Step 4: Evidence page at same time
    await Promise.all([
      page.waitForURL('**/decision-telemetry', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/decision-telemetry"]')?.click()
      })
    ])
    // Decision telemetry now shows query-based event log
    await expect(page.locator('#event-stream')).toBeVisible();
    steps.push(await captureStep(page, outDir, { index: 4, id: 'evidence-34h', intent: 'Do signals explain what is happening and why?', time: timeAt34ish }))

    // Step 5: Jump to after DSG revisions (~40h)
    const box2 = await scrubber.boundingBox()
    expect(box2).toBeTruthy()
    const timeBefore40 = await page.locator('#timeline-time').innerText()
    const x40 = Math.max(2, Math.min(box2.width - 2, box2.width * (40 / 48)))
    await scrubber.click({ position: { x: x40, y: box2.height / 2 } })
    await expect(page.locator('#timeline-time')).not.toHaveText(timeBefore40)
    const timeAt40ish = await page.locator('#timeline-time').innerText()
    steps.push(await captureStep(page, outDir, { index: 5, id: 'evidence-40h', intent: 'Does the UI show authority changed via revision and mismatches remain legible?', time: timeAt40ish }))

    // Step 6: DSG artifact page
    await Promise.all([
      page.waitForURL('**/dsg-event', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/dsg-event"]')?.click()
      })
    ])
    steps.push(await captureStep(page, outDir, { index: 6, id: 'dsg-40h', intent: 'Is DSG shown as an artifact output (not a meeting UI)?', time: timeAt40ish }))

    // Step 7: Back home and try forbidden expansion
    await Promise.all([
      page.waitForURL('**/', { timeout: 5000 }),
      page.evaluate(() => {
        document.querySelector('.sidebar [data-route="/"]')?.click()
      })
    ])

    // Ensure Story Mode is on so the demo button is visible.
    // Story Mode has been removed from UI - try to find the demo button without it
    const tryPrimaryBtn = page.getByRole('button', { name: /Try expand authority/i })
    const btnVisible = await tryPrimaryBtn.isVisible().catch(() => false)
    if (btnVisible) {
      await tryPrimaryBtn.click()
      steps.push(await captureStep(page, outDir, { index: 7, id: 'try-expand-authority', intent: 'Does refusal teach the core concept clearly?' }))
    } else {
      steps.push({ index: 7, id: 'try-expand-authority', intent: 'Demo button not visible without Story Mode - skipped', skipped: true })
    }

    const run = {
      runId,
      createdAt: new Date().toISOString(),
      baseURL: page.url().split('/').slice(0, 3).join('/'),
      steps,
      reviewerPrompt: {
        goal: 'Critique the sim as a naive user using only what is visible in screenshots + captured headings/nav/a11y.',
        rubric: [
          'What is this product? (within 10 seconds)',
          'What can I do next? (within 20 seconds)',
          'Meaning of key labels (Envelope, Evidence, Revision, DSG, Boundary Interaction)',
          'Does time control explain itself?',
          'Can I explain why something was refused?',
          'Can I explain how authority changes?',
          'Where did I feel lost and why?',
        ],
        outputSchema: {
          findings: 'Array<{ severity: "blocker"|"major"|"minor", category: string, observation: string, whyConfusing: string, suggestedFix: string, stepId: string }>',
          top3: 'Array<{ observation: string, suggestedFix: string, stepId: string }>'
        }
      }
    }

    fs.writeFileSync(path.join(outDir, 'run.json'), JSON.stringify(run, null, 2), 'utf8')
    fs.writeFileSync(path.join(outDir, 'review-prompt.md'), `# AI-led UX Review Prompt\n\nUse the screenshots and run.json context to produce findings.\n\n${JSON.stringify(run.reviewerPrompt, null, 2)}\n`, 'utf8')

    // Also keep a convenient pointer.
    fs.writeFileSync(path.join(root, 'latest.txt'), outDir, 'utf8')

    test.info().attach('run.json', { path: path.join(outDir, 'run.json'), contentType: 'application/json' })
  })
})
