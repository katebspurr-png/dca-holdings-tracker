## 2025-09-07 - Screen Reader Status Attributes on Context Badges
**Learning:** Inline badges like `DemoDataTag` provide critical contextual information for visual users ("DEMO DATA"), but without explicit semantic roles (`role="status"`) and clear accessibility labels (`aria-label`), screen readers might read them abruptly without conveying their role as system status indicators.
**Action:** When creating or updating badge/tag components that denote app states or environments, add `role="status"` and a descriptive `aria-label`.
