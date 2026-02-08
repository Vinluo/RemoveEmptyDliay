import { App, TFile } from "obsidian";
import type {
	CleanupCandidateAnalysis,
	CleanupScope,
	CleanupSummary,
	DailyNotesConfig,
	RemoveEmptyDailySettings,
} from "../types";
import { buildExpectedDailyNotePath, filterDailyNoteFiles, getRecentDates } from "./dailyNoteMatcher";
import { evaluateEmptyDailyNote } from "./emptyNoteEvaluator";

interface CleanupRuntime {
	getMarkdownFiles: () => TFile[];
	getMarkdownFileByPath: (path: string) => TFile | null;
	readFile: (file: TFile) => Promise<string>;
	trashFile: (file: TFile) => Promise<void>;
}

interface ExecuteCleanupOptions {
	runtime: CleanupRuntime;
	config: DailyNotesConfig;
	settings: Pick<RemoveEmptyDailySettings, "ignoredFrontmatterDateKeys" | "requireConfirmation">;
	scope: CleanupScope;
	confirmDeletion?: (candidatePaths: string[]) => Promise<boolean>;
}

function summarize(
	scope: CleanupScope,
	analysis: CleanupCandidateAnalysis,
	candidatePaths: string[],
	deletedPaths: string[],
	failedPaths: string[],
	status: CleanupSummary["status"],
): CleanupSummary {
	return {
		scope,
		scannedCount: analysis.scannedCount,
		candidateCount: candidatePaths.length,
		deletedCount: deletedPaths.length,
		failedCount: failedPaths.length,
		skippedNonEmptyCount: analysis.skippedNonEmptyPaths.length,
		skippedUncertainCount: analysis.skippedUncertainPaths.length,
		failedPaths,
		deletedPaths,
		candidatePaths,
		status,
	};
}

async function collectFilesByScope(runtime: CleanupRuntime, config: DailyNotesConfig, scope: CleanupScope): Promise<TFile[]> {
	if (scope.kind === "today") {
		const filePath = buildExpectedDailyNotePath(config, new Date());
		const file = runtime.getMarkdownFileByPath(filePath);
		return file ? [file] : [];
	}

	if (scope.kind === "recent") {
		const files: TFile[] = [];
		for (const date of getRecentDates(scope.days)) {
			const filePath = buildExpectedDailyNotePath(config, date);
			const file = runtime.getMarkdownFileByPath(filePath);
			if (file) {
				files.push(file);
			}
		}
		return files;
	}

	return filterDailyNoteFiles(runtime.getMarkdownFiles(), config);
}

async function analyzeCandidates(
	runtime: CleanupRuntime,
	files: TFile[],
	ignoredFrontmatterDateKeys: string[],
): Promise<CleanupCandidateAnalysis> {
	const candidates: TFile[] = [];
	const skippedNonEmptyPaths: string[] = [];
	const skippedUncertainPaths: string[] = [];

	for (const file of files) {
		try {
			const content = await runtime.readFile(file);
			const result = evaluateEmptyDailyNote(content, ignoredFrontmatterDateKeys);
			if (result.isEmpty) {
				candidates.push(file);
				continue;
			}

			if (result.reason === "frontmatter-parse-error" || result.reason === "frontmatter-structure-unsupported") {
				skippedUncertainPaths.push(file.path);
			} else {
				skippedNonEmptyPaths.push(file.path);
			}
		} catch {
			skippedUncertainPaths.push(file.path);
		}
	}

	return {
		scannedCount: files.length,
		candidates,
		skippedNonEmptyPaths,
		skippedUncertainPaths,
	};
}

export function createAppCleanupRuntime(app: App): CleanupRuntime {
	return {
		getMarkdownFiles: () => app.vault.getMarkdownFiles(),
		getMarkdownFileByPath: (path: string) => {
			const file = app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) {
				return null;
			}
			return file.extension === "md" ? file : null;
		},
		readFile: (file: TFile) => app.vault.cachedRead(file),
		trashFile: async (file: TFile) => {
			const maybeFileManager = app.fileManager as {
				trashFile?: (target: TFile) => Promise<void>;
			};
			const trashFromFileManager = maybeFileManager?.trashFile;

			if (typeof trashFromFileManager === "function") {
				try {
					await trashFromFileManager.call(app.fileManager, file);
					return;
				} catch {
					// Fallback to vault trash for compatibility with older app versions.
				}
			}

			await app.vault.trash(file, true);
		},
	};
}

export async function executeCleanup(options: ExecuteCleanupOptions): Promise<CleanupSummary> {
	const files = await collectFilesByScope(options.runtime, options.config, options.scope);
	const uniqueFilesByPath = new Map<string, TFile>();
	for (const file of files) {
		uniqueFilesByPath.set(file.path, file);
	}

	const analysis = await analyzeCandidates(
		options.runtime,
		Array.from(uniqueFilesByPath.values()),
		options.settings.ignoredFrontmatterDateKeys,
	);

	const candidatePaths = analysis.candidates.map((file) => file.path);
	if (candidatePaths.length === 0) {
		return summarize(options.scope, analysis, candidatePaths, [], [], "no-candidates");
	}

	if (options.settings.requireConfirmation) {
		const confirmDeletion = options.confirmDeletion ?? (async () => false);
		const confirmed = await confirmDeletion(candidatePaths);
		if (!confirmed) {
			return summarize(options.scope, analysis, candidatePaths, [], [], "cancelled");
		}
	}

	const deletedPaths: string[] = [];
	const failedPaths: string[] = [];

	for (const file of analysis.candidates) {
		try {
			await options.runtime.trashFile(file);
			deletedPaths.push(file.path);
		} catch {
			failedPaths.push(file.path);
		}
	}

	return summarize(options.scope, analysis, candidatePaths, deletedPaths, failedPaths, "completed");
}
