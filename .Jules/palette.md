## 2025-05-14 - Custom FAB Focus States

**Learning:** Custom floating action buttons (FABs) that are built from scratch (using `div` or `button` with custom classes) instead of using a design system component often miss out on standard focus-visible styles. This makes them inaccessible to keyboard users who cannot see which element is currently focused.
**Action:** Always implement explicit `focus-visible` ring styles on custom interactive elements, especially prominent ones like FABs. Use `focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg`.

## 2025-05-14 - Tactile Feedback with active:scale

**Learning:** Adding `active:scale-95` (or `active:scale-[0.98]` for larger elements) combined with the generic `transition` class provides a high-delight tactile feel that makes the app feel more native and responsive. Using the generic `transition` is safer than `transition-colors` when we want to animate both colors and transforms.
**Action:** Implement `active:scale` feedback on primary interaction points like navigation tabs, FABs, and action cards.
