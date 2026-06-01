## 2025-05-14 - Tactile feedback and accessibility polish
**Learning:** Adding `active:scale-95` to interactive elements provides immediate tactile feedback, making the app feel more responsive. Using the general `transition` utility class instead of `transition-colors` or `transition-transform` is necessary when combining scaling with other transitions to ensure animations are synchronized.
**Action:** Always use `transition` when adding `active:scale-95` to buttons or tabs, and ensure `aria-current` is used on navigation elements.
