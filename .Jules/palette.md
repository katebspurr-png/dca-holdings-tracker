## 2025-10-20 - Accessible Survey Choice Buttons & Modal Progress
**Learning:** Survey option buttons (e.g. experience level choices) need explicit toggle state semantics (`aria-pressed`) and focus-visible offset ring styling (`focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-card`) to provide clear visual and screen reader feedback during multi-step onboarding modals.
**Action:** Always include `aria-pressed`, `role="dialog"`, `role="progressbar"` with `aria-valuetext`, and `aria-live="polite"` on onboarding survey modals.
