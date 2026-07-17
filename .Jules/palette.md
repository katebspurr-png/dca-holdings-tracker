# Palette's UX & Accessibility Journal

## 2025-07-17 - Theme Toggle Interaction & Accessibility
**Learning:** Standard form Switch inputs alone do not provide a great tap-target or visual layout for a theme switch when visual icons (like Sun and Moon) represent selection states. Wrapping those visual labels in semantic `<button>` elements with `active:scale-95` and appropriate ARIA roles allows users to directly click on the states themselves with immediate tactile feedback, making theme switching much more intuitive, keyboard-accessible, and satisfying.
**Action:** Always wrap visual selection label icons (like Sun/Moon, grid/list layout selectors, etc.) in semantic, focusable `<button>` elements with `active:scale-95` tactile feedback and descriptive `aria-label`s instead of leaving them as static text/icons.
