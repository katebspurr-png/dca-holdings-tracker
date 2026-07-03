## 2025-05-15 - Bottom Navigation Refinement
**Learning:** Subtle tactile feedback (`active:scale-95`) in navigation elements like the BottomTabBar significantly improves perceived responsiveness and user confidence in mobile-first applications. Implementing `aria-current="page"` on active navigation buttons is critical for screen reader users to identify their location.
**Action:** Always include tactile feedback and proper ARIA current states for primary navigation components.

## 2025-05-20 - Semantic Buttons for State Toggles
**Learning:** While `Label` components are standard for form fields, interactive text elements that toggle application state (like theme names or layout modes) are more accessible and intuitive when implemented as semantic `button` elements, providing built-in keyboard navigation and clear focus indicators.
**Action:** Use semantic buttons for all non-form interactive elements.
