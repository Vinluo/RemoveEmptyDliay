import { parseDocument } from "yaml";
import type { EmptyNoteEvaluation } from "../types";

interface FrontmatterSplitResult {
	frontmatter: string | null;
	body: string;
	malformedFrontmatter: boolean;
}

function splitFrontmatter(content: string): FrontmatterSplitResult {
	const normalized = content.replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) {
		return {
			frontmatter: null,
			body: normalized,
			malformedFrontmatter: false,
		};
	}

	const lines = normalized.split("\n");
	for (let index = 1; index < lines.length; index += 1) {
		const current = lines[index];
		if (current === "---" || current === "...") {
			return {
				frontmatter: lines.slice(1, index).join("\n"),
				body: lines.slice(index + 1).join("\n"),
				malformedFrontmatter: false,
			};
		}
	}

	return {
		frontmatter: null,
		body: normalized,
		malformedFrontmatter: true,
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function normalizeFrontmatterKey(key: string): string {
	return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isTimeLikeFrontmatterKey(normalizedKey: string): boolean {
	if (!normalizedKey) {
		return false;
	}

	if (normalizedKey === "ctime" || normalizedKey === "mtime") {
		return true;
	}

	return (
		normalizedKey.includes("created") ||
		normalizedKey.includes("updated") ||
		normalizedKey.includes("modified")
	);
}

function isEffectivelyEmptyValue(value: unknown, stack: WeakSet<object>): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	if (typeof value === "string") {
		return value.trim().length === 0;
	}

	if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
		return false;
	}

	if (Array.isArray(value)) {
		return value.every((item) => isEffectivelyEmptyValue(item, stack));
	}

	if (isPlainObject(value)) {
		if (stack.has(value)) {
			return false;
		}
		stack.add(value);
		const entries = Object.values(value);
		if (entries.length === 0) {
			return true;
		}
		return entries.every((entry) => isEffectivelyEmptyValue(entry, stack));
	}

	return false;
}

export function evaluateEmptyDailyNote(content: string, ignoredFrontmatterKeys: string[]): EmptyNoteEvaluation {
	const { frontmatter, body, malformedFrontmatter } = splitFrontmatter(content);
	if (body.trim().length > 0) {
		return {
			isEmpty: false,
			reason: "body-has-content",
		};
	}

	if (!frontmatter) {
		return {
			isEmpty: !malformedFrontmatter,
			reason: malformedFrontmatter ? "frontmatter-parse-error" : "empty-no-frontmatter",
		};
	}

	const yamlDoc = parseDocument(frontmatter, {
		prettyErrors: false,
		strict: false,
	});

	if (yamlDoc.errors.length > 0) {
		return {
			isEmpty: false,
			reason: "frontmatter-parse-error",
		};
	}

	const parsed = yamlDoc.toJS() as unknown;
	if (parsed === null || parsed === undefined) {
		return {
			isEmpty: true,
			reason: "empty-frontmatter-only",
		};
	}

	if (!isPlainObject(parsed)) {
		return {
			isEmpty: false,
			reason: "frontmatter-structure-unsupported",
		};
	}

	const ignoredKeys = new Set(ignoredFrontmatterKeys.map((key) => key.trim().toLowerCase()).filter(Boolean));
	const normalizedIgnoredKeys = new Set(
		ignoredFrontmatterKeys
			.map((key) => normalizeFrontmatterKey(key.trim()))
			.filter((key) => key.length > 0),
	);

	for (const [key, value] of Object.entries(parsed)) {
		const normalizedKey = normalizeFrontmatterKey(key);
		if (
			ignoredKeys.has(key.toLowerCase()) ||
			normalizedIgnoredKeys.has(normalizedKey) ||
			isTimeLikeFrontmatterKey(normalizedKey)
		) {
			continue;
		}

		if (!isEffectivelyEmptyValue(value, new WeakSet<object>())) {
			return {
				isEmpty: false,
				reason: "non-ignored-frontmatter-value",
			};
		}
	}

	return {
		isEmpty: true,
		reason: "empty-frontmatter-only",
	};
}
