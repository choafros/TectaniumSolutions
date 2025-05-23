import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),     // point Vite at the client folder
  plugins: [react()],
  resolve: {
    alias: {
      // “@” → client/src
      "@": path.resolve(__dirname, "src"),
      // “@shared” → your shared folder at the repo root
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    // output into client/dist (so Vercel’s static-build can pick it up)
    outDir: path.resolve(__dirname, "dist"),
  },
});
