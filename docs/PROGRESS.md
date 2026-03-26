# PositionPilot — V1 Progress Status

Last updated: March 2026

---

## Product positioning override (governing launch narrative)

**PositionPilot is a personal math and scenario modeling tool.** It answers “what happens if…” from **your** inputs. It does **not** tell you what to buy, sell, or prioritize.

- **PROGRESS.md** is primarily an **engineering inventory** (what exists in code and infra). It is **not** the product positioning document.
- **Launch UX** must avoid **recommendation framing** and **cross-holding rankings** (no “best move,” “top opportunities,” “most efficient,” or implied “you should do this next across positions”).
- Neutral labels in the app: **Example scenario**, **Buy impact**, **Scenario comparison / results**, **Average cost change**, **Compare allocations** (Budget lab), **Plan** tab (per-holding workspace).

---

## Built ✅

### Position workspace (`HoldingDetail.tsx`)

- Overview tab  
- **Plan** tab (URL param still `tab=strategy`): example scenario ($500 buy impact), buy impact ladder (sample amounts), budget-step simulator (`GoalLadder.tsx`), saved scenarios  
- Calculator tab  
- History tab (live Supabase data)  
- Math tab (`InsightsTab.tsx`)

### Portfolio screen (`Holdings.tsx`)

- Holdings list  
- **Scenario results (per holding)** — modeled ladder step per underwater ticker, **A–Z order** (no cross-holding score or “top” row)

### Supporting components & logic

- `GoalLadder.tsx`, `SavedScenarios.tsx`, `InsightsTab.tsx`, `WhatIfScenarios.tsx`, `ScenarioCompare.tsx`  
- `PremiumGate.tsx`, `ProSettings.tsx`, `BottomTabBar.tsx`, `Settings.tsx`  
- `dca-sim.ts` (core calculation logic — do not change math for copy-only launches)  
- `feature-access.ts` (plan-based gating)

### Infrastructure

- Supabase auth + cloud sync  
- Stock price fetching (Yahoo Finance chart API from the browser; 5-minute client cache)  
- Waitlist / feature voting  
- Onboarding walkthrough  
- Light/dark card styling  

---

## Launch checklist (verify manually)

Use **[docs/LAUNCH_QA.md](LAUNCH_QA.md)** for a printable Pass/Fail matrix (web + iOS).

- [ ] Add / edit / delete holding  
- [ ] DCA calculator + clear **simulate vs apply**  
- [ ] What-if does not mutate holdings until **Apply**  
- [ ] Transaction / holding update on apply  
- [ ] Progress tab — reflective snapshot copy  
- [ ] Demo mode — indicator, reset, no real-data bleed  
- [ ] Auth + sync  
- [ ] Educational disclaimer visible  
- [x] **Privacy & Terms** — substantive templates in `public/legal/` (have counsel review; add support contact + jurisdiction as noted in the HTML)  
- [ ] **iOS** — Xcode signing, icons, TestFlight (see [docs/IOS_CAPACITOR.md](IOS_CAPACITOR.md))  
- [ ] **App Store Connect** — metadata & privacy answers (see [docs/APP_STORE_CONNECT.md](APP_STORE_CONNECT.md))  

---

## Post-launch / deeper product (not launch blockers if copy stays neutral)

- Richer goal targeting / custom rungs  
- Price threshold alerts  
- Additional budget-lab modes  
- Shareable exports  

---

## Key technical notes

- **Capacitor:** `npm run cap:build` then `npm run cap:open` — [docs/IOS_CAPACITOR.md](IOS_CAPACITOR.md)  
- **Legal:** host `public/legal/` at your production URL; match App Store Connect policy link.  
- React hooks must stay at top level.  
- Prefer project path outside iCloud for local dev stability.
