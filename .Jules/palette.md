## 2025-05-15 - [Accessible Loading Buttons]
**Learning:** When replacing button text with an icon (like a loading spinner), screen readers lose the context of the button's action unless a descriptive `aria-label` is provided.
**Action:** Always provide an `aria-label` that reflects the current state of the button (e.g., "Saving changes..." vs "Save changes").
