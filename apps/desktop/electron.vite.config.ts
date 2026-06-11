import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@writer/core', '@writer/shared'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@writer/core', '@writer/shared'] })],
  },
  renderer: {
    plugins: [tailwindcss(), react()],
    server: {
      port: 4273,
      strictPort: true,
    },
  },
});
