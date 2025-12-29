import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    exclude: ['tests/**/*.spec.js', 'node_modules'],
  },
})
