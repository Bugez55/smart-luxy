import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replace(/\\\\/g, '/')

          if (modulePath.includes('/node_modules/@supabase/')) {
            return 'supabase-vendor'
          }

          if (
            modulePath.includes('/node_modules/react/') ||
            modulePath.includes('/node_modules/react-dom/') ||
            modulePath.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  }
})
