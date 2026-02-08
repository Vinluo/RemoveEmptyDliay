import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { executeCleanup } from "../src/core/cleanupExecutor";

interface MockFile {
	path: string;
	extension: string;
}

const ROOT_REL = "note/__remove-empty-daily-e2e__";
const ROOT_ABS = path.resolve(process.cwd(), ROOT_REL);
const TRASH_ABS = path.resolve(ROOT_ABS, ".trash");

function makeFile(relPath: string): MockFile {
	return {
		path: relPath,
		extension: relPath.endsWith(".md") ? "md" : "txt",
	};
}

async function setupNoteTestFiles(): Promise<Map<string, MockFile>> {
	await rm(ROOT_ABS, { recursive: true, force: true });
	await mkdir(ROOT_ABS, { recursive: true });

	const files: Array<{ rel: string; content: string }> = [
		{
			rel: `${ROOT_REL}/2026-02-06.md`,
			content: "---\ncreated: 二月 8日 2026, 10:30:28 晚上\nLate modified: 二月 8日 2026, 10:30:32 晚上\n---\n\n",
		},
		{
			rel: `${ROOT_REL}/2026-02-05.md`,
			content: "---\ncreated: 二月 8日 2026, 10:30:28 晚上\n---\n\n有正文",
		},
		{
			rel: `${ROOT_REL}/2026-02-04.md`,
			content: "---\ncreated: [\n---\n\n",
		},
		{
			rel: `${ROOT_REL}/template.md`,
			content: "",
		},
	];

	for (const file of files) {
		await writeFile(path.resolve(process.cwd(), file.rel), file.content, "utf8");
	}

	return new Map(files.map((item) => [item.rel, makeFile(item.rel)]));
}

describe("note folder integration", () => {
	it("cleans only empty daily note in note test folder", async () => {
		const fileMap = await setupNoteTestFiles();

		try {
			const runtime = {
				getMarkdownFiles: () => Array.from(fileMap.values()).filter((file) => file.extension === "md"),
				getMarkdownFileByPath: (targetPath: string) => fileMap.get(targetPath) ?? null,
				readFile: async (file: MockFile) => readFile(path.resolve(process.cwd(), file.path), "utf8"),
				trashFile: async (file: MockFile) => {
					await mkdir(TRASH_ABS, { recursive: true });
					await rename(path.resolve(process.cwd(), file.path), path.resolve(TRASH_ABS, path.basename(file.path)));
				},
			};

			const summary = await executeCleanup({
				runtime,
				config: {
					folder: ROOT_REL,
					format: "YYYY-MM-DD",
				},
				settings: {
					ignoredFrontmatterDateKeys: ["created", "late modified"],
					requireConfirmation: false,
				},
				scope: { kind: "all" },
			});

			expect(summary.status).toBe("completed");
			expect(summary.scannedCount).toBe(3);
			expect(summary.candidateCount).toBe(1);
			expect(summary.deletedCount).toBe(1);
			expect(summary.failedCount).toBe(0);
			expect(summary.skippedNonEmptyCount).toBe(1);
			expect(summary.skippedUncertainCount).toBe(1);

			const trashedContent = await readFile(path.resolve(TRASH_ABS, "2026-02-06.md"), "utf8");
			expect(trashedContent.length).toBeGreaterThan(0);
		} finally {
			await rm(ROOT_ABS, { recursive: true, force: true });
		}
	});
});
