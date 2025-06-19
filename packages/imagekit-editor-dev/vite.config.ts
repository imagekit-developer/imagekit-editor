import * as path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ["src"],
      outDir: "../imagekit-editor/dist/types",
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "ImageKitEditor",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },
    outDir: path.join(__dirname, "../imagekit-editor/dist"),
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    // Enable minification
    minify: "terser",
    // Generate TypeScript type declarations
    emptyOutDir: false,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  // Dev server configuration
  server: {
    hmr: true,
    watch: {
      usePolling: false,
    },
    port: 5173,
  },
  // Dependencies optimization
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  // Correctly process environment variables
  envPrefix: "IMAGEKIT_",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  clearScreen: false,
})
