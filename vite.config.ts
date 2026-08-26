import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          genlayer: ["genlayer-js", "genlayer-js/chains", "genlayer-js/types"],
        },
      },
    },
  },
});
