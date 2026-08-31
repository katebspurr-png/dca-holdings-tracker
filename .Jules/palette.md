## 2026-08-31 - Bottom Navigation Bar Active & Focus States
**Learning:** Fixed bottom navigation tab bars require explicit `aria-current="page"` and `aria-label` attributes on navigation buttons, along with `focus-visible` offset ring styles and tactile active press feedback (`active:scale-95 duration-150`) to provide unambiguous screen reader cues and tactile feedback.
**Action:** Always include `aria-current={active ? "page" : undefined}`, `aria-label={label}`, and focus ring styles on fixed bottom navigation controls.
