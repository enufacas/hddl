# Testing GitHub Pages SPA Routing

This document describes how to verify that all client-side routes work correctly on GitHub Pages.

## Local Development Testing

1. Start the dev server:
   ```bash
   cd hddl-sim
   npm run dev
   ```

2. Test navigation to different routes:
   - http://localhost:5173/
   - http://localhost:5173/specification
   - http://localhost:5173/authority
   - http://localhost:5173/steward-fleets
   - http://localhost:5173/decision-telemetry
   - http://localhost:5173/dsg-event

3. Verify that:
   - All routes load without errors
   - Browser back/forward buttons work correctly
   - Refreshing the page stays on the same route

## Production Build Testing

1. Build the project:
   ```bash
   cd hddl-sim
   npm run build
   ```

2. Verify 404.html was created:
   ```bash
   ls -la dist/404.html dist/index.html
   diff dist/404.html dist/index.html  # Should be identical
   ```

3. Preview the production build locally:
   ```bash
   npm run preview
   ```

4. Test the same routes as above (with the preview server port)

## GitHub Pages Testing (Post-Deployment)

### Test 1: First-time visitor (incognito mode)

1. Open an incognito/private browser window
2. Navigate directly to these URLs:
   - https://enufacas.github.io/hddl/
   - https://enufacas.github.io/hddl/specification
   - https://enufacas.github.io/hddl/authority
   - https://enufacas.github.io/hddl/steward-fleets
   - https://enufacas.github.io/hddl/decision-telemetry
   - https://enufacas.github.io/hddl/dsg-event

**Expected**: All routes should load the app correctly, not a GitHub Pages 404 error page.

### Test 2: Hard refresh

1. Navigate to any route (e.g., https://enufacas.github.io/hddl/specification)
2. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) for a hard refresh
3. Verify the page still loads correctly

### Test 3: curl test

```bash
# Test root
curl -I https://enufacas.github.io/hddl/

# Test deep link
curl -I https://enufacas.github.io/hddl/specification
```

**Expected**: Both should return 200 OK or at least serve HTML content (not a 404 error page).

Note: GitHub Pages will technically return a 404 status for the deep link, but it will serve the 404.html content which is our SPA shell. The important thing is that the HTML content is served, not a GitHub Pages error message.

### Test 4: Social media / link sharing

1. Share a deep link (e.g., https://enufacas.github.io/hddl/specification) on social media or messaging apps
2. Click the link from the shared location
3. Verify it loads correctly

### Test 5: Browser back/forward

1. Navigate through several routes using the sidebar
2. Use browser back button - should go back through history
3. Use browser forward button - should move forward through history
4. Verify URL bar shows correct path at each step

## Expected Behavior

- **Root URL** (https://enufacas.github.io/hddl/): Serves `index.html`
- **Any other path** (e.g., /specification): GitHub Pages can't find the file, so it serves `404.html` which contains the same content as `index.html`
- **Client-side router**: The JavaScript router reads `window.location.pathname`, strips the base path `/hddl/`, and renders the appropriate page component

## Troubleshooting

If routes don't work:

1. **Check build output**: Verify `dist/404.html` exists and matches `dist/index.html`
2. **Check asset paths**: Verify assets in HTML use `/hddl/` prefix (not `/`)
3. **Check router**: Verify `import.meta.env.BASE_URL` is used correctly in router.js
4. **Check browser console**: Look for 404 errors on assets or JavaScript errors
5. **Check network tab**: Verify the HTML for deep links is served (even if status is 404)
