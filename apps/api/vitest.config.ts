import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// lcov paths relative to the repository root (apps/api/src/...), so SonarCloud can tell api and web files apart.
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', ['lcov', { projectRoot: repositoryRoot }]],
      include: ['src/**/*.ts'],
      // The unit specs sit next to the code; without this they are listed as uncovered sources.
      exclude: ['src/**/*.spec.ts'],
    },
  },
});
