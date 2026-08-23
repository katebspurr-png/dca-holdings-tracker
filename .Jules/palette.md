# Palette's Journal - UX & Accessibility Learnings

## 2025-08-23 - Radix SelectTriggers & Modal Action State Feedback
**Learning:** Radix UI `SelectTrigger` components inside modal forms do not default to having context-descriptive screen reader labels when rendering only selected values, requiring explicit `aria-label` attributes for screen readers. Furthermore, modal action buttons submitting asynchronous requests need both tactile press transitions (`active:scale-95`) and clear pending indicators (`animate-spin` loading feedback) so users are never left wondering if an action registered.
**Action:** Always add explicit `aria-label` attributes to Radix UI `SelectTrigger` elements and pair disabled state handling with inline loading indicators on primary submit controls.
