import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {} // Prevents crash in some libraries
  },
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});