# Palette's Journal

## 2025-06-27 - Tactile Feedback and Navigation Context
**Learning:** Adding `active:scale-95` with a `transition` class provides immediate tactile confirmation on touch/click, which is crucial for a mobile-first UI. Pairing this with `aria-current="page"` for active navigation tabs ensures both visual and assistive technology parity. Semantic buttons for theme selection (instead of just toggles) improve hit areas and keyboard navigation.
**Action:** Always pair `active:scale` with `transition` and ensure icon-only buttons have descriptive `aria-label` and `focus-visible` ring styles.
