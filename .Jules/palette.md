# Palette Journal

🎨 UX and Accessibility learnings for this application.

## 2026-03-26 - Bottom navigation accessibility & tactile feedback
**Learning:** Fixed bottom navigation tab bar buttons frequently lack custom focus outlines or interactive press states, resulting in a poor keyboard navigation flow and unrewarding touch response. Adding explicit aria-current flags, accessible names, scale transitions on active states, and custom ring styles solves this and significantly improves UX.
**Action:** Always verify focus-visible state indicators and active-scaling (active:scale-95 transition-all) states on custom tab bars and interactive buttons.
