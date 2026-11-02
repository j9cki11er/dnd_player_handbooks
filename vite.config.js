import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep reference datasets separate so updating one book does not
          // invalidate the application and every other cached dataset.
          const dataset = id.match(/\/src\/(data(?:-[^/]+)?)\.json$/);
          if (dataset) return dataset[1] === 'data' ? 'reference-index' : dataset[1];
          if (id.includes('/node_modules/')) {
            if (id.includes('/qrcode/') || id.includes('/jsqr/')) return 'qr-vendor';
            if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    host: true
  }
})
