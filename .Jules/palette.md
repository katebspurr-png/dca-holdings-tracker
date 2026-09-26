## 2025-05-18 - [Radix UI SelectTrigger Focus and Label Accessibility]
**Learning:** Radix UI `SelectTrigger` components inside forms do not automatically inherit accessible names from standalone sibling `<Label>` elements without explicit `aria-label` or `id`/`aria-labelledby` association.
**Action:** Always provide an explicit `aria-label` or `aria-labelledby` attribute on `SelectTrigger` elements when wrapping form select controls to ensure screen readers announce the control's purpose.
