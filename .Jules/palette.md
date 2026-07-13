## 2025-06-27 - Accessible Theme Selection
**Learning:** Making theme labels interactive by converting them into semantic buttons significantly improves hit areas and accessibility compared to relying solely on a small toggle switch. It provides a more natural interaction pattern where users can click the label representing the state they want to achieve.
**Action:** When using toggles for binary states (like Light/Dark), wrap the labels in buttons to provide tactile feedback and larger click targets, ensuring they are properly announced to screen readers with `aria-pressed`.

## 2025-06-27 - Tactile Feedback Consistency
**Learning:** Adding `active:scale-95` tactile feedback to primary actions (FABs, Nav items) makes a web app feel more like a native mobile application. However, it must always be paired with a `transition` class to ensure the scaling effect is smooth rather than jarring.
**Action:** Pair all `active:scale-*` utilities with a general `transition` or `transition-transform` class to maintain a polished feel.
