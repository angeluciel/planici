import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import rootConfig from "../../eslint.config.mjs";

const nextVitalsFiltered = nextVitals.map((config) => {
  if (config.plugins?.["@typescript-eslint"]) {
    const { "@typescript-eslint": _removed, ...plugins } = config.plugins;
    return { ...config, plugins };
  }
  return config;
});

const eslintConfig = defineConfig([
  ...rootConfig,
  ...nextVitalsFiltered,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
