import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.js',
      name: 'BixbyWidget',
      fileName: 'bixby-widget',
      formats: ['iife']
    }
  }
});