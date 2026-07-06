## 2025-06-27 - [Bottom Tab Bar Accessibility & Feedback]
**Learning:** Subtle tactile feedback (`active:scale-95`) in navigation elements significantly improves perceived responsiveness in mobile-first applications. Additionally, `aria-current="page"` is critical for screen reader users to identify their location in an SPA navigation bar.
**Action:** Always implement `active:scale-95` with a generic `transition` class for interactive nav elements, and ensure `aria-current` is dynamically applied to active tabs.
