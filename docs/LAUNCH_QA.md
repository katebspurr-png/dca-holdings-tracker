# Launch QA — PositionPilot

Run this on a **production web build** (`npm run build` + `npm run preview` or your deployed URL) and again on the **Capacitor iOS** build (simulator or device).

Mark each row **Pass / Fail** and note the build id or date.

## Core flows

| # | Check | Web | iOS |
|---|--------|-----|-----|
| 1 | Add, edit, and delete a holding | | |
| 2 | DCA calculator: inputs update results without errors | | |
| 3 | Clear distinction: simulated values vs **Apply** to holding | | |
| 4 | What-If: portfolio totals change only in preview until **Apply to Holdings** confirms | | |
| 5 | After apply: holding shares/avg and **transaction** history reflect the action | | |
| 6 | Progress tab loads and snapshot copy makes sense with your data | | |
| 7 | **Demo:** enter demo, see indicator/sample data, reset demo, no cloud bleed for guest | | |
| 8 | **Auth:** sign in, data syncs from cloud; sign out, local state clears per app behavior | | |
| 9 | Educational disclaimer visible (e.g. onboarding / footer) | | |
| 10 | **Legal:** Settings → Privacy & Terms open in browser/WebView without errors | | |

## Regression (launch copy)

| # | Check | Web | iOS |
|---|--------|-----|-----|
| 11 | Portfolio **Scenario results** list is alphabetical, no cross-holding “winner” score | | |
| 12 | Plan tab shows **Example scenario** / **Buy impact** wording, not “Next Best Move” | | |
| 13 | Tab bar shows **Budget lab** (not “Optimizer”) | | |

## Automated smoke (CI / local)

Run before tagging a release:

```bash
npm run build
npm run test
```

**Automated smoke (local):** `npm run build` — Pass; `npm run test` — 21 tests passed (record SHA when cutting release).

## Failures

Use this section to log defects and retest dates:

- 
