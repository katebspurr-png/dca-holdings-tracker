## 2025-05-18 - Insights & Calculator Action Cards
**Learning:** Dense calculation cards and embedded result lists in strategy tabs (like InsightsTab) often lack descriptive context for screen reader users and interactive press feedback for keyboard/mouse users when operating repetitive "Use in calculator" or "Save scenario" action triggers.
**Action:** Always provide target-specific `aria-label` attributes (including currency prefix and target value) on repeated card buttons, and apply `active:scale-95 transition-all duration-150` alongside offset focus rings.
