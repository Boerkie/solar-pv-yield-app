import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  secure: false
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiProxy
    }
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': apiProxy
    }
  }
});
