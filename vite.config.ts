import path from 'path';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { configDefaults, defineConfig } from 'vitest/config';
import { resolveAppDataMode } from './src/config/appDataMode';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = env.VITE_APP_BASE_PATH || '/';
  const dataMode = resolveAppDataMode(env.VITE_APP_DATA_MODE, {
    production: command === 'build' && mode === 'production'
  });
  const analyzeBundle = process.env.ANALYZE === 'true' || env.ANALYZE === 'true';
  return {
    base: basePath.endsWith('/') ? basePath : `${basePath}/`,
    define: {
      'import.meta.env.VITE_APP_DATA_MODE': JSON.stringify(dataMode)
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(analyzeBundle
        ? [visualizer({
            filename: 'dist/stats.json',
            template: 'raw-data',
            gzipSize: true,
            brotliSize: true
          })]
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
      exclude: [...configDefaults.exclude, 'tests/design-system/**', 'tests/fixtures/**', 'tests/mcp-parity/**'],
      testTimeout: 10000,
      passWithNoTests: false,
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reportsDirectory: 'coverage',
        reporter: ['text', 'html', 'json-summary']
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    }
  };
});
