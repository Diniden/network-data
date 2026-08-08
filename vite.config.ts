import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ include: ["src"] })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NetworkData",
      fileName: () => "network-data.js",
      formats: ["es"]
    },
    sourcemap: true
  }
});
