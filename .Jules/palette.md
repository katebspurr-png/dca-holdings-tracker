# Palette's Learning Journal

## 2025-02-18 - Segmented filter controls and tactile interaction design
**Learning:** Segmented control and filter chip elements must convey their active/selected state explicitly to screen readers using `aria-pressed` or `aria-selected` depending on layout semantics, and require prominent keyboard focus states paired with springy tactile press indicators (`active:scale-95`) to deliver an exceptionally high-fidelity responsive feel.
**Action:** Apply `aria-pressed`, `focus-visible:ring-2`, and `active:scale-95` styles to custom toggle or chip buttons in future micro-UX upgrades.
