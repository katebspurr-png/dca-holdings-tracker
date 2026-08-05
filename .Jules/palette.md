# Palette's Journal - PositionPilot

## 2025-03-05 - Mobile Navigation Accessibility and Keyboard Focus Rings
**Learning:** In mobile-first layout designs, primary tab navigation elements (like `BottomTabBar`) are frequently built with custom button elements that lack standard focus rings and ARIA current-state markers. Since mobile browsers don't show focus rings on tap, keyboard users are left with completely invisible focus states. Using `aria-current={active ? "page" : undefined}` on navigation buttons provides proper screen reader state announcements, while pairing `focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg` with `focus:outline-none` provides a highly polished, theme-accurate visual keyboard focus ring.
**Action:** Always verify that mobile navigation tab buttons are keyboard accessible and announce their current active state with `aria-current="page"`.
