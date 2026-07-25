# Palette's Journal - Critical UX/accessibility learnings

## 2025-07-25 - Initializing Palette Journal
**Learning:** UX and accessibility micro-enhancements should be small, focused, and maintain standard keyboard navigable focus states and touch target sizes.
**Action:** Always verify keyboard accessibility (focus-visible rings, touch target heights/widths) and explicit ARIA labels.

## 2025-07-25 - Grouping Custom Segment Selectors
**Learning:** Custom button-based segmented controls (like the default exchange selector) can be made highly accessible and visually delightful by grouping them in a container with `role="radiogroup"`, assigning `role="radio"` and `aria-checked` properties to individual buttons, and applying the repository's standard focus-ring states paired with `active:scale-95 transition` scaling transitions.
**Action:** Wrap button-based selectors in a custom `radiogroup` and add proper radio ARIA properties.

## 2025-07-25 - Interactive Tab Close Triggers
**Learning:** Embedded interactive triggers inside buttons or tabs triggers (like scenario close buttons) should use `<span>` with `role="button"`, `tabIndex={0}`, custom keydown handlers for Enter and Space keys, explicit descriptive `aria-label`s, and custom focus indicators to be fully keyboard accessible.
**Action:** Always ensure nested or custom interactive triggers have proper tabIndex, keydown support, and clear aria-labels.
