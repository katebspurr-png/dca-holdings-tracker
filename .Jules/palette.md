## 2025-10-02 - Accessible Controls and Tactile States in Settings

**Learning:** Form switches without explicit `aria-label` attributes or visible `<label>` text associations can leave screen reader users without context regarding what setting is being toggled. Moreover, utility buttons lacking focus ring styles and active press feedback degrade keyboard navigation and touch usability.

**Action:** Always provide explicit WCAG-compliant `aria-label` attributes on toggle switches (`aria-label="Toggle dark mode theme"`) and file input elements, mark decorative icons as `aria-hidden="true"`, and apply design system focus visible ring offset styles (`focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-card`) and tactile active press scaling (`active:scale-95 transition-all duration-150`).
