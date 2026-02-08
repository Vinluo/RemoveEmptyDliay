import { moment } from "obsidian";
import type { TFile } from "obsidian";
import type { DailyNotesConfig } from "../types";

export function normalizeVaultPath(path: string): string {
	return path.replace(/\\+/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "");
}

function trimSlashes(path: string): string {
	return path.replace(/^\/+|\/+$/g, "");
}

function stripMarkdownExtension(path: string): string {
	return path.endsWith(".md") ? path.slice(0, -3) : path;
}

function isWithinFolder(path: string, folder: string): boolean {
	if (!folder) {
		return true;
	}
	return path === folder || path.startsWith(`${folder}/`);
}

function getRelativePathWithoutExtension(filePath: string, folder: string): string | null {
	const normalizedFilePath = normalizeVaultPath(filePath);
	if (!normalizedFilePath.endsWith(".md")) {
		return null;
	}

	const pathWithoutExtension = stripMarkdownExtension(normalizedFilePath);
	if (!folder) {
		return pathWithoutExtension;
	}

	if (!isWithinFolder(pathWithoutExtension, folder)) {
		return null;
	}

	if (pathWithoutExtension === folder) {
		return null;
	}

	return pathWithoutExtension.slice(folder.length + 1);
}

export function buildExpectedDailyNotePath(config: DailyNotesConfig, date: Date): string {
	const folder = trimSlashes(normalizeVaultPath(config.folder));
	const dateRelativePath = trimSlashes(moment(date).format(config.format));
	const normalizedPath = folder ? `${folder}/${dateRelativePath}.md` : `${dateRelativePath}.md`;
	return normalizeVaultPath(normalizedPath);
}

export function isDailyNotePath(filePath: string, config: DailyNotesConfig): boolean {
	const folder = trimSlashes(normalizeVaultPath(config.folder));
	const relativePath = getRelativePathWithoutExtension(filePath, folder);
	if (!relativePath) {
		return false;
	}

	const parsed = moment(relativePath, config.format, true);
	return parsed.isValid() && parsed.format(config.format) === relativePath;
}

export function filterDailyNoteFiles(files: TFile[], config: DailyNotesConfig): TFile[] {
	return files.filter((file) => file.extension === "md" && isDailyNotePath(file.path, config));
}

export function getRecentDates(days: number, fromDate = new Date()): Date[] {
	const safeDays = Math.max(1, Math.floor(days));
	const start = moment(fromDate).startOf("day");
	const dates: Date[] = [];

	for (let offset = 0; offset < safeDays; offset += 1) {
		dates.push(start.clone().subtract(offset, "days").toDate());
	}

	return dates;
}
