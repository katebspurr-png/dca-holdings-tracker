## 2026-03-31 - Side-by-Side Comparison Action Buttons Accessibility
**Learning:** When side-by-side comparison cards (like `ScenarioCompare.tsx`) render identical short button labels ("Use", "Apply") across multiple columns, screen reader users cannot easily distinguish between the actions without context.
**Action:** Always complement generic button text in repetitive comparison grids with explicit, method-aware `aria-label` descriptors (e.g., `aria-label="Use Price + Shares scenario"`).
