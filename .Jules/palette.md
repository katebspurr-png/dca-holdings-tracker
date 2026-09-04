## 2025-05-18 - WAI-ARIA Progress Bar Semantics for Metric Gauges
**Learning:** Custom visual metric meters (like the Buy Impact Index) built with HTML div bars require explicit `role="progressbar"` along with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and human-readable `aria-valuetext` to ensure screen readers announce value changes and range progress accurately.
**Action:** When adding or auditing visual metric meters/gauges across the app, always pair structural range attributes with `aria-valuetext` for screen reader clarity.
