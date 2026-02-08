import type RemoveEmptyDailyPlugin from "../main";
import { runCleanupCommand } from "./runCleanupCommand";

export async function cleanAll(plugin: RemoveEmptyDailyPlugin): Promise<void> {
	await runCleanupCommand(plugin, { kind: "all" });
}
