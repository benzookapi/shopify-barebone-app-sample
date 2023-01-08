import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "API_KEY": JSON.stringify(process.env.SHOPIFY_API_KEY)
  },
})
