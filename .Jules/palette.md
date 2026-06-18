## 2025-05-14 - [Tactile Feedback & Transitions]

**Learning:** When adding tactile feedback using `active:scale-95`, ensure the `transition` utility is used instead of property-specific ones like `transition-colors`. The generic `transition` class in Tailwind covers transform, colors, and opacity, ensuring that scaling and color shifts happen smoothly together without conflicting or requiring multiple transition classes.
**Action:** Use the `transition` shorthand whenever combining `active:scale` with other state-based visual changes like background or text color shifts.
