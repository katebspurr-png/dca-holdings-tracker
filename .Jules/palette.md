# Palette UX/Accessibility Journal

## 2025-03-05 - Bottom Tab Bar Navigation Micro-Interactions & Screen Reader Context
**Learning:** Fixed bottom navigation tab bar items are highly interactive elements. They lack standard browser navigation feedback because they trigger client-side React router transitions without page refreshes. Providing keyboard focus indicators (`focus-visible:ring-2`), tactile scaling on active states (`active:scale-95`), and explicit navigation descriptors (`aria-current="page"`) provides essential sensory feedback for both visual users and assistive technologies.
**Action:** When working on navigation components, always explicitly style focus-visible rings matched to the theme, apply a fast scaling transition on click/tap, and correctly set the ARIA state representation of active current routes.
