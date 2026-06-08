# Follow Builders Sync for Obsidian

An Obsidian plugin that syncs public Follow Builders feed items into deterministic daily digest notes.

## What it syncs

- X/Twitter builder posts from the central Follow Builders feed
- Podcast episodes from the central Follow Builders feed
- Blog posts from the central Follow Builders feed

The plugin does not generate AI summaries and does not require API keys. The digest is a local, deterministic aggregation of the synced feed content.

## Usage

1. Enable the plugin in Obsidian.
2. Open plugin settings and choose a target folder. The default is `Follow Builders`.
3. Click the ribbon sync icon or run `Sync Follow Builders feeds` from the command palette.

Sync writes one date-named digest note directly under the target folder:

```text
Follow Builders/
  2026-05-25.md
  2026-05-26.md
```

The plugin does not write separate raw feed item notes into the vault.

## Install from a Release Package

Download the `follow-builders-sync-<version>.zip` asset from the [GitHub Releases page](https://github.com/chunchill/ai-digest4obsidian/releases), not the tag page's `Source code (zip)`.

Download and unzip the release package, then run:

```bash
bash install-to-vault.sh "/path/to/your/obsidian/vault"
```

The script installs `manifest.json`, `main.js`, and optional `styles.css` into:

```text
/path/to/your/obsidian/vault/.obsidian/plugins/follow-builders-sync/
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

Create a release zip:

```bash
npm run package
```
