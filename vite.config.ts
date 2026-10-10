import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
      '@data': fileURLToPath(new URL('./data', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/data/reference/mahalle/')) return undefined
          if (id.includes('/data/reference/kgm')) return 'ref-kgm'
          if (id.includes('/content/core/factors/library-rows/')) return undefined
          if (id.includes('/content/core/factors/')) return 'content-factors'
          if (id.includes('/content/core/knowledge/')) return 'content-knowledge'
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-charts'
          if (id.includes('node_modules/@xyflow')) return 'vendor-flow'
          if (id.includes('node_modules/leaflet') || id.includes('react-leaflet')) return 'vendor-map'
          if (id.includes('node_modules/docx')) return 'vendor-docx'
          if (id.includes('node_modules/xlsx')) return 'vendor-xlsx'
          return undefined
        },
      },
    },
  },
})
