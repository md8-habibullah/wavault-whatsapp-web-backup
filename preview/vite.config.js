// Demo/preview build of the dashboard with fictional data: npm run preview
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(import.meta.dirname),
  publicDir: resolve(import.meta.dirname, '../public'),
  plugins: [react()],
  server: { port: 4789, strictPort: true, host: '127.0.0.1' },
});
