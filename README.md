# Remove Empty Daily Notes (Obsidian Plugin)

Safely clean up empty daily notes created by Obsidian Daily notes.

## What It Does

- Provides 3 commands:
  - `Clean today's empty daily notes`
  - `Clean recent n days empty daily notes`
  - `Clean all empty daily notes`
- Only processes notes recognized as Daily notes.
- Uses a confirmation list before deletion (enabled by default).
- Moves files to trash instead of permanent deletion.
- Supports manual daily notes config override when auto-detection fails.

## Empty Note Rules (Safety First)

A note is considered deletable only when all checks pass:

1. Note body is whitespace-only.
2. Frontmatter has no meaningful non-ignored values.
3. Ignored keys are case-insensitive and punctuation-insensitive.
4. If frontmatter parsing is uncertain, the note is skipped.

Default ignored keys include:

- `ctime`
- `mtime`
- `created`
- `updated`
- `created_at`
- `updated_at`
- `createdtime`
- `updatedtime`
- `late modified`
- `last modified`
- `date modified`
- `date-modified`

## Settings

- `Default recent n days`: default `30`
- `Require confirmation before delete`: default `true`
- `Ignored frontmatter keys`: comma/newline separated
- `Daily notes folder override (optional)`
- `Daily notes date format override (optional)`

If auto-read fails, set folder + date format manually (for example `YYYY-MM-DD`).

## Chinese UI Labels (Current)

Current command labels in the plugin UI are Chinese:

- `清理今天的空白每日笔记`
- `清理最近 n 天空白每日笔记`
- `清理全部空白每日笔记`

Current setting labels in the plugin UI are Chinese:

- `最近 n 天默认值`
- `删除前二次确认`
- `属性忽略字段`
- `每日笔记目录覆盖（可选）`
- `每日笔记日期格式覆盖（可选）`

## Development

```bash
npm install
npm run dev
npm run test
npm run build
```

## Manual Installation

Copy these 3 files to:

`<Vault>/.obsidian/plugins/remove-empty-daily/`

- `main.js`
- `manifest.json`
- `styles.css`

Then enable it in **Settings → Community plugins**.

## Privacy

- No telemetry
- No network calls
- Manual command execution only
