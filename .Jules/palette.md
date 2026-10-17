## 2025-05-18 - [Portfolio Strategy Progress Landmark Semantics]
**Learning:** In portfolio summary cards like `PortfolioStrategyProgress`, adding landmark section attributes (`aria-labelledby` linked to `<h2>`) and hiding decorative icons (`aria-hidden="true"`) significantly improves landmark structure for screen reader navigation without affecting visual presentation.
**Action:** Always link card section containers to internal `<h2>` headers with `aria-labelledby` and mark purely decorative icons with `aria-hidden="true"`.
