## 2026-08-23 - WCAG 2.5.3 (Label in Name) on Buttons with Visible Text
**Learning:** Adding `aria-label` to buttons that already have visible text overrides the accessible name and causes voice control and screen reader label mismatches under WCAG 2.5.3. `aria-label` should be reserved for icon-only buttons or inputs without visual labels.
**Action:** Only apply `aria-label` to icon-only controls (like the `$` and `%` mode toggles); rely on visual button text for buttons with visible text.
