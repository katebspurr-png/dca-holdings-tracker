## 2025-05-14 - Custom Interactive Elements and Focus Visibility
**Learning:** Custom interactive elements that bypass the global design system (like the 'Add Stock' FAB) often lack default focus-visible indicators; these must be manually implemented to maintain accessibility standards.
**Action:** When implementing or polishing custom interactive elements, always ensure `focus-visible` rings are explicitly defined, especially if `focus:outline-none` is used to suppress default browser styling.
