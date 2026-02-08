import { Plugin } from "obsidian";
import { registerCommands } from "./commands/registerCommands";
import { normalizeSettings, RemoveEmptyDailySettingTab } from "./settings";
import { RemoveEmptyDailySettings } from "./types";

export default class RemoveEmptyDailyPlugin extends Plugin {
	settings: RemoveEmptyDailySettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		registerCommands(this);
		this.addSettingTab(new RemoveEmptyDailySettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData() as Partial<RemoveEmptyDailySettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
