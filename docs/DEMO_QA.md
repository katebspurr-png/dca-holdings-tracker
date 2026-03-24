# Pre-login demo — QA checklist

| Scenario | Expected |
|----------|----------|
| Logged out → `/auth` → Try demo | Lands on portfolio with sample data, banner visible, tab bar works |
| Refresh in demo (same tab) | Still in demo; sample data intact |
| Open `/demo` in a fresh tab | Demo bootstraps; portfolio loads |
| Navigate `/` → `/what-if` → `/settings` → holding detail | No auth redirects; no crashes |
| Save scenario / apply buy / save what-if (guest demo) | Upsell dialog once; “Continue in demo” still writes to demo sandbox only |
| Sign up / sign in | Demo session flag cleared; user sees their own data only; no demo merge |
| Sign out after real use | Existing behavior; demo not enabled unless user enters demo again |
| Reset demo | Sample data restored; walkthrough and upsell flags reset; tour can replay |

**Notes**

- Demo session flag lives in `sessionStorage` (`positionpilot-demo-mode`). It survives refresh in the same tab; a new tab can use `/demo` to re-enter.
- Dev-only: set `localStorage.setItem("positionpilot-force-demo","1")` and reload to auto-enable demo (development builds only).

## Files changed (summary)

| File | Role |
|------|------|
| `src/App.tsx` | `DemoOrAuthRoute`, `/demo` route, `AppChrome` when signed in or demo |
| `src/components/DemoOrAuthRoute.tsx` | Allows app routes if `session` or demo active |
| `src/pages/DemoEntry.tsx` | Public entry: `enterDemo` + redirect to `/` |
| `src/pages/Auth.tsx` | “Try demo” / “Get started”; `?demo=true` → `/demo` |
| `src/contexts/DemoModeContext.tsx` | Clear demo on first sign-in; dev force-demo; `resetDemo` clears tour + upsell |
| `src/contexts/ExperienceContext.tsx` | Pre-auth guided tour state + `guidedDemoActive` / step index |
| `src/lib/preAuthDemoTour.ts` | Pre-auth tour persistence + `DEMO_FULL_RESET_EVENT` |
| `src/lib/preAuthDemoUpsell.ts` | “Seen” flag for save/apply upsell |
| `src/hooks/use-pre-auth-save-upsell.tsx` | Upsell dialog + `requestPersist` wrapper |
| `src/walkthrough/preAuthGuidedDemoSteps.ts` | 6-step guest demo copy |
| `src/components/GuidedDemoCoach.tsx` | Chooses pre-auth vs logged-in beginner steps |
| `src/components/DemoModeBanner.tsx` | Conversion CTAs, replay, reset, exit |
| `src/lib/demoSampleData.ts` | Five holdings + seeded what-if comparison |
| `src/pages/Holdings.tsx` | Skip full-screen onboarding when demo is active |
| `src/pages/Settings.tsx` | Guest account CTA; replay tour in demo section |
| `src/pages/HoldingDetail.tsx` | Pre-auth upsell around save / apply |
| `src/components/InsightsTab.tsx` | Pre-auth upsell on scenario save from insights |
| `src/pages/WhatIfScenarios.tsx` | Pre-auth upsell on save comparison / apply |

Unchanged by design: `src/walkthrough/guidedDemoSteps.ts`, core demo isolation in `src/lib/storage.ts`.
