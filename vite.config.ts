// vite.config.ts
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import macros from "unplugin-parcel-macros";
import optimizeLocales from "@react-aria/optimize-locales-plugin";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    macros.vite(),
    tsConfigPaths(),
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
    {
      ...optimizeLocales.vite({
        locales: ["en-US", "fr-FR"],
      }),
      enforce: "pre",
    },
  ],
  ssr: {
    noExternal: [
      /@react-spectrum/,
      /@adobe\/react-spectrum/,
      /@spectrum-icons/,
      /react-aria/,
      /react-stately/,
      "unplugin-parcel-macros",
    ],
  },
  build: {
    target: "esnext",
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        // Bundle all S2 and style-macro generated CSS into a single bundle instead of code splitting.
        // Because atomic CSS has so much overlap between components, loading all CSS up front results in
        // smaller bundles instead of producing duplication between pages.
        manualChunks(id) {
          if (
            /macro-(.*)\.css$/.test(id) ||
            /@react-spectrum\/s2\/.*\.css$/.test(id)
          ) {
            return "s2-styles";
          }
        },
      },
    },
  },
});
