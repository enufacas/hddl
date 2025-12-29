## Plan: Mobile-Responsive HDDL Simulation Platform

Making the HDDL Simulation Platform fully responsive across desktop, tablet, and mobile devices by implementing adaptive layouts with hamburger navigation, bottom sheet telemetry, and touch-optimized controls.

### Steps

1. **Add CSS media query breakpoints and mobile utilities to [style.css](hddl-sim/style.css)** - Define three breakpoints (mobile <768px, tablet 768-1023px, desktop 1024px+), add CSS variables for adaptive spacing, create utility classes for hamburger menu animation, bottom sheet drawer, and modal overlay

2. **Implement hamburger navigation and sidebar drawer in [workspace.js](hddl-sim/src/components/workspace.js)** - On mobile: replace activity bar with hamburger icon in top-left, convert sidebar to slide-in drawer with overlay backdrop, add close button to drawer, ensure touch-friendly 44px tap targets for all nav items

3. **Convert auxiliary bar to bottom sheet drawer in [workspace.js](hddl-sim/src/components/workspace.js)** - On mobile: hide auxiliary bar from main grid, create swipeable bottom sheet drawer (initially collapsed), add tab selector for telemetry sections, implement swipe-up gesture and drag handle for opening/closing

4. **Hide bottom panel by default on mobile in [workspace.js](hddl-sim/src/components/workspace.js)** - Collapse bottom panel automatically at mobile breakpoint, add floating action button (FAB) or toolbar button to open as modal overlay when needed, implement modal dismiss on backdrop tap

5. **Redesign timeline controls for mobile in [main.js](hddl-sim/src/main.js)** - Stack play/pause button, time display, and speed selector vertically or in compact row, make scrubber full-width and touch-draggable with larger handle (32px), increase tap targets to 44px minimum, replace text labels with icon-only buttons

6. **Simplify titlebar for mobile in [main.js](hddl-sim/src/main.js)** - Hide "Explore Specification" button text (icon only), move scenario selector to hamburger menu or make it a smaller dropdown, ensure title text truncates with ellipsis on narrow screens, reduce titlebar height to 48px for better space utilization

7. **Add responsive grid adjustments to page layouts** - Force single-column layout for envelope/fleet cards on screens <400px, reduce page container padding from 24px to 12px on mobile, ensure all touch targets are 44px minimum in [home.js](hddl-sim/src/pages/home.js), [stewardship.js](hddl-sim/src/pages/stewardship.js), and [decision-telemetry.js](hddl-sim/src/pages/decision-telemetry.js)

8. **Test responsive behavior and touch interactions** - Verify hamburger menu opens/closes sidebar smoothly, test bottom sheet swipe gesture, check timeline scrubber touch dragging on mobile device/emulator, ensure all breakpoints transition cleanly, validate panel state persists in localStorage

### Further Considerations

1. **Tablet breakpoint behavior (768-1023px)**: Should we keep activity bar visible but collapse auxiliary by default? Or use hamburger menu only below 768px? **Recommendation**: Keep activity bar on tablet, only use hamburger menu below 768px

2. **Landscape vs portrait mobile**: Should landscape mode on mobile revert to tablet layout with side-by-side panels? **Recommendation**: Yes, detect landscape orientation and show sidebar + editor side-by-side even on mobile

3. **Timeline scrubber on very small screens (<375px)**: Consider making timeline bar horizontally scrollable or further simplifying controls? **Recommendation**: Allow horizontal scroll for timeline controls, prioritize scrubber visibility

4. **Keyboard accessibility**: Ensure hamburger menu, bottom sheet, and modal overlays are keyboard-navigable with focus trapping? **Recommendation**: Yes, add focus management and Escape key handlers

5. **Animation performance**: Use CSS transforms for drawer animations vs. position changes for better mobile performance? **Recommendation**: Use `transform: translateX()` for sidebar drawer and `transform: translateY()` for bottom sheet
