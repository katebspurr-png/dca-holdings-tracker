import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  server: {
    // Must listen on all interfaces (not only 127.0.0.1): otherwise
    // http://localhost:8080 often hits IPv6 (::1) while the dev server is IPv4-only → blank page / refused.
    host: true,
    port: 8080,
    strictPort: true,
    watch: {
      ignored: ["**/dist/**", "**/.git/**", "**/.specstory/**"],
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
