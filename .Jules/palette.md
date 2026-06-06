## 2025-05-14 - Tactile Feedback for Navigation
**Learning:** Adding `active:scale-95` to navigation elements provides immediate tactile feedback that significantly improves the "feel" of the app, making it feel more responsive and premium. Using the general `transition` class instead of `transition-colors` is necessary when adding transform-based interactions to existing color transitions.
**Action:** Always include tactile feedback (active:scale) and accessibility markers (aria-current) when working with custom navigation components that don't inherit these from a global design system.
