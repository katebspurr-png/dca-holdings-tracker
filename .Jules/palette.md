## 2026-09-11 - Interactive Table Row Keyboard Accessibility
**Learning:** Table rows (`<tr>` / `TableRow`) that trigger navigation (`onClick`) are not focusable or interactive by default for keyboard or screen reader users.
**Action:** Always add `role="button"`, `tabIndex={0}`, `onKeyDown` handlers for Enter/Space keys, descriptive `aria-label`s, and `focus-visible:ring-2` focus indicators when making table rows interactive.
