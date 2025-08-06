import * as path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
    dts({
      include: ["src"],
      tsconfigPath: "tsconfig.json",
      exclude: ["node_modules", "lib"],
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
    commonjsOptions: {
      strictRequires: "auto",
    },
    rollupOptions: {
      cache: false,
      external: [
        "react",
        "react-dom",
        "@emotion/react",
        "@emotion/styled",
        "@chakra-ui/react",
        "@chakra-ui/icons",
        "framer-motion",
        "react-select",
        "react-select/creatable",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "@emotion/react": "@emotion/react",
          "@emotion/styled": "@emotion/styled",
          "@chakra-ui/react": "@chakra-ui/react",
          "@chakra-ui/icons": "@chakra-ui/icons",
          "framer-motion": "framer-motion",
          "react-select": "react-select",
          "react-select/creatable": "react-select/creatable",
        },
      },
    },
    // Enable minification
    minify: false,
    // Generate TypeScript type declarations
    emptyOutDir: false,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  // Dev server configuration
  server: {
    hmr: false,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@emotion/react",
      "@emotion/styled",
      "@chakra-ui/react",
      "@chakra-ui/icons",
      "framer-motion",
      "react-select",
      "react-select/creatable",
    ],
  },
  envPrefix: "IMAGEKIT_",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  clearScreen: false,
})
