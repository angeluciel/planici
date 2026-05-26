import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import rootConfig from '../../eslint.config.mjs';

// core-web-vitals bundles next/typescript which re-registers @typescript-eslint.
// The root config already owns TypeScript linting, so strip the duplicate plugin.
const nextVitalsFiltered = nextVitals.map((config) => {
  if (config.plugins?.['@typescript-eslint']) {
    const { '@typescript-eslint': _removed, ...plugins } = config.plugins;
    return { ...config, plugins };
  }
  return config;
});

const eslintConfig = defineConfig([
  ...rootConfig,
  ...nextVitalsFiltered,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
