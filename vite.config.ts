import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes("/node_modules/react") ||
            id.includes("/node_modules/scheduler")
            ? "react-vendor"
            : undefined;
        }
      }
    }
  },
  server: {
    port: 3001
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
      treeShaking: true
    }
  }
});
