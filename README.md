# Follow Builders Sync for Obsidian

An Obsidian plugin that syncs raw public Follow Builders feed items into Markdown notes.

## What it syncs

- X/Twitter builder posts from the central Follow Builders feed
- Podcast episodes from the central Follow Builders feed
- Blog posts from the central Follow Builders feed

The plugin does not generate AI summaries and does not require API keys.

## Usage

1. Enable the plugin in Obsidian.
2. Open plugin settings and choose a target folder. The default is `Follow Builders`.
3. Click the ribbon sync icon or run `Sync Follow Builders feeds` from the command palette.

Notes are written as one Markdown file per feed item:

```text
Follow Builders/
  2026-05-25/
    x-example-123.md
```

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm run test
```

Build:

```bash
npm run build
```
