import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyPaths = [
  '/auth',
  '/health',
  '/dashboard',
  '/products',
  '/categories',
  '/suppliers',
  '/customers',
  '/users',
  '/inventory',
  '/sales',
  '/reports',
  '/activity',
  '/cashier',
  '/coupons',
  '/promotions',
  '/tax-categories',
  '/uploads'
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      apiProxyPaths.map((path) => [
        path,
        { target: 'http://localhost:4000', changeOrigin: true }
      ])
    )
  }
});
