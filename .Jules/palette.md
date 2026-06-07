## 2025-05-14 - Tactile Feedback Patterns
**Learning:** For a high-quality mobile feel, interactive elements should provide immediate tactile feedback. Standard buttons benefit from `active:scale-95`, but larger card-like containers (like `HoldingPortfolioCard`) feel more professional with a subtler `active:scale-[0.98]`. Both require the general `transition` utility (not `transition-colors`) to animate the transform smoothly alongside color changes.
**Action:** Apply `active:scale-95` to buttons and `active:scale-[0.98]` to large interactive cards, ensuring `transition` class is present.

## 2025-05-14 - Navigation Accessibility & Testing
**Learning:** The `BottomTabBar` uses a `<nav>` with `aria-label="Main navigation"`. To ensure accessibility and reliable testing, navigation buttons should use `aria-current={active ? "page" : undefined}`. In Playwright, selectors should be scoped to the `nav` element and use `exact=True` to avoid strictness errors when labels like "Portfolio" are reused (e.g., in a menu button elsewhere).
**Action:** Always include `aria-current` on active navigation items and scope Playwright locators to the navigation container.
