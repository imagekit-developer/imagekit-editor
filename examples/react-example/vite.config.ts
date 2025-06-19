import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react({
      // Explicitly set to use React 17 JSX transform
      jsxRuntime: "classic",
    }),
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  server: {
    port: 3000,
    open: true,
  },
  clearScreen: false,
  appType: "spa",
  build: {
    outDir: "build",
    sourcemap: true,
    emptyOutDir: true,
  },
  publicDir: "public",
});
