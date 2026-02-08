import { Modal } from "obsidian";

export class ConfirmDeletionModal extends Modal {
	private readonly candidatePaths: string[];
	private resolver: ((confirmed: boolean) => void) | null = null;
	private resolved = false;

	constructor(app: Modal["app"], candidatePaths: string[]) {
		super(app);
		this.candidatePaths = candidatePaths;
	}

	openAndWait(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolver = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "确认删除空白每日笔记" });
		contentEl.createEl("p", {
			text: `将删除 ${this.candidatePaths.length} 个空白每日笔记（移动到系统回收站）：`,
		});

		const listContainer = contentEl.createDiv();
		listContainer.addClass("remove-empty-daily-list");
		listContainer.addClass("remove-empty-daily-list-container");

		for (const path of this.candidatePaths) {
			listContainer.createEl("div", { text: path });
		}

		const buttonRow = contentEl.createDiv();
		buttonRow.addClass("remove-empty-daily-button-row");

		const cancelButton = buttonRow.createEl("button", { text: "取消" });
		cancelButton.addEventListener("click", () => this.finish(false));

		const confirmButton = buttonRow.createEl("button", { text: "确认删除" });
		confirmButton.addClass("mod-warning");
		confirmButton.addEventListener("click", () => this.finish(true));
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) {
			this.finish(false);
		}
	}

	private finish(confirmed: boolean): void {
		if (this.resolved) {
			return;
		}

		this.resolved = true;
		this.resolver?.(confirmed);
		this.resolver = null;
		if (this.modalEl.isConnected) {
			this.close();
		}
	}
}
