## 2025-05-14 - Tactile Navigation and Keyboard Accessibility
**Learning:** Custom interactive elements that bypass the global design system (like the 'Add Stock' FAB) often lack default focus-visible indicators; these must be manually implemented to maintain accessibility standards.
**Action:** When adding tactile feedback (active:scale) to key navigation elements, always ensure 'aria-current' is correctly set for tabs and that 'focus-visible' rings are explicitly defined for non-standard button components.
