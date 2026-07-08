## 2025-06-27 - Tactile Navigation & A11y
**Learning:** Subtle tactile feedback (`active:scale-95`) in navigation elements significantly improves perceived responsiveness. Implementing `aria-current="page"` on active navigation buttons is critical for screen reader users to identify their location in the app's mobile-first navigation.
**Action:** Always pair visual active states with semantic `aria-current` attributes and tactile feedback transitions for primary interactive elements.
