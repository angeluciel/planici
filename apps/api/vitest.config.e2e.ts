import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import swc from 'unplugin-swc';

// lcov paths relative to the repository root (apps/api/src/...), so SonarCloud can tell api and web files apart.
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['**/*.e2e-spec.ts'],

    fileParallelism: false,
    maxConcurrency: 1,

    globalSetup: ['./test/setup/database.global-setup.ts'],
    setupFiles: ['./test/setup/env.ts'],

    testTimeout: 15_000,
    hookTimeout: 30_000,

    // Only collected with --coverage (the sonar CI job). Kept apart from the unit report in ./coverage.
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage-e2e',
      reporter: ['text-summary', ['lcovonly', { projectRoot: repositoryRoot }]],
      include: ['src/**/*.ts'],
      // The unit specs sit next to the code; without this they are listed as uncovered sources.
      exclude: ['src/**/*.spec.ts'],
    },
  },
});
