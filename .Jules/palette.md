## 2025-05-14 - Button Tactile Feedback
**Learning:** Adding `active:scale-95` to interactive elements provides immediate tactile feedback, making the app feel more responsive and high-quality, especially on mobile devices where tap targets need clear visual state changes. Use the general `transition` class instead of `transition-colors` when scaling is added to ensure all transitions are synchronized.
**Action:** Apply `active:scale-95` and `transition` to the global `Button` component and any custom interactive elements like floating action buttons or tab bars.
