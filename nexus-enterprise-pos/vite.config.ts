import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const analyze = mode === 'analyze';
    return {
      server: {
        port: 3002,
        host: 'localhost',
      },
      plugins: [
        react(),
        tailwindcss(),
        // Run with: npx vite build --mode analyze
        analyze && visualizer({
          open: true,
          filename: 'dist/bundle-report.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
      ].filter(Boolean),
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Target modern browsers for smaller output
        target: 'es2020',
        // Enable minification
        minify: 'esbuild',
        // CSS code splitting
        cssCodeSplit: true,
        // Source maps only in dev
        sourcemap: false,
        rollupOptions: {
          output: {
            // ─── Manual chunk splitting strategy ───
            manualChunks: {
              // Core React runtime — cached across all pages
              'vendor-react': ['react', 'react-dom'],
              // Router — small but separate for caching
              'vendor-router': ['react-router-dom'],
              // Charts library — only loaded by Dashboard/Reports
              'vendor-charts': ['recharts'],
              // HTTP client
              'vendor-axios': ['axios'],
              // Icons — large, cache independently
              'vendor-icons': ['lucide-react'],
            },
          },
        },
        // Raise warning limit since we're now splitting properly
        chunkSizeWarningLimit: 300,
      },
    };
});
