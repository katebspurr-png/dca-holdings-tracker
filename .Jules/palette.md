# Palette's Critical Learnings Journal

This journal tracks critical UX and accessibility learnings discovered while working in this repository.

## 2025-07-10 - Bottom Tab Bar Tactile & Screen Reader Enhancements
**Learning:** Bottom navigation bar controls need precise `active:scale-95` tactile scaling animation paired with general `transition` utility classes for visual feedback on click. They must also have `aria-current="page"` when active, plus a standard themed focus-visible ring for accessible keyboard navigation.
**Action:** Always verify BottomTabBar implementation to ensure semantic, standard design patterns.
