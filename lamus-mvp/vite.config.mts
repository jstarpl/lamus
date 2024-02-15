import { defineConfig } from "vite";
import * as process from "process";
import * as url from "url";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";

const __dirname = new URL(".", import.meta.url);

export default defineConfig(async () => ({
  root: "src/",
  build: {
    outDir: "build/",
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.PORT),
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
  },
  plugins: [react(), viteTsconfigPaths()],
  define: {
    "process.env": {},
    global: "window",
  },
}));
