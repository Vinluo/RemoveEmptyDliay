import type { TFile } from "obsidian";

export interface RemoveEmptyDailySettings {
	recentDays: number;
	requireConfirmation: boolean;
	ignoredFrontmatterDateKeys: string[];
	manualDailyNotesFolder: string;
	manualDailyNotesFormat: string;
}

export interface DailyNotesConfig {
	folder: string;
	format: string;
}

export type CleanupScope =
	| { kind: "today" }
	| { kind: "recent"; days: number }
	| { kind: "all" };

export type DailyNotesConfigStatus =
	| { ok: true; config: DailyNotesConfig }
	| { ok: false; reason: "internal-plugin-api-unavailable" | "daily-notes-disabled" | "daily-notes-config-missing" };

export type EmptyNoteReason =
	| "empty-no-frontmatter"
	| "empty-frontmatter-only"
	| "body-has-content"
	| "non-ignored-frontmatter-value"
	| "frontmatter-parse-error"
	| "frontmatter-structure-unsupported";

export interface EmptyNoteEvaluation {
	isEmpty: boolean;
	reason: EmptyNoteReason;
}

export interface CleanupSummary {
	scope: CleanupScope;
	scannedCount: number;
	candidateCount: number;
	deletedCount: number;
	failedCount: number;
	skippedNonEmptyCount: number;
	skippedUncertainCount: number;
	failedPaths: string[];
	deletedPaths: string[];
	candidatePaths: string[];
	status: "completed" | "cancelled" | "no-candidates";
}

export interface CleanupCandidateAnalysis {
	scannedCount: number;
	candidates: TFile[];
	skippedNonEmptyPaths: string[];
	skippedUncertainPaths: string[];
}
