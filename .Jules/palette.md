# Palette's Journal - Critical Learnings Only

## 2025-07-23 - Custom Button-Based Segmented Control UX & A11y
**Learning:** Custom button-based segmented controls (like the default exchange selector in CsvImportDialog) need custom ARIA markup to behave like radios. Grouping them in a container with `role="radiogroup"`, assigning `role="radio"` and `aria-checked` properties to individual buttons, and applying the repository's standard focus-ring states paired with active:scale-95 scaling transitions provides a stellar accessible keyboard and screen reader navigation flow.
**Action:** Always wrap button-based tab selectors or toggles in a `role="radiogroup"` with clear `aria-label`s on buttons when they behave like single-select groups.
