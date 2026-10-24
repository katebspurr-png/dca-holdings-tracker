## 2026-10-24 - Bottom Navigation ARIA and Focus Visibility
**Learning:** Fixed bottom navigation tabs require `aria-current="page"` on the active item in addition to explicit `aria-label` names so screen readers announce both the section title and current page context. Using `ring-offset-stitch-bg` for focus-visible states prevents visual ring clipping against dark background containers.
**Action:** Always set `aria-current={active ? "page" : undefined}` and `aria-label={tab.label}` on main bottom navigation buttons, paired with `focus-visible:ring-offset-stitch-bg`.
