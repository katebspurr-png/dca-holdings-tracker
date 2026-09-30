## 2026-09-30 - Workspace Tab Navigation Accessibility
**Learning:** Custom tab bars using bare `<button>` tags lack essential screen reader navigation context unless explicit WAI-ARIA tab semantics (`role="tablist"`, `role="tab"`, dynamic `aria-selected`, `aria-controls`, `role="tabpanel"`, and `aria-labelledby`) are declared.
**Action:** Always wrap workspace navigation tabs in `role="tablist"` and attach `role="tab"` with `aria-controls` matching panel `id`s when building custom tabbed UI panels.
