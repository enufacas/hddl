# Mobile Screenshots

This directory contains screenshots demonstrating the mobile UI layout improvements.

## Screenshots

### Desktop View (1280px)
**File**: `desktop-1280px.png`
- Full desktop layout at 1280x720 resolution
- Shows standard titlebar with all controls visible
- Timeline controls in single row
- Sidebar and auxiliary panels visible

### Small Mobile (iPhone SE - 375px)
**File**: `mobile-375px-iphone-se.png`
- Smallest mobile viewport (375x667)
- Hamburger menu visible in top-left of titlebar
- Scenario dropdown with adequate width (100-140px)
- Timeline controls wrapped across two rows for readability
- Uniform heights (32px) and fonts (13px)
- "Decision Envelopes" header stacked vertically
- View As dropdown full width on separate row

### Standard Mobile (iPhone 12 - 390px)
**File**: `mobile-390px-iphone-12.png`
- Standard mobile viewport (390x844)
- Similar layout to iPhone SE with slightly more space
- All mobile improvements visible
- Touch targets meet 44px minimum

### Tablet (768px)
**File**: `tablet-768px.png`
- Tablet viewport (768x1024)
- Hamburger menu hidden (desktop nav used)
- More horizontal space for controls
- Sidebar visible

## Key Improvements Shown

1. **Hamburger Menu**: Properly integrated in titlebar (not floating)
2. **Scenario Dropdown**: Wider (140px max) to prevent truncation
3. **Timeline Controls**: Uniform 32px height, 13px fonts
4. **Map Header**: Vertical stacking on mobile, no overlapping
5. **Play/Pause Button**: Proper icon rendering (not blue box)

## Capture Details

- All screenshots taken at hour 0 with playback paused
- Full page screenshots for mobile views
- Viewport screenshots for desktop/tablet
- Captured with Playwright automated browser testing
