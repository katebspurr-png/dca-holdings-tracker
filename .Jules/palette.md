## 2025-05-15 - Synchronized Tactile Feedback
**Learning:** Interactive elements should use 'active:scale-95' and the 'transition' shorthand to provide tactile visual feedback; use the general 'transition' class (rather than property-specific ones like 'transition-transform') when combining scaling with other transitions like color changes to ensure animations are synchronized. Avoid 'transition-all' in core components like 'button.tsx' to prevent unintended layout shifts.
**Action:** Always use 'transition' class when implementing 'active:scale-95' feedback on custom interactive elements.
