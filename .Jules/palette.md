## 2025-05-23 - Contextual ARIA Labels for Multi-Column Comparison Cards
**Learning:** In multi-column comparison tables (like scenario comparisons), generic action labels like "Use" or "Apply" lack context for screen reader users when announced in isolation or when navigating by button landmarks.
**Action:** Always provide contextual `aria-label`s on comparison action buttons incorporating the specific row or column identifier (e.g. `aria-label={`Use parameters from ${method} scenario`}`).
