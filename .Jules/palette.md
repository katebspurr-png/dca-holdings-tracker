## 2026-06-06 - Tactile Navigation & Aria-Current
**Learning:** Using 'aria-current="page"' on active navigation tabs correctly communicates context to screen readers. For mobile-centric apps, adding 'active:scale-95' provides essential tactile feedback, but requires using the generic 'transition' class (instead of 'transition-colors') to ensure the scale animation is smooth.
**Action:** Apply both semantic (ARIA) and tactile (scale) feedback to custom navigation components.
