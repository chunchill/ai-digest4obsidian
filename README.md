# Follow Builders Sync for Obsidian

An Obsidian plugin that syncs public Follow Builders feed items into Markdown notes and writes a deterministic daily digest.

## What it syncs

- X/Twitter builder posts from the central Follow Builders feed
- Podcast episodes from the central Follow Builders feed
- Blog posts from the central Follow Builders feed

The plugin does not generate AI summaries and does not require API keys. The daily digest is a local, deterministic aggregation of the synced feed content.

## Usage

1. Enable the plugin in Obsidian.
2. Open plugin settings and choose a target folder. The default is `Follow Builders`.
3. Click the ribbon sync icon or run `Sync Follow Builders feeds` from the command palette.

By default, sync writes one daily digest plus one Markdown file per feed item:

```text
Follow Builders/
  Daily/
    2026-05-25.md
  2026-05-25/
    x-example-123.md
    podcast-example-title.md
    blog-example-title.md
```

The `Write daily digest` setting controls the `Daily/YYYY-MM-DD.md` output.

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
