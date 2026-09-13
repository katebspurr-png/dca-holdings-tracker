## 2026-09-13 - WCAG 2.5.3 Label in Name on Action Buttons
**Learning:** Adding an `aria-label` to buttons that already have clear visible text (e.g. "Model allocation", "Reload cache") violates WCAG 2.5.3 (Label in Name) if the `aria-label` overrides or differs from the visible text, confusing screen reader users and voice navigation tools.
**Action:** Only add `aria-label` attributes to icon-only buttons or inputs without visible `<label>` text. For buttons with visible text, rely on the visible text or ensure `aria-label` matches the visible text verbatim.
