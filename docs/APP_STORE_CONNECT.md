# App Store Connect — PositionPilot checklist

Fill this in when creating the app record. Do not commit secrets.

## App information

- **Name:** PositionPilot (or final App Store name)  
- **Subtitle:** (short value prop — e.g. “Average-cost scenarios & planning”)  
- **Bundle ID:** Must match Xcode (`app.positionpilot.ios` until you change it)  
- **SKU:** (unique internal id)  
- **Primary language:** English (U.S.)  

## URLs

- **Privacy Policy URL:** Must match a live page (e.g. `https://your-domain.com/legal/privacy.html`) — align with [public/legal/privacy.html](../public/legal/privacy.html) content.  
- **Support URL:** (contact form, email page, or help site) — **replace** placeholder contact lines in privacy/terms if you rely on email.  
- **Marketing URL:** (optional)  

## Description (draft — edit for your voice)

```
PositionPilot is a personal math tool for your stock positions. Model hypothetical buys, see how average cost would change, and compare scenarios — using numbers you enter.

• Track holdings, averages, and optional market prices
• Run DCA-style calculations and save scenarios
• Try What-If comparisons before updating your tracker
• Sign in to sync data across devices (optional)

Not financial advice. PositionPilot does not recommend securities or execute trades.
```

## Keywords

`stocks,average cost,DCA,portfolio,calculator,scenarios,planning` (max 100 chars — trim to fit)

## Screenshots

Capture on **6.7"** and **5.5"** (or current required sizes) for iPhone:

1. Portfolio  
2. Holding — Plan tab / calculator  
3. What-If or scenario comparison  
4. Progress or Math tab  

## App Privacy questionnaire (indicative)

Declare types you **actually** collect. Typical answers for this app:

| Data type | Linked to user? | Used for | Notes |
|-----------|-----------------|----------|--------|
| Email / account id | Yes | App functionality | Supabase Auth |
| Financial info (holdings, scenarios user enters) | Yes | App functionality | Stored locally + optional Supabase DB |
| Product interaction | Optional | Analytics | Only if you add analytics later |

**Third-party domains:** Supabase (auth, API, optional edge functions); Yahoo Finance (or your edge proxy) for quotes — disclose as analytics/functional as appropriate per Apple definitions.

Review Apple’s current definitions; this table is not legal advice.

## Export compliance

Usually **no** custom encryption beyond HTTPS — confirm in Apple’s wizard.

## Review notes (optional)

```
Demo: No account required — tap "Try Demo" on the sign-in screen.

Signed-in: Create account in-app. Holdings sync via Supabase.

The app does not execute trades. All figures are user-driven scenarios.
```

## Versioning

Match **Marketing version** (user-facing) and **Build** (monotonic) to Xcode for each upload.
