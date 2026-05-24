## 2025-05-15 - Tactile Feedback with Scaling
**Learning:** Adding `active:scale-95` to interactive elements provides immediate tactile feedback, making the app feel more responsive and high-quality, especially on mobile devices where tap targets need clear visual state changes. For larger cards, a subtler `active:scale-[0.98]` is more appropriate.
**Action:** Use the general `transition` class (rather than property-specific ones like `transition-colors`) when combining scaling with other transitions to ensure animations are synchronized.
