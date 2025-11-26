import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // This is crucial: Vercel uses process.env.API_KEY, but Vite client-side needs it defined
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})