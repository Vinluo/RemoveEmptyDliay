import { Notice } from "obsidian";
import type RemoveEmptyDailyPlugin from "../main";
import { createAppCleanupRuntime, executeCleanup } from "../core/cleanupExecutor";
import { resolveDailyNotesConfig } from "../core/dailyNotesConfig";
import type { CleanupScope } from "../types";
import { ConfirmDeletionModal } from "../ui/ConfirmDeletionModal";

function getScopeLabel(scope: CleanupScope): string {
	if (scope.kind === "today") {
		return "今天";
	}
	if (scope.kind === "recent") {
		return `最近 ${scope.days} 天`;
	}
	return "全部";
}

function showConfigFailureNotice(reason: "internal-plugin-api-unavailable" | "daily-notes-disabled" | "daily-notes-config-missing"): void {
	if (reason === "daily-notes-disabled") {
		new Notice("未启用 daily notes 核心插件，已中止清理。", 5000);
		return;
	}

	if (reason === "daily-notes-config-missing") {
		new Notice("无法读取 daily notes 配置（目录或日期格式缺失），已中止清理。", 5000);
		return;
	}

	new Notice("无法访问 Obsidian 内部 daily notes 接口，已中止清理。", 5000);
}

function showSummaryNotice(scope: CleanupScope, summary: Awaited<ReturnType<typeof executeCleanup>>): void {
	const scopeLabel = getScopeLabel(scope);

	if (summary.status === "no-candidates") {
		new Notice(
			`[${scopeLabel}] 扫描 ${summary.scannedCount} 个每日笔记，候选 0。跳过非空 ${summary.skippedNonEmptyCount}，跳过不确定 ${summary.skippedUncertainCount}。`,
			5000,
		);
		return;
	}

	if (summary.status === "cancelled") {
		new Notice(`[${scopeLabel}] 已取消删除，候选文件 ${summary.candidateCount} 个。`, 5000);
		return;
	}

	new Notice(
		`[${scopeLabel}] 删除 ${summary.deletedCount} 个，失败 ${summary.failedCount} 个，跳过非空 ${summary.skippedNonEmptyCount} 个，跳过不确定 ${summary.skippedUncertainCount} 个。`,
		7000,
	);
}

export async function runCleanupCommand(plugin: RemoveEmptyDailyPlugin, scope: CleanupScope): Promise<void> {
	const configResult = await resolveDailyNotesConfig(plugin.app, {
		folder: plugin.settings.manualDailyNotesFolder,
		format: plugin.settings.manualDailyNotesFormat,
	});
	if (!configResult.ok) {
		showConfigFailureNotice(configResult.reason);
		return;
	}

	const runtime = createAppCleanupRuntime(plugin.app);
	const summary = await executeCleanup({
		runtime,
		config: configResult.config,
		settings: {
			ignoredFrontmatterDateKeys: plugin.settings.ignoredFrontmatterDateKeys,
			requireConfirmation: plugin.settings.requireConfirmation,
		},
		scope,
		confirmDeletion: async (candidatePaths) => {
			const modal = new ConfirmDeletionModal(plugin.app, candidatePaths);
			return modal.openAndWait();
		},
	});

	showSummaryNotice(scope, summary);
}
