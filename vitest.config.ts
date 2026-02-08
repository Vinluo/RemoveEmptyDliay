import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			obsidian: resolve(__dirname, "tests/mocks/obsidian.ts"),
		},
	},
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
});
