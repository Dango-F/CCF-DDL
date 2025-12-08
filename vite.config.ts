import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// Vite 配置参考：https://vitejs.dev/config/
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
    // Vite 默认端口是 5173；保留 host 以便局域网访问
    port: 5173,
  },
});
