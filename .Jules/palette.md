# Palette's UX Journal

## 2025-05-10 - Initial Setup
**Learning:** PositionPilot uses a dark-themed custom design system styled via Tailwind with `stitch-*` color palette tokens (e.g. `bg-stitch-bg`, `bg-stitch-card`, `bg-stitch-pill`, `ring-stitch-accent/50`, `text-stitch-accent`, `text-stitch-muted`, `border-stitch-border`).
**Action:** When adding focus outlines, active touch scaling, or interactive control styling, always align with existing `stitch-*` tokens and tactile button styling (`active:scale-95 transition-all duration-150`).

## 2025-05-10 - Holdings Toolbar Layout & Sort Controls
**Learning:** In list/grid toggle groups with container border pills (`bg-stitch-card/50` within `bg-stitch-pill`), standard focus rings can clip against neighbor buttons without `outline-none` and explicit offset rings (`focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-card`). Adding `active:scale-95 transition-all duration-150` gives immediate tactile feedback during layout toggling.
**Action:** When designing toolbar button groups inside pill containers, always pair `active:scale-95` with `focus-visible:ring-offset-stitch-card` and `aria-hidden="true"` on inner icons.
