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
      // Unit coverage is intentionally scoped to the TS-target surfaces.
      // The app UI (pages + DOM-heavy components) is primarily covered by Playwright E2E.
      include: ['src/sim/**/*.js', 'src/components/map/**/*.js'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'src/**/*.test.js',
        '**/*.spec.js',
        '**/*.json',
        'src/sim/scenarios/**',
      ],
    },
  },
})
