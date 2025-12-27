import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // Use /hddl/ for GitHub Pages deployment, / for local dev
  base: command === 'build' ? '/hddl/' : '/',
  server: {
    watch: {
      usePolling: false,
    },
  },
  clearScreen: false,
  build: {
    outDir: 'dist',
  }
}))
