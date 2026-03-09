

## Problem

The `:root` CSS variables (which apply when dark mode is off) are identical to the `.dark` variables. Toggling to light mode removes the `dark` class, but since `:root` has the same dark palette, nothing visually changes.

## Plan

### 1. Add light-mode palette to `src/index.css`

Update the `:root` block with a proper light palette that complements the existing dark terminal aesthetic. The `.dark` block stays unchanged.

Light palette values (keeping the same green primary accent for brand consistency):

```
:root {
  --background: 0 0% 98%;          /* near-white */
  --foreground: 224 40% 10%;       /* near-black */
  --card: 0 0% 100%;               /* white */
  --card-foreground: 224 40% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 224 40% 10%;
  --primary: 160 60% 40%;          /* slightly deeper green for contrast on light bg */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 92%;        /* light gray */
  --secondary-foreground: 224 40% 10%;
  --muted: 220 14% 95%;
  --muted-foreground: 220 10% 45%;
  --accent: 160 30% 92%;           /* light green tint */
  --accent-foreground: 160 50% 30%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 87%;
  --input: 220 13% 87%;
  --ring: 160 60% 40%;
  /* sidebar mirrors light palette */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 224 40% 10%;
  --sidebar-primary: 160 60% 40%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 220 14% 95%;
  --sidebar-accent-foreground: 224 40% 10%;
  --sidebar-border: 220 13% 87%;
  --sidebar-ring: 160 60% 40%;
}
```

The `.dark` block and everything else in the file stays exactly as-is.

### 2. No other changes needed

The Settings toggle, `ThemeToggle` component, and `useInitTheme` in `App.tsx` already correctly add/remove the `dark` class and persist to `localStorage`. Once the `:root` variables are distinct, the existing toggle will work.

