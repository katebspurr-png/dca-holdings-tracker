## 2025-05-14 - Bottom Tab Bar Accessibility and Tactile Feedback
**Learning:** Adding `aria-current="page"` to navigation elements significantly improves screen reader context. Using `active:scale-95` with a generic `transition` class (instead of `transition-colors`) ensures that both scaling and color changes animate in sync, providing a high-quality tactile feel.
**Action:** Always include `aria-current` on active navigation items and prefer the `transition` shorthand when adding scaling micro-interactions.
