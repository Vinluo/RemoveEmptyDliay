import { describe, expect, it } from "vitest";
import { evaluateEmptyDailyNote } from "../src/core/emptyNoteEvaluator";

const ignored = ["ctime", "mtime", "created", "updated", "late modified"];

describe("evaluateEmptyDailyNote", () => {
	it("treats whitespace-only note as empty", () => {
		const result = evaluateEmptyDailyNote("\n \t\n", ignored);
		expect(result.isEmpty).toBe(true);
		expect(result.reason).toBe("empty-no-frontmatter");
	});

	it("treats note with only ignored frontmatter keys as empty", () => {
		const content = "---\nctime: 2026-02-08\nmtime: 2026-02-08\n---\n\n";
		const result = evaluateEmptyDailyNote(content, ignored);
		expect(result.isEmpty).toBe(true);
		expect(result.reason).toBe("empty-frontmatter-only");
	});

	it("treats localized created/late modified frontmatter as empty when ignored", () => {
		const content = "---\ncreated: 二月 8日 2026, 10:30:28 晚上\nLate modified: 二月 8日 2026, 10:30:32 晚上\n---\n\n";
		const result = evaluateEmptyDailyNote(content, ignored);
		expect(result.isEmpty).toBe(true);
		expect(result.reason).toBe("empty-frontmatter-only");
	});

	it("treats modified key variants as empty even with punctuation differences", () => {
		const content = "---\nCreated Time: 2026-02-08\nLast-Modified: 2026-02-08\nDate_Modified: 2026-02-08\n---\n\n";
		const result = evaluateEmptyDailyNote(content, ["created", "last modified"]);
		expect(result.isEmpty).toBe(true);
		expect(result.reason).toBe("empty-frontmatter-only");
	});

	it("skips deletion when non-ignored frontmatter has value", () => {
		const content = "---\nctime: 2026-02-08\ntitle: Daily log\n---\n\n";
		const result = evaluateEmptyDailyNote(content, ignored);
		expect(result.isEmpty).toBe(false);
		expect(result.reason).toBe("non-ignored-frontmatter-value");
	});

	it("allows deletion when non-ignored frontmatter key exists but empty", () => {
		const content = "---\ntitle:\n---\n\n";
		const result = evaluateEmptyDailyNote(content, ignored);
		expect(result.isEmpty).toBe(true);
		expect(result.reason).toBe("empty-frontmatter-only");
	});

	it("marks malformed frontmatter as uncertain", () => {
		const content = "---\nctime: [\n---\n\n";
		const result = evaluateEmptyDailyNote(content, ignored);
		expect(result.isEmpty).toBe(false);
		expect(result.reason).toBe("frontmatter-parse-error");
	});

	it("treats body text as non-empty", () => {
		const content = "---\nctime: 2026-02-08\n---\n\nHello";
		const result = evaluateEmptyDailyNote(content, ignored);
		expect(result.isEmpty).toBe(false);
		expect(result.reason).toBe("body-has-content");
	});
});
