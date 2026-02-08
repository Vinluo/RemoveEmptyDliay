import type RemoveEmptyDailyPlugin from "../main";
import { cleanAll } from "./cleanAll";
import { cleanRecent } from "./cleanRecent";
import { cleanToday } from "./cleanToday";

export function registerCommands(plugin: RemoveEmptyDailyPlugin): void {
	plugin.addCommand({
		id: "clean-empty-daily-today",
		name: "清理今天的空白每日笔记",
		callback: () => {
			void cleanToday(plugin);
		},
	});

	plugin.addCommand({
		id: "clean-empty-daily-recent",
		name: "清理最近 n 天空白每日笔记",
		callback: () => {
			void cleanRecent(plugin);
		},
	});

	plugin.addCommand({
		id: "clean-empty-daily-all",
		name: "清理全部空白每日笔记",
		callback: () => {
			void cleanAll(plugin);
		},
	});
}
