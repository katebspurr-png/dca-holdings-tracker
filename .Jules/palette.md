## 2025-05-14 - Tactile feedback and accessibility consistency
**Learning:** Adding 'active:scale-95' (or similar) to interactive elements provides immediate tactile feedback that enhances the perceived quality of the app, especially on mobile. Custom interactive elements often bypass global focus-visible styles and ARIA attributes like 'aria-current'.
**Action:** Always include 'active:scale' and generic 'transition' on interactive containers. Manually implement 'focus-visible:ring' on high-traffic custom buttons and ensure 'aria-current' is used for active navigation states.
