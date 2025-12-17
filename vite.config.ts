import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {} // Prevents crash in some libraries
  },
  build: {
    // Disable CSS code splitting - bundle all CSS together
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Inline dynamic imports to prevent chunk loading issues
        inlineDynamicImports: true,
        // Ensure consistent output format
        format: 'iife',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssMinify: true,
    // Don't generate sourcemaps in production to reduce size
    sourcemap: false,
    // Target modern browsers (Chrome extension environment)
    target: 'esnext',
  },
});