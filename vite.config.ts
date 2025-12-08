import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [uni()],
  build: {
    sourcemap: false, // 禁用生产 sourcemap
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 删除 console 调用
        drop_debugger: true,
      },
    },
  },
  server: {
    host: "0.0.0.0",
    // Vite default port is 5173; keep host for network accessibility
    port: 5173,
  },
});
