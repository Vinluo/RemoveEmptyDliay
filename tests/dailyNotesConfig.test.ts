import { describe, expect, it } from "vitest";
import { resolveDailyNotesConfig } from "../src/core/dailyNotesConfig";

function createApp(options: {
	plugin?: unknown;
	existsMap?: Record<string, boolean>;
	readMap?: Record<string, string>;
}) {
	const existsMap = options.existsMap ?? {};
	const readMap = options.readMap ?? {};

	return {
		internalPlugins: {
			getPluginById: (id: string) => (id === "daily-notes" ? options.plugin : null),
		},
		vault: {
			configDir: ".obsidian",
			adapter: {
				exists: async (path: string) => existsMap[path] === true,
				read: async (path: string) => {
					const value = readMap[path];
					if (value === undefined) {
						throw new Error("missing");
					}
					return value;
				},
			},
		},
	};
}

describe("resolveDailyNotesConfig", () => {
	it("uses manual override when date format is provided", async () => {
		const app = createApp({
			plugin: {
				enabled: true,
			},
		});

		const result = await resolveDailyNotesConfig(app as never, {
			folder: "003-每日笔记",
			format: "YYYY-MM-DD",
		});
		expect(result).toEqual({ ok: true, config: { folder: "003-每日笔记", format: "YYYY-MM-DD" } });
	});

	it("reads config from internal plugin options", async () => {
		const app = createApp({
			plugin: {
				enabled: true,
				instance: {
					options: {
						folder: "Daily",
						format: "YYYY-MM-DD",
					},
				},
			},
		});

		const result = await resolveDailyNotesConfig(app as never);
		expect(result).toEqual({ ok: true, config: { folder: "Daily", format: "YYYY-MM-DD" } });
	});

	it("reads config from nested option objects", async () => {
		const app = createApp({
			plugin: {
				enabled: true,
				instance: {
					options: {
						daily: {
							config: {
								directory: "Journal",
								dateFormat: "YYYY-MM-DD",
							},
						},
					},
				},
			},
		});

		const result = await resolveDailyNotesConfig(app as never);
		expect(result).toEqual({ ok: true, config: { folder: "Journal", format: "YYYY-MM-DD" } });
	});

	it("falls back to .obsidian/daily-notes.json with dateFormat key", async () => {
		const app = createApp({
			plugin: {
				enabled: true,
				instance: {
					options: {},
				},
			},
			existsMap: {
				".obsidian/daily-notes.json": true,
			},
			readMap: {
				".obsidian/daily-notes.json": JSON.stringify({
					directory: "003-每日笔记",
					dateFormat: "YYYY-MM-DD",
				}),
			},
		});

		const result = await resolveDailyNotesConfig(app as never);
		expect(result).toEqual({ ok: true, config: { folder: "003-每日笔记", format: "YYYY-MM-DD" } });
	});

	it("returns disabled when daily notes core plugin is disabled", async () => {
		const app = createApp({
			plugin: {
				enabled: false,
			},
		});

		const result = await resolveDailyNotesConfig(app as never);
		expect(result).toEqual({ ok: false, reason: "daily-notes-disabled" });
	});

	it("returns missing config when format still unavailable", async () => {
		const app = createApp({
			plugin: {
				enabled: true,
				instance: {
					options: {
						folder: "Daily",
					},
				},
			},
		});

		const result = await resolveDailyNotesConfig(app as never);
		expect(result).toEqual({ ok: false, reason: "daily-notes-config-missing" });
	});

	it("returns internal api unavailable when plugin object cannot be accessed", async () => {
		const app = {
			vault: {
				configDir: ".obsidian",
				adapter: {
					exists: async () => false,
					read: async () => "",
				},
			},
		};

		const result = await resolveDailyNotesConfig(app as never);
		expect(result).toEqual({ ok: false, reason: "internal-plugin-api-unavailable" });
	});
});
