## 2025-06-27 - Tactile Navigation and ARIA Page Markers
**Learning:** In mobile-first navigation like `BottomTabBar.tsx`, visual active states (e.g., accent lines) must be paired with `aria-current="page"` to ensure screen readers communicate the current location. Additionally, when adding tactile feedback via `active:scale-95`, the `transition-colors` class should be generalized to `transition` to ensure the scaling effect is also animated smoothly.
**Action:** Always verify that active navigation states use `aria-current` and that tactile transforms are covered by a `transition` utility.
