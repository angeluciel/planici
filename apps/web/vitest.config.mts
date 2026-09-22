import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: fileURLToPath(new URL(".", import.meta.url)),
	resolve: {
		alias: {
			"@/": fileURLToPath(new URL("./src/", import.meta.url)),
			"@planici/schemas": fileURLToPath(
				new URL("../../packages/schemas/src/index.ts", import.meta.url),
			),
			"@planici/i18n": fileURLToPath(
				new URL("../../packages/i18n/index.ts", import.meta.url),
			),
		},
	},
	plugins: [tsconfigPaths(), react()],
	test: {
		environment: "jsdom",
		include: ["tests/**/*.test.{ts,tsx}"],
		setupFiles: ["./tests/setup.ts"],
		clearMocks: true,
	},
});
