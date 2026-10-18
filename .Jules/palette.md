# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Interactive Text Buttons & Simulator Focus Indicators

**Learning:** Inline interactive text buttons (like "Update Prices" inside paragraph text) can easily be missed by keyboard navigation if focus-visible offset ring styles are absent. Adding explicit design-system focus rings and subtle scale feedback improves keyboard accessibility without cluttering text flow.

**Action:** Whenever adding inline action buttons in notice/card banners, always include `focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-card outline-none rounded-sm active:scale-95 transition-all duration-150`.
