# Palette's Journal - UX & Accessibility Learnings

## 2025-05-18 - Demo Mode Banner Interactive Controls & Accessibility
**Learning:** Sticky top banners that contain multiple action buttons require explicit landmark labeling/aria-label, design system focus visible ring offsets, active tactile press feedback, and clear button context for screen readers to differentiate action intent.
**Action:** When working on top sticky banner components, ensure `aria-label` context is provided on all action buttons and apply uniform focus ring & active state utility classes (`focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-950 active:scale-95 transition-all duration-150`).
