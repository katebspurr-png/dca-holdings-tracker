## 2024-05-27 - Tactile Navigation Feedback
**Learning:** Adding `active:scale-95` to custom navigation elements (like BottomTabBar) provides immediate tactile feedback that enhances the mobile-first feel of the app. Using the generic `transition` class instead of property-specific ones (like `transition-colors`) ensures that scaling and color changes are synchronized.
**Action:** Always apply `active:scale-95` and `transition` to interactive elements that don't use the standard `Button` component, and ensure `aria-current="page"` is used for active navigation states.
