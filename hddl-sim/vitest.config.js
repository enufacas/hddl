import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    exclude: ['tests/**/*.spec.js', 'node_modules'],
    coverage: {
      provider: 'v8',
      enabled: false,
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage/unit',
      include: ['src/**/*.js'],
      exclude: ['node_modules/**', 'tests/**', 'src/**/*.test.js', '**/*.spec.js'],
    },
  },
})
