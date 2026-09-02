## 2025-02-23 - High-Contrast Opaque Backgrounds for Floating Coach Overlays
**Learning:** Floating coach/walkthrough overlays overlaid on scrollable pages must use fully opaque backgrounds (`bg-stitch-card`) rather than semi-transparent ones (`bg-stitch-card/95`) to prevent underlying text bleeding through and causing WCAG visual contrast failures.
**Action:** Ensure all floating modals, coachmarks, and walkthrough step popovers use solid opaque card backgrounds with high-contrast borders and clear focus-visible rings on action buttons.
