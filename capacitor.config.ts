import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell for iOS (Capacitor). After `npm run build`, run `npx cap sync ios` and open Xcode.
 * Change `appId` to your Apple bundle identifier before App Store submission.
 */
const config: CapacitorConfig = {
  appId: "app.positionpilot.ios",
  appName: "PositionPilot",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
