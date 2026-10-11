import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tự động tương thích với mọi repository GitHub Pages hoặc thư mục con
  base: process.env.BASE_PATH || './',
  server: {
    port: 3000,
    open: false
  }
})
