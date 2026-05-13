## 2026-05-13 - Focus State Suppression and ARIA Current
**Learning:** Found a pattern of `focus:outline-none` and `ring-0` being used on interactive elements (Portfolio menu, layout switcher), which suppresses accessibility for keyboard users. Additionally, the bottom navigation bar lacked `aria-current` to indicate the active page.
**Action:** Always replace `focus:outline-none` with themed `focus-visible:ring-2 focus-visible:ring-stitch-accent` and ensure `aria-current="page"` is used for active navigation links.
