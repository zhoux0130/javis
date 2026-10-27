import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev runs on 5174 and proxies /api to `javis serve` on 5173.
// Production build is served by `javis serve` itself (same origin, no proxy).
// base 用 '/'：后台是 BrowserRouter，深层路由刷新时资源路径不能是相对的。
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': 'http://localhost:5173' },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 框架单独成块：业务代码改动不会让用户重新下载 antd。
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
