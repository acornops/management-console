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
  const useUiSource = env.VITE_UI_SOURCE_MODE === '1';
  const analyzeBundle = process.env.ANALYZE === 'true' || env.ANALYZE === 'true';
  return {
    base: basePath.endsWith('/') ? basePath : `${basePath}/`,
    define: {
      'import.meta.env.VITE_APP_DATA_MODE': JSON.stringify(dataMode)
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: useUiSource ? { ignored: ['**/packages/ui/dist/**'] } : undefined
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
            if (id.includes('/src/i18n/locales/')) {
              return id.endsWith('/en.js') ? 'app-locale-en' : 'app-locale-zh';
            }
            if (
              id.includes('/src/features/targets/chat/hooks/') ||
              id.includes('/src/features/targets/chat/lib/') ||
              id.endsWith('/src/features/targets/chat/types.ts') ||
              id.endsWith('/src/features/ai/aiRuntimeReadiness.ts')
            ) {
              return 'app-target-chat-runtime';
            }
            if (id.includes('/src/features/targets/chat/components/')) {
              return 'app-target-chat-ui';
            }
            if (id.includes('/src/services/')) {
              return 'app-control-plane';
            }
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (id.includes('tailwind-merge') || id.includes('/clsx/')) {
              return 'vendor-utilities';
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
            if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
              return 'vendor-react-dom';
            }
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-is/')) {
              return 'vendor-react-core';
            }
            return undefined;
          }
        }
      }
    },
    test: {
      environment: 'node',
      exclude: [...configDefaults.exclude, 'tests/design-system/**', 'tests/design-routes/**', 'tests/fixtures/**', 'tests/mcp-parity/**'],
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
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        ...(useUiSource
          ? [{ find: /^@acornops\/ui$/, replacement: path.resolve(__dirname, 'packages/ui/src/index.ts') }]
          : [])
      ]
    }
  };
});
