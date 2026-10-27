import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The build output is committed to assets/app so the shared host (no Node)
// can serve it. File names are deterministic and referenced by the CI shell.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    fs: { allow: ['..'] },
    port: 5173
  },
  build: {
    outDir: '../assets/app',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (info) => {
          const source = 'names' in info && Array.isArray(info.names) ? info.names[0] : info.name || '';
          if (source.endsWith('.css')) {
            return 'app.css';
          }
          return 'media/[name]-[hash][extname]';
        }
      }
    }
  }
});
