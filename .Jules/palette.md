# Palette Journal

## 2026-08-20 - Market Price Inputs Screen Reader Accessibility & Tactile Micro-UX
**Learning:** Table and list card inputs for batch stock price updates lacked accessible names for screen reader navigation, and action buttons lacked standard tactile press responses.
**Action:** Always provide explicit `aria-label={`Market price for ${h.ticker}`}` on inline table inputs and apply design-system consistent `active:scale-95 transition-all duration-150` plus `focus-visible:ring-2 focus-visible:ring-stitch-accent/50` rings on interactive trigger buttons.
