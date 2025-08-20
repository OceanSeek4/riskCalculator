import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // CSS configuration
  css: {
    postcss: './postcss.config.cjs',
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. allow port switching if 1420 is occupied
  server: {
    port: process.env.VITE_DEV_PORT ? parseInt(process.env.VITE_DEV_PORT) : 1420,
    strictPort: false, // Allow port switching when occupied
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/components": resolve(__dirname, "./src/components"),
      "@/features": resolve(__dirname, "./src/features"),
      "@/lib": resolve(__dirname, "./src/lib"),
      "@/lib/core": resolve(__dirname, "./src/lib/core"),
      "@/lib/adapters": resolve(__dirname, "./src/lib/adapters"),
    },
  },
  
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
}));
