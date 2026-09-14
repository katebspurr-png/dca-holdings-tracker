## 2025-05-18 - Accessible Onboarding Classification Modal & Micro-Interactions

**Learning:** Interactive onboarding and personalization overlays require WAI-ARIA dialog semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), explicit progressbar states for multi-step bars, and `aria-pressed` attributes on choice buttons so screen readers accurately announce selected options and navigation context.
**Action:** Ensure custom modal overlays include appropriate ARIA roles, progress indicators expose `role="progressbar"` with `aria-valuenow`, option buttons maintain `aria-pressed` states, and all action buttons feature clear `focus-visible` ring indicators and tactile feedback.
