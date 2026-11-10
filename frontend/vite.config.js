import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Requests to /api are forwarded to Express, so the browser sees one origin.
    proxy: { '/api': 'http://localhost:5001' },
  },
});
