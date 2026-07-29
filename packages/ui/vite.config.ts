import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: (id) => [
        'react',
        'react-dom',
        'lucide-react',
        'framer-motion',
        'clsx',
        'tailwind-merge'
      ].some((dependency) => id === dependency || id.startsWith(`${dependency}/`)),
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js'
      }
    },
    sourcemap: true,
    target: 'es2022'
  }
});
