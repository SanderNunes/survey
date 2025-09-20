import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from 'tailwindcss';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  server:{
    port: 3000,
    https: true
  },
  plugins: [
    react(),
    basicSsl(),
    tailwindcss(),
    svgr()
  ],
  resolve: {
    alias: {
      '@': "/src",
    }
  }
})
