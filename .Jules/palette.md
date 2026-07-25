# Palette's Journal - Critical Learnings Only

## 2026-07-19 - Accessible Segmented Controls
**Learning:** Custom button-based segmented controls (like the default exchange selector in CsvImportDialog) can confuse screen readers if they are implemented as plain buttons without roles. Grouping them in a container with role="radiogroup" and setting role="radio" and aria-checked on individual buttons provides clear accessibility. Combining this with standard focus-ring states and active:scale-95 transitions ensures a delightful, tactile experience.
**Action:** Always group custom button-based segment selectors under role="radiogroup" with proper radio roles/aria-checked attributes, and apply the standardized repository active:scale-95 and focus-ring styling.
