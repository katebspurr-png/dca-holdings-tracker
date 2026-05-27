## 2025-05-15 - Navigation Tab Accessibility and Tactile Feedback
**Learning:** For bottom navigation bars in mobile-first layouts, combining `aria-current="page"` with tactile feedback like `active:scale-95` significantly improves both accessibility for screen readers and the perceived responsiveness for touch users. Using the general `transition` class instead of `transition-colors` ensures the scale animation is also smooth.
**Action:** Apply the combination of `aria-current`, `active:scale-95`, and `transition` to all primary navigation elements.
