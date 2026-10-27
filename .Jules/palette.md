## 2026-10-27 - InsightsTab accessibility and focus styling
**Learning:** Icon buttons and input triggers within tabbed workspace calculation cards need explicit `aria-label` attributes with specific parameter values (e.g., target prices) and design system focus ring offsets to ensure screen readers clearly identify action targets and keyboard navigation stays visual against dark card backgrounds.
**Action:** Always pair `aria-label`, `aria-hidden="true"` on decorative icons, `focus-visible:ring-2`, and `active:scale-95` on calculation action buttons in detail tabs.
