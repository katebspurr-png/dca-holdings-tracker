## 2025-06-27 - [Standardized Tactile Feedback and Navigation Accessibility]
**Learning:** In a mobile-first dashboard like PositionPilot, visual active states must be reinforced with `active:scale-95` tactile feedback and `aria-current` for screen readers. Using a generic `transition` class instead of `transition-colors` ensures the scaling effect is smooth.
**Action:** Always pair `active:scale-95` with `transition` and ensure icon-only buttons or interactive labels (like theme toggles) are wrapped in semantic `<button>` elements with clear `aria-label` attributes.
