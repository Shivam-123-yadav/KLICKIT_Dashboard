import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: "127.0.0.1",
    port: 4173,
    allowedHosts: [
      "thirdpartyboseservice.com",
      "www.thirdpartyboseservice.com",
    ],
  },
})
