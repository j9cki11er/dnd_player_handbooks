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

        }
      }
    }
  },
  server: {
    host: true
  }
})
