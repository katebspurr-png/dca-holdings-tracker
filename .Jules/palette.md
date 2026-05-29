## 2025-05-15 - Semantic Navigation with aria-current
**Learning:** For tab-based or bottom-bar navigation components that manage their own active state (often based on current route), adding `aria-current="page"` (or "location", "step", etc.) is a high-value micro-accessibility win. It provides immediate context to screen reader users that cannot be inferred from visual styling alone.
**Action:** Always check navigation components (tabs, sidebars, bottom bars) for semantic state markers like `aria-current` or `aria-selected` when implementing or auditing UI navigation.
