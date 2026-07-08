## 2025-06-27 - Bottom Navigation Accessibility and Tactile Feedback
**Learning:** Implementing `aria-current="page"` on active navigation buttons is critical for screen reader users to identify their location in the app's mobile-first navigation. Subtle tactile feedback (`active:scale-95`) in navigation elements significantly improves perceived responsiveness and user confidence.
**Action:** Always include `aria-current` for active states in navigation and apply `active:scale-95` with smooth transitions for main interactive elements.
