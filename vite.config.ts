import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react()
    ],
    base: './',
    build: {
      target: "es2022"
    },
    esbuild: {
      target: "es2022"
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "es2022"
      }
    }
  };
});
