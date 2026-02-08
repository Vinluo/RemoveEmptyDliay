import { describe, expect, it } from "vitest";
import { executeCleanup } from "../src/core/cleanupExecutor";
import type { DailyNotesConfig } from "../src/types";

interface MockFile {
	path: string;
	extension: string;
}

function file(path: string): MockFile {
	return {
		path,
		extension: path.endsWith(".md") ? "md" : "txt",
	};
}

function toDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function createRuntime(fileContents: Record<string, string>, failOnTrashPaths: Set<string> = new Set()) {
	const files = Object.keys(fileContents).map(file);
	const byPath = new Map(files.map((f) => [f.path, f]));
	const trashed: string[] = [];

	const runtime = {
		getMarkdownFiles: () => files.filter((f) => f.extension === "md"),
		getMarkdownFileByPath: (path: string) => byPath.get(path) ?? null,
		readFile: async (targetFile: MockFile) => {
			const content = fileContents[targetFile.path];
			if (content === undefined) {
				throw new Error("file not found");
			}
			return content;
		},
		trashFile: async (targetFile: MockFile) => {
			if (failOnTrashPaths.has(targetFile.path)) {
				throw new Error("trash failed");
			}
			trashed.push(targetFile.path);
		},
	};

	return { runtime, trashed };
}

const config: DailyNotesConfig = {
	folder: "Daily",
	format: "YYYY-MM-DD",
};

const ignoredKeys = ["ctime", "mtime", "created", "updated"];

describe("executeCleanup", () => {
	it("returns cancelled when confirmation is declined", async () => {
		const { runtime, trashed } = createRuntime({
			"Daily/2026-02-08.md": "---\nctime: 2026-02-08\n---\n",
			"Daily/2026-02-07.md": "has content",
			"Notes/2026-02-08.md": "",
		});

		const summary = await executeCleanup({
			runtime,
			config,
			settings: {
				ignoredFrontmatterDateKeys: ignoredKeys,
				requireConfirmation: true,
			},
			scope: { kind: "all" },
			confirmDeletion: async () => false,
		});

		expect(summary.status).toBe("cancelled");
		expect(summary.candidateCount).toBe(1);
		expect(summary.deletedCount).toBe(0);
		expect(trashed).toEqual([]);
	});

	it("deletes only empty daily notes and reports failures", async () => {
		const { runtime, trashed } = createRuntime(
			{
				"Daily/2026-02-08.md": "---\nctime: 2026-02-08\n---\n",
				"Daily/2026-02-07.md": "---\ntitle: Not empty\n---\n",
				"Daily/2026-02-06.md": "---\nctime: [\n---\n",
			},
			new Set(["Daily/2026-02-08.md"]),
		);

		const summary = await executeCleanup({
			runtime,
			config,
			settings: {
				ignoredFrontmatterDateKeys: ignoredKeys,
				requireConfirmation: false,
			},
			scope: { kind: "all" },
		});

		expect(summary.status).toBe("completed");
		expect(summary.candidateCount).toBe(1);
		expect(summary.deletedCount).toBe(0);
		expect(summary.failedCount).toBe(1);
		expect(summary.skippedNonEmptyCount).toBe(1);
		expect(summary.skippedUncertainCount).toBe(1);
		expect(summary.failedPaths).toEqual(["Daily/2026-02-08.md"]);
		expect(trashed).toEqual([]);
	});

	it("resolves recent scope by expected daily paths", async () => {
		const now = new Date();
		const today = toDateString(now);
		const yesterdayDate = new Date(now);
		yesterdayDate.setDate(yesterdayDate.getDate() - 1);
		const yesterday = toDateString(yesterdayDate);

		const { runtime, trashed } = createRuntime({
			[`Daily/${today}.md`]: "",
			[`Daily/${yesterday}.md`]: "",
			"Daily/2000-01-01.md": "",
		});

		const summary = await executeCleanup({
			runtime,
			config,
			settings: {
				ignoredFrontmatterDateKeys: ignoredKeys,
				requireConfirmation: false,
			},
			scope: { kind: "recent", days: 2 },
		});

		expect(summary.scannedCount).toBe(2);
		expect(summary.deletedCount).toBe(2);
		expect(summary.failedCount).toBe(0);
		expect(trashed.sort()).toEqual([`Daily/${today}.md`, `Daily/${yesterday}.md`].sort());
	});
});
