import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
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
