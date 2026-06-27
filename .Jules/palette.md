## 2025-06-27 - Tactile Feedback and Accessibility in Navigation
**Learning:** Combining `active:scale-95` with a generic `transition` class (rather than property-specific ones like `transition-colors`) ensures that both color changes and tactile transforms are smoothly animated. Additionally, `aria-current="page"` is a simple but vital addition for screen reader navigation clarity in mobile-first tab bars.
**Action:** Always include `active:scale` and `aria-current` when building or refining navigation components.

## 2025-06-27 - Custom Button Accessibility
**Learning:** Custom FABs and buttons built with `button` tags but custom styling often miss the default focus ring. Manually implementing `focus-visible:ring` ensures keyboard accessibility without affecting the visual experience for touch/mouse users.
**Action:** Audit custom buttons for focus states and apply consistent `focus-visible` styles.
