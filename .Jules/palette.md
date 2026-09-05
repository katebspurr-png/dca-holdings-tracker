## 2026-09-05 - Avoid Overriding Readable Text with Redundant ARIA Labels
**Learning:** Adding explicit `aria-label` to buttons that already contain clear visible text overrides the accessible name unnecessarily and can conflict with speech recognition tools (WCAG 2.5.3).
**Action:** Only add `aria-label` to icon-only buttons or when visible text needs contextual disambiguation. Keep visible text untouched otherwise.
