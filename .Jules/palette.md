## 2026-06-24 - [Tactile Feedback and Accessibility in BottomTabBar]
**Learning:** Adding `aria-current` to navigation tabs significantly improves screen reader context. Combining `active:scale-95` with a generic `transition` class provides a delightful tactile response that "breathes" life into flat UI buttons.
**Action:** Always include `aria-current` and `active:scale` for primary navigation elements. Use `focus-visible:ring-2` to ensure keyboard accessibility without cluttering the mouse-driven experience.
