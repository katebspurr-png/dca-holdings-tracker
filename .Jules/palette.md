## 2025-05-26 - Tactile Feedback and Navigation Accessibility
**Learning:** Adding `active:scale-95` to interactive elements provides immediate tactile feedback, making the app feel more responsive. For larger elements like cards, a subtler `active:scale-[0.98]` maintains professionalism. Also, `aria-current="page"` is essential for screen readers to identify the active tab in a bottom navigation bar.
**Action:** Always apply appropriate `active:scale` transforms and accessibility markers to custom navigation components.
