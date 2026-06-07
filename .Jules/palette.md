## 2025-05-14 - Tactile Feedback and Navigation Accessibility
**Learning:** In a mobile-first UI like PositionPilot, interactive elements that lack built-in feedback (like custom buttons or tab bars) feel "dead". Adding `active:scale-95` with a general `transition` utility provides immediate tactile confirmation. Combining this with `aria-current="page"` ensures the enhancement is also communicated to assistive technologies.
**Action:** Always check high-traffic interactive elements for both tactile feedback and appropriate ARIA states during UX audits.
