function parseStrictDate(value: string, format: string): Date | null {
	if (format !== "YYYY-MM-DD") {
		return null;
	}

	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	return date;
}

function formatDate(date: Date, format: string): string {
	if (format !== "YYYY-MM-DD") {
		return "";
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

class MockMoment {
	private readonly value: Date;
	private readonly valid: boolean;

	constructor(input?: Date | string, format?: string, strict?: boolean) {
		if (input instanceof Date) {
			this.value = new Date(input);
			this.valid = Number.isFinite(this.value.getTime());
			return;
		}

		if (typeof input === "string") {
			if (format && strict) {
				const parsed = parseStrictDate(input, format);
				this.value = parsed ? new Date(parsed) : new Date(NaN);
				this.valid = parsed !== null;
				return;
			}
			this.value = new Date(input);
			this.valid = Number.isFinite(this.value.getTime());
			return;
		}

		this.value = new Date();
		this.valid = true;
	}

	isValid(): boolean {
		return this.valid;
	}

	format(pattern: string): string {
		if (!this.valid) {
			return "Invalid date";
		}
		return formatDate(this.value, pattern);
	}

	startOf(unit: "day"): MockMoment {
		if (!this.valid || unit !== "day") {
			return new MockMoment(new Date(NaN));
		}

		const date = new Date(this.value);
		date.setHours(0, 0, 0, 0);
		return new MockMoment(date);
	}

	subtract(amount: number, unit: "days" | "day"): MockMoment {
		if (!this.valid || (unit !== "day" && unit !== "days")) {
			return new MockMoment(new Date(NaN));
		}

		const date = new Date(this.value);
		date.setDate(date.getDate() - amount);
		return new MockMoment(date);
	}

	clone(): MockMoment {
		return new MockMoment(this.value);
	}

	toDate(): Date {
		return new Date(this.value);
	}
}

export function moment(input?: Date | string, format?: string, strict?: boolean): MockMoment {
	return new MockMoment(input, format, strict);
}

export class App {}

export class TFile {
	path = "";
	extension = "md";
}

export class PluginSettingTab {
	containerEl: HTMLElement;
	constructor(public app: App) {
		this.containerEl = {} as HTMLElement;
	}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
	setName(_name: string): this { return this; }
	setDesc(_desc: string): this { return this; }
	setHeading(): this { return this; }
	addText(_cb: (component: { setPlaceholder: (v: string) => any; setValue: (v: string) => any; onChange: (fn: (value: string) => any) => any }) => void): this { return this; }
	addToggle(_cb: (component: { setValue: (v: boolean) => any; onChange: (fn: (value: boolean) => any) => any }) => void): this { return this; }
	addTextArea(_cb: (component: { setPlaceholder: (v: string) => any; setValue: (v: string) => any; onChange: (fn: (value: string) => any) => any; inputEl: { rows: number } }) => void): this { return this; }
}
