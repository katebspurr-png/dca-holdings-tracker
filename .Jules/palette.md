## 2025-05-20 - Floating Action Buttons Focus Ring & Active Scale
**Learning:** Floating action buttons anchored over main viewports require clear focus-visible offset ring styling (`focus-visible:ring-offset-stitch-bg`) and tactile press scaling (`active:scale-95`) along with explicit `aria-label` to provide immediate screen reader context and crisp keyboard navigation cues.
**Action:** Apply `aria-label`, `focus-visible:ring-2`, `focus-visible:ring-offset-2`, `active:scale-95`, and `aria-hidden="true"` on decorative inner icons for floating action buttons across mobile views.
