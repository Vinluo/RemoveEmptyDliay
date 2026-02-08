import { describe, expect, it } from "vitest";
import {
	buildExpectedDailyNotePath,
	getRecentDates,
	isDailyNotePath,
	normalizeVaultPath,
} from "../src/core/dailyNoteMatcher";
import type { DailyNotesConfig } from "../src/types";

const config: DailyNotesConfig = {
	folder: "Daily",
	format: "YYYY-MM-DD",
};

describe("dailyNoteMatcher", () => {
	function formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	it("normalizes path separators", () => {
		expect(normalizeVaultPath("Daily\\2026-02-08.md")).toBe("Daily/2026-02-08.md");
	});

	it("matches strict daily note file path", () => {
		expect(isDailyNotePath("Daily/2026-02-08.md", config)).toBe(true);
		expect(isDailyNotePath("Daily/2026-2-8.md", config)).toBe(false);
	});

	it("rejects non-md or wrong folder files", () => {
		expect(isDailyNotePath("Notes/2026-02-08.md", config)).toBe(false);
		expect(isDailyNotePath("Daily/2026-02-08.txt", config)).toBe(false);
	});

	it("builds expected path based on date and format", () => {
		const date = new Date("2026-02-08T12:00:00Z");
		expect(buildExpectedDailyNotePath(config, date)).toBe("Daily/2026-02-08.md");
	});

	it("creates descending recent day list", () => {
		const dates = getRecentDates(3, new Date("2026-02-08T15:22:00Z"));
		expect(dates).toHaveLength(3);
		expect(formatDate(dates[0])).toBe("2026-02-08");
		expect(formatDate(dates[1])).toBe("2026-02-07");
		expect(formatDate(dates[2])).toBe("2026-02-06");
	});
});
