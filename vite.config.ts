import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
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
    },
    define: {
      // Polyfill process.env so `process.env.API_KEY` works in the browser
      'process.env': env
    }
  };
});
