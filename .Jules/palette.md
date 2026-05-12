## 2025-05-15 - Improving Accessibility in Financial Dashboards
**Learning:** In data-dense financial applications like PositionPilot, dynamic calculation results (like "New Average Cost") are primary focus points. Without `aria-live`, screen reader users lose the immediate feedback of how their inputs (buy price/shares) affect the outcome.
**Action:** Apply `aria-live="polite"` to primary calculation outputs to ensure real-time feedback for assistive technologies.
