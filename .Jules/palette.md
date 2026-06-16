## 2026-06-16 - [Tactile Bottom Navigation]
**Learning:** Custom bottom tab bars using standard HTML buttons often lack essential mobile UX attributes. Explicitly adding `aria-current="page"` and `active:scale-95` significantly improves the perception of responsiveness and accessibility without requiring complex state management.
**Action:** Always include `aria-current` for active navigation states and tactile feedback (`active:scale`) for mobile-first navigation elements.
