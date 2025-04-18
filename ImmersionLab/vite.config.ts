import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: { defineModel: true },
    }),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/speckle": {
        target: "https://speckle.xyz",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/speckle/, ""),
      },
    },
  },
});
