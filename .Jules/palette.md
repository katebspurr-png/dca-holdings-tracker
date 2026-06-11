## 2025-05-14 - [Accessibility and Tactile Feedback for Custom Buttons]
**Learning:** Custom interactive elements (like the 'Add Stock' FAB) that don't use the global Button component often lack default accessibility (focus-visible rings) and tactile feedback (active states). Adding these manually is crucial for a consistent and accessible UX.
**Action:** Always check custom button implementations for 'active:scale' and 'focus-visible' styles, especially if they are high-traffic floating action buttons.
