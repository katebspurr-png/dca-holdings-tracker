# Palette's Journal

## 2026-09-28 - CSV Import Dialog Accessibility & Tactile Feedback
**Learning:** Dialog file upload buttons and exchange toggle controls in dark-mode modal workflows require explicit ARIA descriptions (`aria-pressed`, `aria-label`) and distinct focus offset rings (`focus-visible:ring-offset-stitch-card`) to preserve visible keyboard focus context inside card overlays.
**Action:** Always verify overlay card background colors when applying `focus-visible:ring-offset-*` and ensure toggles explicitly state their active selection using `aria-pressed`.
