## 2025-05-20 - Guided Demo Coach Micro-UX & Keyboard Focus Rings
**Learning:** Fixed guided walkthrough overlays and floating cards need explicit focus-visible ring offsets paired with tactile press scaling (`active:scale-95`) to provide immediate feedback to keyboard and touch users without jarring layout shifts.
**Action:** Always pair `focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-card` with `active:scale-95 transition-all duration-150` on overlay action buttons and mark close button icons with `aria-hidden="true"`.
