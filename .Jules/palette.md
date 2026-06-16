## 2025-05-14 - [Tactile and Accessible Navigation]
**Learning:** Custom interactive elements that bypass the global design system (like the 'Add Stock' FAB and 'BottomTabBar' buttons) often lack default focus-visible indicators and tactile feedback; these must be manually implemented to maintain accessibility and UX standards. Using `aria-current="page"` on navigation elements significantly improves screen reader clarity.
**Action:** Always check custom buttons and navigation items for `focus-visible` styles, tactile feedback (e.g., `active:scale-95`), and appropriate ARIA roles/states.
