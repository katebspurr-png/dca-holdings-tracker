## 2026-08-24 - Semantic Description Lists vs Container ARIA Overrides
**Learning:** Adding `aria-label` to container elements wrapping visible text overrides all child text nodes for screen readers, hiding inner dynamic data. Also, using hover effects or `role="status"` on static card containers creates false interaction affordances or unexpected announcements.
**Action:** Use native semantic HTML elements (`<dl>`, `<dt>`, `<dd>`) for key-value statistic cards so screen readers announce terms and definitions naturally without needing `aria-label` overrides.
