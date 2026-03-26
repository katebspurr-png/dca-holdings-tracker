# Pre-login demo — QA checklist

## Quick smoke

| Scenario | Expected |
|----------|----------|
| Logged out → `/auth` → Try Demo | **`/demo-welcome`** first (until dismissed); **Enter Demo** → `/demo` loader → portfolio; **Skip walkthrough** → `/demo?skipWalkthrough=1` → portfolio without guided coach |
| Second+ Try Demo (same device) | Skips welcome → `/demo` directly (`positionpilot-demo-welcome-dismissed`) |
| Logged out → `/auth?demo=true` | Redirects to `/demo-welcome` or `/demo` per dismissed flag |
| Refresh in demo (same tab) | Still in demo; sample data intact; tour state unchanged |
| Open app in a **new tab** while demo is active (same origin) | Still in demo (`positionpilot-demo-mode` in **localStorage**); portfolio loads without `/auth` redirect |
| Navigate `/` → `/what-if` → `/optimizer` → `/settings` → holding detail | No auth redirects; no crashes; data reads demo bucket only |
| Save scenario / apply buy / save what-if (guest demo) | Upsell dialog **once**; **Continue in demo** persists to demo sandbox only; **Create account** → `/auth?mode=signup` |
| **Create account** (banner) | `/auth?mode=signup` |
| **Sign in** (banner) | `/auth?mode=login` |
| Sign up / sign in | Demo flag cleared; storage scoped to user; cloud pull does not merge demo local data into real account |
| Sign out after real use | Demo flag cleared on sign-out; not in demo until user enters again |
| **Exit demo** (banner) | Demo flag off; if on a demo-only holding URL, redirect to `/` when no matching real holding |
| **Reset demo** | Sample data restored; pre-auth tour + save-upsell flags cleared; tour replayable |
| **Restart walkthrough** (banner) | Pre-auth steps restart from step 1 |

## First-time logged-out user (detailed)

- [ ] Land on `/auth`; **Try Demo** (primary), supporting no-account copy, subtle **Create account**, then sign-in card.
- [ ] **Try Demo** → **`/demo-welcome`** (first visit): title, bullets, **Enter Demo** / **Skip walkthrough** → then sample portfolio (5 tickers…) with seeded scenarios and what-if.
- [ ] Banner copy: “You’re in Demo Mode” / “Sample data only…”.
- [ ] Guided **Demo tour** appears (6 steps) with Skip / Next; final step mentions creating an account.
- [ ] No Supabase writes for portfolio data while logged out in demo (`shouldSyncToCloud` false).

## Refresh & navigation in demo

- [ ] Refresh on `/`, `/scenarios`, `/what-if`: remain in demo, no flash to `/auth`.
- [ ] Deep link `/holdings/demo-vti` in demo: detail loads; History tab uses local transactions only (no cloud fetch).
- [ ] Invalid route: 404 still shows app chrome (banner + tabs) when `isDemoMode` (demo user can return to `/`).

## Demo → signup conversion

- [ ] Banner **Create account** opens signup-focused auth.
- [ ] After signup, user is **not** in demo; holdings come from their account / empty onboarding, not demo IDs.

## Data isolation (no demo ↔ real mix)

- [ ] Demo data key: `positionpilot-demo-guest` (logged-out demo). Real data: `positionpilot-data` or `positionpilot-data-{userId}` when signed in.
- [ ] With demo off and logged out, `getHoldings()` uses non-demo key (typically empty until user adds positions).
- [ ] Login does not copy `positionpilot-demo-guest` into user bucket (demo flag cleared before or as session attaches; `seedFromCloud` only writes user key).

## Environment / dev

- Demo works in **production** builds (not dev-only). **Dev-only**: `localStorage.setItem("positionpilot-force-demo","1")` + reload auto-enters demo (`import.meta.env.DEV` only in `DemoModeContext`).

## Keys & flags (reference)

| Key / flag | Storage | Purpose |
|------------|---------|---------|
| `positionpilot-demo-mode` | localStorage (legacy sessionStorage migrated on read) | Demo on/off |
| `positionpilot-demo-welcome-dismissed` | localStorage | After welcome CTAs; Try Demo skips `/demo-welcome` (cleared on **Reset demo**) |
| `positionpilot-demo-guest` | localStorage | Demo portfolio JSON |
| `positionpilot-preauth-guided-demo` | localStorage | Pre-auth tour step / finished |
| `positionpilot-preauth-save-upsell-seen` | localStorage | First-write upsell shown |
| `positionpilot-preauth-conversion-dismissed` | localStorage | Post-walkthrough “Ready to try…” modal dismissed (cleared on tour restart / demo reset / fresh `enterDemo`) |
| `positionpilot-force-demo` | localStorage | Dev-only auto demo |
| `positionpilot-onboarding-done` | localStorage | Full-screen product onboarding (skipped when entering demo from cold start) |

## Files (implementation map)

| File | Role |
|------|------|
| `src/App.tsx` | `/demo` route, `DemoOrAuthRoute`, `AppChrome` when signed in or demo |
| `src/components/DemoOrAuthRoute.tsx` | Allows app routes if `session` or demo active |
| `src/pages/DemoWelcome.tsx` | Pre-app welcome; **Enter Demo** / **Skip walkthrough** |
| `src/pages/DemoEntry.tsx` | `enterDemo` (+ optional skip tour) + redirect to `/` |
| `src/lib/demoWelcome.ts` | Welcome dismissed flag + `getDemoEntryPath()` |
| `src/pages/Auth.tsx` | Try Demo → welcome or `/demo`, `?demo=true`, `?mode=signup` / `?mode=login` |
| `src/contexts/DemoModeContext.tsx` | enter/exit/reset; clear demo when session appears; dev force-demo |
| `src/contexts/ExperienceContext.tsx` | Pre-auth vs logged-in guided demo |
| `src/lib/preAuthDemoTour.ts` | Pre-auth tour persistence + `DEMO_FULL_RESET_EVENT` |
| `src/lib/preAuthDemoUpsell.ts` | Save-upsell “seen” flag |
| `src/hooks/use-pre-auth-save-upsell.tsx` | Upsell dialog + `requestPersist` |
| `src/walkthrough/preAuthGuidedDemoSteps.ts` | Guest demo copy |
| `src/components/GuidedDemoCoach.tsx` | Pre-auth vs logged-in steps |
| `src/components/DemoModeBanner.tsx` | Demo label, CTAs, replay, reset, exit |
| `src/lib/demoSampleData.ts` | Initial sample `AppData` |
| `src/lib/storage.ts` | Demo key routing, `shouldSyncToCloud`, migration |
| `src/pages/Holdings.tsx` | Onboarding skip in demo; empty-state Try demo |
| `src/pages/Settings.tsx` | Demo section, replay tour |
| `src/pages/HoldingDetail.tsx` | Upsell + no cloud history in demo |
| `src/components/InsightsTab.tsx` | Upsell on save from insights |
| `src/pages/WhatIfScenarios.tsx` | Upsell on save / apply |
