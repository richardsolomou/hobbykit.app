import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Export-quality geometry builds take several seconds each on CI runners, close enough to the 5s default to flake.
    testTimeout: 30_000,
  },
})
