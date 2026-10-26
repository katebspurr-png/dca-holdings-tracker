## 2025-10-26 - Custom Button Checkboxes Require Explicit ARIA Checkbox Semantics

**Learning:** Custom interactive list option buttons that behave as toggleable selections (e.g., survey checkboxes or beta toggles) are read by screen readers as standard buttons unless explicitly given `role="checkbox"`, `aria-checked`, and descriptive `aria-label` attributes.

**Action:** Whenever building custom interactive selection cards or toggle buttons in UI components, always pair `role="checkbox"` and `aria-checked={boolean}` with focus-visible offset rings and active press scaling.
