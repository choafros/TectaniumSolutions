import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
  },
  // Add this proxy configuration for local development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your Express server's default port
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Rewrite /api to just /api
      },
    },
  },
});