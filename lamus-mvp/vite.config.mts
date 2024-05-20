import { lezer } from "@lezer/generator/rollup";
import react from "@vitejs/plugin-react";
import * as process from "process";
import * as url from "url";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(async () => ({
  root: "src/",
  build: {
    manifest: true,
    outDir: "../build/",
    assetsDir: './',
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.PORT),
    warmup: {
      clientFiles: ['./src/Home/index.tsx', './src/FileManager/index.tsx', './src/CodeEditor/index.tsx', './src/TextEditor/index.tsx']
    }
  },
  resolve: {
    alias: [
      {
        find: "node-poweredup",
        replacement: url.fileURLToPath(
          new URL(
            "../node_modules/node-poweredup/dist/browser/poweredup.js",
            import.meta.url
          )
        ),
      },
    ],
    dedupe: ["@codemirror/state"],
  },
  plugins: [react(), viteTsconfigPaths(), lezer() as any],
}));
