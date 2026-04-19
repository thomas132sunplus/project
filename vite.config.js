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
    chunkSizeWarningLimit: 2000,
    sourcemap: false, // 關閉 source map
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
