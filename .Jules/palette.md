# Palette Learning Journal

## 2025-07-28 - [Accessible Tactile Tab Navigation]
**Learning:** For bottom navigation elements on mobile-first applications, using `active:scale-95` with general `transition` class delivers a smooth and satisfying click animation. For screen-reader users, utilizing `aria-current="page"` dynamically is critical. Keyboard navigation is greatly improved by using customized `focus-visible` offset rings that align perfectly with the repository's themed custom colors (e.g., `focus-visible:ring-offset-stitch-bg`).
**Action:** Always combine interactive tactile feedback class sequences (`active:scale-95 transition`) with proper visual outline feedback (`focus-visible:ring-2 ...`) and appropriate ARIA attributes for mobile tab bars.
