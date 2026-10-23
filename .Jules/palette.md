## 2025-05-18 - Bottom Tab Bar Accessibility and Focus Ring Pattern
**Learning:** Fixed bottom navigation tab bars require explicit `aria-current="page"` semantics to announce the active tab to assistive technologies, alongside `focus-visible:ring-offset-stitch-bg` to ensure focus rings remain visible above standard viewport background overlays.
**Action:** Always apply `aria-current={active ? "page" : undefined}` and focus-visible offset ring utilities (`focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2`) on tab bar navigation buttons.
