import type RemoveEmptyDailyPlugin from "../main";
import { runCleanupCommand } from "./runCleanupCommand";

export async function cleanToday(plugin: RemoveEmptyDailyPlugin): Promise<void> {
	await runCleanupCommand(plugin, { kind: "today" });
}
