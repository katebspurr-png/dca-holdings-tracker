## 2025-09-06 - Explicit Context Labels on Tabular Price Inputs
**Learning:** Numerical input fields rendered inside data tables or repeating mobile list items without labels or associated headers are announced as generic unlabelled inputs by screen readers, losing critical context on which ticker asset is being modified.
**Action:** Always provide explicit `aria-label={`Market price for ${h.ticker}`}` on repeating list or tabular numeric inputs to ensure seamless context when tabbing through portfolio inputs.
