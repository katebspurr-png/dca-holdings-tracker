## 2026-06-29 - Bottom Tab Bar Tactile & Keyboard Accessibility
**Learning:** Fixed bottom navigation elements are highly touch-interactive but frequently lack semantic screen reader labels, keyboard focus rings, and proper touch feedback. Pairing visual active states with `aria-current="page"` and applying custom focus rings ensures keyboard and screen reader users can navigate seamlessly. Tactile feedback (`active:scale-95`) must always be supported by a general transition class for a smooth experience.
**Action:** Ensure all core navigation buttons/links have `aria-current`, themed `focus-visible:` ring styles, and transition-backed scaling on press.

## 2026-06-29 - Semantic Labels for Interactive Toggles
**Learning:** Replacing static tags (such as `span`) with semantic `<Label>` elements using `htmlFor` significantly increases the interactive touch/click hit target for checkboxes and switches, enhancing overall mobile usability and accessibility.
**Action:** Always wrap text options flanking a Switch, Radio, or Checkbox in a semantic `<Label>` with `htmlFor` pointing to the input element ID.
