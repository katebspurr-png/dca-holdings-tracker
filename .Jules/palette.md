## 2025-05-15 - [Tactile Feedback & Accessibility in Custom Navigation]
**Learning:** Custom navigation components often omit standard accessibility markers like 'aria-current' and tactile feedback states. Using 'active:scale-95' combined with 'transition' provides a high-quality native-app feel, while 'focus-visible' ensures keyboard users are not left behind.
**Action:** Always verify that custom buttons in loops (like TabBars) have 'aria-current' and 'active:scale-95' for consistent micro-interactions.
