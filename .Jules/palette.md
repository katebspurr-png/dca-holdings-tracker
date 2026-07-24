# Palette's Learning Journal - Critical Learnings Only

## 2026-03-26 - Accessible and Tactile Navigation Toggles
**Learning:** Adding explicit tactile feedback (`active:scale-95`) and robust focus transitions to mobile-first bottom tabs drastically enhances the micro-UX and keyboard navigation. Pair the physical active scale with standard screen reader properties like `aria-current="page"` to ensure equal parity across sensory layouts.
**Action:** Use standard focus-ring states paired with active scaling transforms for any custom interactive button bars.
