## 2025-05-18 - Subscription Dialog & Usage Progress Semantics
**Learning:** Dialog triggers for subscription settings require dynamic accessible names based on tier state (Pro vs Free), and internal quota usage indicators should expose full WAI-ARIA `role="progressbar"` attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
**Action:** Always check modal trigger buttons for dynamic state labels and map progress visual elements to proper `progressbar` ARIA semantics.
