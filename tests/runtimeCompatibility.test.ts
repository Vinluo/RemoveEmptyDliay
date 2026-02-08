import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { createAppCleanupRuntime } from "../src/core/cleanupExecutor";

describe("createAppCleanupRuntime trash compatibility", () => {
	it("uses fileManager.trashFile when available", async () => {
		const file = new TFile();
		file.path = "note/2026-02-08.md";
		file.extension = "md";

		let fileManagerCalls = 0;
		let vaultTrashCalls = 0;

		const app = {
			vault: {
				getMarkdownFiles: () => [file],
				getAbstractFileByPath: () => file,
				cachedRead: async () => "",
				trash: async () => {
					vaultTrashCalls += 1;
				},
			},
			fileManager: {
				trashFile: async () => {
					fileManagerCalls += 1;
				},
			},
		};

		const runtime = createAppCleanupRuntime(app as never);
		await runtime.trashFile(file);

		expect(fileManagerCalls).toBe(1);
		expect(vaultTrashCalls).toBe(0);
	});

	it("falls back to vault.trash when fileManager.trashFile is missing", async () => {
		const file = new TFile();
		file.path = "note/2026-02-08.md";
		file.extension = "md";

		let vaultTrashCalls = 0;

		const app = {
			vault: {
				getMarkdownFiles: () => [file],
				getAbstractFileByPath: () => file,
				cachedRead: async () => "",
				trash: async () => {
					vaultTrashCalls += 1;
				},
			},
			fileManager: {},
		};

		const runtime = createAppCleanupRuntime(app as never);
		await runtime.trashFile(file);

		expect(vaultTrashCalls).toBe(1);
	});
});
