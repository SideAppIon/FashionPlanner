import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative — works on GitHub Pages project pages
// regardless of repo name, and plays nicely with HashRouter.
export default defineConfig({
  base: './',
  plugins: [react()],
})
