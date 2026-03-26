import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  server: {
    // 127.0.0.1 avoids long silent stalls some macOS setups hit with 0.0.0.0 / "::"
    host: "127.0.0.1",
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
