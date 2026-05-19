# Palette's Journal

## 2025-05-19 - Synchronized Tactile Feedback
**Learning:** When adding tactile feedback like `active:scale-95` to elements that already have color transitions, using the specific `transition-colors` class can cause the transform to snap instantly while colors animate smoothly, creating a jarring "stutter" effect.
**Action:** Use the general `transition` class (or ensure `transform` is included in the transition property) to ensure all properties, including scaling, animate in sync for a much more polished feel.
