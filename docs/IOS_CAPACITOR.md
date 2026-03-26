# Capacitor iOS — PositionPilot

## Prerequisites

- Xcode (current stable) on macOS  
- Apple Developer account for device run and TestFlight  
- `npm run build` produces `dist/` before every native sync  

## Commands

| Command | Purpose |
|--------|---------|
| `npm run cap:build` | `vite build` + `cap sync ios` (copies web assets into the iOS app) |
| `npm run cap:open` | Opens the iOS project in Xcode (`ios/App/App.xcodeproj`) |

After changing web code, always run `npm run cap:build` before archiving in Xcode.

## Bundle ID

Default: **`app.positionpilot.ios`** — set in [capacitor.config.ts](../capacitor.config.ts) and Xcode `PRODUCT_BUNDLE_IDENTIFIER`. Change both (and App Store Connect) to your final reverse-DNS id before release.

## Xcode checklist (manual)

1. Open **`ios/App/App.xcodeproj`** in Xcode (this repo uses the generated Xcode project; use a `.xcworkspace` instead if you add CocoaPods later).  
2. **Signing & Capabilities:** select your team, enable automatic signing, fix provisioning for the bundle id.  
3. **App icons:** replace assets in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (keep `Contents.json` structure).  
4. **Splash:** adjust `Splash.imageset` if you want a custom launch image.  
5. **Version:** bump **Marketing Version** and **Build** in Xcode before each TestFlight upload.  
6. **App Transport Security:** app uses HTTPS (Supabase, Yahoo). No ATS exceptions required unless you add `http://` endpoints.  
7. **Privacy Manifest / required reason APIs:** add or update if Apple requires declarations for your SDK versions.  
8. **Archive:** Product → Archive → Distribute to TestFlight.

## WebView / SPA routing

The bundled app serves the Vite build from the app bundle. Client-side routes (React Router) should work with Capacitor’s local server. If deep links fail on cold start to a nested path, use a `capacitor.config.ts` `server` entry only for dev (e.g. `url` to LAN) — do not point production builds at localhost.

## Environment variables

`VITE_*` values are **baked in at `vite build` time**. Rebuild and `cap sync` after changing `.env` for production API URLs.
