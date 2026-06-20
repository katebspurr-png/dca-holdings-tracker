## 2025-05-14 - [Tactile & Accessible Feedback Pattern]
**Learning:** Custom interactive elements that bypass the global design system (like the "Add Stock" FAB and Portfolio cards) often lack default focus-visible indicators and tactile press feedback, making keyboard navigation difficult and mobile interactions feel "static".
**Action:** Always pair 'active:scale-95' (or 0.98 for larger cards) with the generic 'transition' utility for tactile feedback, and ensure 'focus-visible:ring-2' is used on any element with 'outline-none' to preserve accessibility.
