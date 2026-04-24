import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    modulePreload: { polyfill: false }, // 停用 inline modulepreload polyfill，避免 CSP hash 問題
    chunkSizeWarningLimit: 2000,
    sourcemap: false, // 關閉 source map
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
