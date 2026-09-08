## 2025-09-08 - Mock Preview Accessibility and Selection Guard
**Learning:** Decorative step preview illustrations that contain mock UI text (like step card previews in onboarding walkthroughs) emit noise for screen readers and allow unwanted text selection during navigation.
**Action:** Always mark decorative mock preview containers with `aria-hidden="true"` and `select-none` to keep screen reader navigation clean and focus users on active controls.
