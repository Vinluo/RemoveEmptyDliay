import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
	it("merges saved ignored keys with default ignored keys", () => {
		const settings = normalizeSettings({
			ignoredFrontmatterDateKeys: ["ctime"],
			recentDays: 10,
			requireConfirmation: true,
			manualDailyNotesFolder: "Daily",
			manualDailyNotesFormat: "YYYY-MM-DD",
		});

		expect(settings.ignoredFrontmatterDateKeys).toContain("created");
		expect(settings.ignoredFrontmatterDateKeys).toContain("late modified");
		expect(settings.recentDays).toBe(10);
		expect(settings.manualDailyNotesFolder).toBe("Daily");
		expect(settings.manualDailyNotesFormat).toBe("YYYY-MM-DD");
	});
});
