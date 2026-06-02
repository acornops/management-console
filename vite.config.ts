import path from 'path';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = env.VITE_APP_BASE_PATH || '/';
  const analyzeBundle = process.env.ANALYZE === 'true' || env.ANALYZE === 'true';
  return {
    base: basePath.endsWith('/') ? basePath : `${basePath}/`,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(analyzeBundle
        ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true })]
        : [])
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('i18next')) {
              return 'vendor-i18n';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return undefined;
          }
        }
      }
    },
    test: {
      environment: 'node',
      passWithNoTests: false,
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reportsDirectory: 'coverage',
        reporter: ['text', 'html', 'json-summary']
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    }
  };
});
