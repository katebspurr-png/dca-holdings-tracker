# Palette Agent Learning Journal

## 2026-03-26 - Screen Reader Page Indicator in Fixed Mobile-First Navigations
**Learning:** In hybrid mobile environments (such as Capacitor/PWA wrappers used in this codebase), screen reader navigation lacks natural browser context like page titles and URL announcements. Without `aria-current="page"`, screen readers cannot easily tell which view is active in the bottom navigation bar.
**Action:** Always combine `aria-current={active ? "page" : undefined}` and high-contrast focused offset rings (`focus-visible:ring-stitch-accent/50`) with tactile scale-down gestures (`active:scale-95 transition`) on fixed bottom tab bar controllers.
