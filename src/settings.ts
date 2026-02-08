import { App, PluginSettingTab, Setting } from "obsidian";
import type RemoveEmptyDailyPlugin from "./main";
import { RemoveEmptyDailySettings } from "./types";

export const DEFAULT_IGNORED_DATE_KEYS = [
	"ctime",
	"mtime",
	"created",
	"updated",
	"created_at",
	"updated_at",
	"createdtime",
	"updatedtime",
	"late modified",
	"last modified",
	"date modified",
	"date-modified",
];

export const DEFAULT_SETTINGS: RemoveEmptyDailySettings = {
	recentDays: 30,
	requireConfirmation: true,
	ignoredFrontmatterDateKeys: DEFAULT_IGNORED_DATE_KEYS,
	manualDailyNotesFolder: "",
	manualDailyNotesFormat: "",
};

export function normalizeSettings(
	raw: Partial<RemoveEmptyDailySettings> | null | undefined,
): RemoveEmptyDailySettings {
	const merged = Object.assign({}, DEFAULT_SETTINGS, raw);
	const normalizedIgnored = normalizeIgnoredKeys(
		[...(merged.ignoredFrontmatterDateKeys ?? []), ...DEFAULT_IGNORED_DATE_KEYS].join(","),
	);

	return {
		recentDays: Number.isFinite(merged.recentDays) && merged.recentDays > 0 ? Math.floor(merged.recentDays) : DEFAULT_SETTINGS.recentDays,
		requireConfirmation: merged.requireConfirmation !== false,
		ignoredFrontmatterDateKeys: normalizedIgnored,
		manualDailyNotesFolder: (merged.manualDailyNotesFolder ?? "").trim(),
		manualDailyNotesFormat: (merged.manualDailyNotesFormat ?? "").trim(),
	};
}

function normalizeIgnoredKeys(input: string): string[] {
	const result: string[] = [];
	const seen = new Set<string>();

	for (const rawKey of input.split(/[\n,]/)) {
		const key = rawKey.trim();
		if (!key) {
			continue;
		}

		const dedupeKey = key.toLowerCase();
		if (seen.has(dedupeKey)) {
			continue;
		}

		seen.add(dedupeKey);
		result.push(key);
	}

	return result;
}

export class RemoveEmptyDailySettingTab extends PluginSettingTab {
	plugin: RemoveEmptyDailyPlugin;

	constructor(app: App, plugin: RemoveEmptyDailyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("空白每日笔记清理设置").setHeading();

		new Setting(containerEl)
			.setName("最近 n 天默认值")
			.setDesc("“清理最近 n 天空白每日笔记”命令使用的默认天数。")
			.addText((text) => {
				text
					.setPlaceholder("30")
					.setValue(String(this.plugin.settings.recentDays))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value.trim(), 10);
						if (!Number.isFinite(parsed) || parsed < 1) {
							return;
						}

						this.plugin.settings.recentDays = parsed;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("删除前二次确认")
			.setDesc("开启后会先显示待删除文件列表，确认后才执行删除。")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.requireConfirmation).onChange(async (value) => {
					this.plugin.settings.requireConfirmation = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("属性忽略字段")
			.setDesc("多个字段可使用逗号或换行分隔。字段名大小写不敏感。")
			.addTextArea((textArea) => {
				textArea
					.setPlaceholder("例如：ctime, mtime, created, updated")
					.setValue(this.plugin.settings.ignoredFrontmatterDateKeys.join(", "))
					.onChange(async (value) => {
						const normalized = normalizeIgnoredKeys(value);
						this.plugin.settings.ignoredFrontmatterDateKeys = normalized;
						await this.plugin.saveSettings();
					});

					textArea.inputEl.rows = 4;
				});

		new Setting(containerEl)
			.setName("每日笔记目录覆盖（可选）")
			.setDesc("留空表示自动读取 daily notes 配置。填写后将优先使用该目录。")
			.addText((text) => {
				text
					.setPlaceholder("例如：003-每日笔记")
					.setValue(this.plugin.settings.manualDailyNotesFolder)
					.onChange(async (value) => {
						this.plugin.settings.manualDailyNotesFolder = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("每日笔记日期格式覆盖（可选）")
			.setDesc("留空表示自动读取。填写后将优先使用该格式，例如 yyyy-mm-dd。")
			.addText((text) => {
				text
					.setPlaceholder("例如：yyyy-mm-dd")
					.setValue(this.plugin.settings.manualDailyNotesFormat)
					.onChange(async (value) => {
						this.plugin.settings.manualDailyNotesFormat = value.trim();
						await this.plugin.saveSettings();
					});
			});
	}
}
