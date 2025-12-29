import { defineConfig } from 'vite'
import istanbul from 'vite-plugin-istanbul'

export default defineConfig(({ command }) => ({
  // Use /hddl/ for GitHub Pages deployment, / for local dev
  base: command === 'build' ? '/hddl/' : '/',
  plugins: [
    // Only instrument for coverage when explicitly requested
    istanbul({
      include: 'src/**/*.js',
      exclude: ['node_modules/**', 'tests/**', 'src/**/*.test.js', '**/*.spec.js'],
      extension: ['.js'],
      requireEnv: true, // Only activate when VITE_COVERAGE=true
      forceBuildInstrument: true,
    }),
  ],
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
