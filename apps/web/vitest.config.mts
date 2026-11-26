import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: fileURLToPath(new URL(".", import.meta.url)),
	resolve: {
		alias: {
			"client-only": fileURLToPath(
				new URL("./tests/stubs/client-only.ts", import.meta.url),
			),
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
		coverage: {
			provider: "v8",
			// @planici/schemas is aliased to its source above, so the web tests exercise it too.
			include: [
				"src/**/*.{ts,tsx}",
				`${fileURLToPath(new URL("../../packages/schemas/src/", import.meta.url))}**/*.ts`,
			],
			// Needed to report files outside this app's root (packages/schemas).
			allowExternal: true,
			// lcov paths relative to the repository root (apps/web/src/...), so SonarCloud can tell web and api files apart.
			reporter: [
				"text",
				"html",
				[
					"lcov",
					{ projectRoot: fileURLToPath(new URL("../..", import.meta.url)) },
				],
			],
		},
	},
});
