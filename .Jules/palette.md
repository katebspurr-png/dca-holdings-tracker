# Palette's UX & Accessibility Journal

## 2025-02-18 - [Radix Button Nesting & ARIA Radio Groups]
**Learning:** Nesting interactive `<button>` elements within Radix `TabsTrigger` (which renders as a button) violates HTML/React DOM specifications and breaks screen reader navigation. Custom button-based segmented controls (like the CSV import exchange selector) need explicit `role="radiogroup"`, `role="radio"`, and `aria-checked` states rather than basic unannotated buttons.
**Action:** Use a `<span>` with `role="button"`, `tabIndex={0}`, standard focus outline, clear `aria-label`, and custom keyboard/mouse handlers when embedding sub-actions within other list items or triggers. Group segments under standard container groups with proper active transitions.

## 2025-02-18 - [Tab Bar Accessibility & Tactile Transitions]
**Learning:** Fixed/sticky navigation controls (such as bottom tab bars) are core touchpoints for both mobile and keyboard-driven web journeys. Lacking distinct `active:scale-95` transitions or themed `focus-visible` rings leaves users unsure of press confirmations or tab indexing.
**Action:** Always provide explicit screen-reader accessibility using `aria-label` and `aria-current` indicators, while pairing tactile scaling active classes with offset themed focus rings (`focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg`) to anchor visual position pilotage.
