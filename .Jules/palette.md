## 2025-05-14 - Screen Reader Text Formatting for Numeric Metrics
**Learning:** Adding `aria-label` directly to generic non-interactive `<p>` tags without an explicit ARIA role is non-compliant in ARIA 1.2 and often ignored or incorrectly announced by screen readers.
**Action:** Use visually hidden `<span className="sr-only">` elements for full screen reader descriptions alongside `<span aria-hidden="true">` for visually formatted numeric text.
