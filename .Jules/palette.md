# Palette's UX Journal

This journal tracks critical UX and accessibility discoveries within PositionPilot.

## 2026-03-26 - Accessible Segmented Controls for Import Dialogs
**Learning:** Button-based custom segmented controls (like default exchange pickers in CSV import wizards) often suffer from accessibility gaps where screen readers perceive them as standard independent buttons rather than exclusive radio options. By grouping them in a container with `role="radiogroup"` mapped to a form label and marking individual elements with `role="radio"` and `aria-checked`, we provide robust screen-reader clarity and context. Pairing this semantic grouping with micro-animations (`transition active:scale-95`) and standard focus outlines delivers an elegant, multi-sensory experience.
**Action:** Always group custom, segmented tab-like choices using ARIA radio group roles, and couple visual active states with smooth CSS transitions.
