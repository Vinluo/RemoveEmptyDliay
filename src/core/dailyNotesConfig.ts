import type { App } from "obsidian";
import type { DailyNotesConfigStatus } from "../types";
import { normalizeVaultPath } from "./dailyNoteMatcher";

interface DailyNotesPluginLike {
	enabled?: boolean;
	instance?: {
		options?: Record<string, unknown>;
		defaultOptions?: Record<string, unknown>;
		getOptions?: () => Record<string, unknown>;
	};
	options?: Record<string, unknown>;
}

const FORMAT_KEYS = ["format", "dateFormat", "filenameFormat", "fileFormat"];
const FOLDER_KEYS = ["folder", "directory", "path"];
const MAX_SEARCH_DEPTH = 4;

interface ManualDailyNotesOverride {
	folder?: string;
	format?: string;
}

function getStringValue(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function getStringByKeys(record: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = getStringValue(record[key]);
		if (value) {
			return value;
		}
	}

	return null;
}

function normalizeFolder(folder: string): string {
	const normalized = normalizeVaultPath(folder);
	if (normalized === "/" || normalized === ".") {
		return "";
	}

	return normalized.replace(/^\/+|\/+$/g, "");
}

function getDailyNotesPlugin(app: App): DailyNotesPluginLike | null {
	const appWithInternals = app as App & {
		internalPlugins?: {
			getPluginById?: (id: string) => unknown;
			plugins?: Record<string, unknown>;
		};
	};

	const internalPlugins = appWithInternals.internalPlugins;
	if (!internalPlugins) {
		return null;
	}

	if (typeof internalPlugins.getPluginById === "function") {
		const fromMethod = internalPlugins.getPluginById("daily-notes");
		if (fromMethod) {
			return fromMethod as DailyNotesPluginLike;
		}
	}

	const fromMap = internalPlugins.plugins?.["daily-notes"];
	return (fromMap as DailyNotesPluginLike | undefined) ?? null;
}

function collectOptionCandidates(plugin: DailyNotesPluginLike | null): Array<Record<string, unknown>> {
	if (!plugin) {
		return [];
	}

	const candidates: Array<Record<string, unknown> | undefined> = [
		plugin.instance?.options,
		plugin.instance?.getOptions?.(),
		plugin.instance?.defaultOptions,
		plugin.options,
		plugin.instance as Record<string, unknown> | undefined,
		plugin as Record<string, unknown> | undefined,
	];

	return candidates.filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));
}

function collectNestedObjectCandidates(root: Record<string, unknown>, maxDepth = MAX_SEARCH_DEPTH): Array<Record<string, unknown>> {
	const queue: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
	const seen = new WeakSet<object>();
	const results: Array<Record<string, unknown>> = [];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) {
			continue;
		}

		const { value, depth } = current;
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			continue;
		}

		const record = value as Record<string, unknown>;
		if (seen.has(record)) {
			continue;
		}
		seen.add(record);
		results.push(record);

		if (depth >= maxDepth) {
			continue;
		}

		for (const child of Object.values(record)) {
			queue.push({ value: child, depth: depth + 1 });
		}
	}

	return results;
}

async function readDailyNotesConfigFile(app: App): Promise<Record<string, unknown> | null> {
	const configDir = getStringValue(app.vault.configDir);
	if (!configDir) {
		return null;
	}
	const possiblePaths = [
		`${configDir}/daily-notes.json`,
		`${configDir}/plugins/daily-notes/data.json`,
	];

	for (const path of possiblePaths) {
		try {
			if (!(await app.vault.adapter.exists(path))) {
				continue;
			}
			const raw = await app.vault.adapter.read(path);
			const parsed = JSON.parse(raw) as unknown;
			if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
		} catch {
			continue;
		}
	}

	return null;
}

function pickConfigValues(candidates: Array<Record<string, unknown>>): { folder: string; format: string | null } {
	let folder = "";
	let format: string | null = null;

	for (const candidate of candidates) {
		folder = getStringByKeys(candidate, FOLDER_KEYS) ?? folder;
		format = getStringByKeys(candidate, FORMAT_KEYS) ?? format;
	}

	return {
		folder,
		format,
	};
}

export async function resolveDailyNotesConfig(app: App, manualOverride?: ManualDailyNotesOverride): Promise<DailyNotesConfigStatus> {
	const manualFormat = getStringValue(manualOverride?.format);
	if (manualFormat) {
		return {
			ok: true,
			config: {
				folder: normalizeFolder(getStringValue(manualOverride?.folder) ?? ""),
				format: manualFormat,
			},
		};
	}

	const plugin = getDailyNotesPlugin(app);
	if (plugin && plugin.enabled !== true) {
		return { ok: false, reason: "daily-notes-disabled" };
	}

	if (!plugin) {
		return { ok: false, reason: "internal-plugin-api-unavailable" };
	}

	const optionCandidates = collectOptionCandidates(plugin);
	const expandedCandidates = optionCandidates.flatMap((candidate) => collectNestedObjectCandidates(candidate));
	const fileConfig = await readDailyNotesConfigFile(app);
	if (fileConfig) {
		expandedCandidates.push(...collectNestedObjectCandidates(fileConfig));
	}

	const { folder, format } = pickConfigValues(expandedCandidates);
	if (!format) {
		return { ok: false, reason: "daily-notes-config-missing" };
	}

	return {
		ok: true,
		config: {
			folder: normalizeFolder(folder),
			format,
		},
	};
}
