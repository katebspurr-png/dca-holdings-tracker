## 2025-05-18 - Interactive Card and Filter Chip Accessibility in SavedScenarios
**Learning:** Interactive scenario list items and filter toggle chips often lack proper WAI-ARIA states (`aria-pressed`), keyboard focus indicator styles (`focus-visible:ring-2`), and keyboard activation handlers (`onKeyDown`), leaving keyboard and screen reader users unable to interact seamlessly.
**Action:** Always complement clickable mode containers with `role="button"`, `tabIndex={0}`, `aria-pressed`, keyboard event listeners, and clear focus-visible offset rings alongside tactile press feedback.
