import react from '@vitejs/plugin-react'
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/artasfun/',
  plugins: [
    react(),
    {
      name: 'github-pages-spa-fallback',
      async closeBundle() {
        await copyFile(resolve('dist/index.html'), resolve('dist/404.html'))
      },
    },
  ],
})
