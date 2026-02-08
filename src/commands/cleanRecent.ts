import type RemoveEmptyDailyPlugin from "../main";
import { runCleanupCommand } from "./runCleanupCommand";

export async function cleanRecent(plugin: RemoveEmptyDailyPlugin): Promise<void> {
	await runCleanupCommand(plugin, {
		kind: "recent",
		days: plugin.settings.recentDays,
	});
}
