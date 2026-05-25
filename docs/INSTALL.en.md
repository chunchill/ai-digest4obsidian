# Follow Builders Sync Installation and Configuration Guide

This guide explains how to manually install and test `Follow Builders Sync` in a local Obsidian vault.

## What It Does

The plugin syncs raw public Follow Builders feed items into Obsidian:

- X/Twitter builder posts
- Podcast episodes
- Blog posts

It also creates a deterministic daily digest note that groups the day's synced items. It does not generate AI summaries, does not require an OpenAI API key, and does not require a local `follow-builders` checkout.

## Build the Plugin

From this project directory, run:

```bash
npm install
npm run build
```

After a successful build, the installable plugin files are:

```text
manifest.json
main.js
```

This plugin currently has no `styles.css`, so there is no stylesheet to copy.

## Manual Installation

Assume your Obsidian vault path is:

```text
/path/to/your/vault
```

Create the plugin directory:

```bash
mkdir -p "/path/to/your/vault/.obsidian/plugins/follow-builders-sync"
```

Copy the plugin files:

```bash
cp manifest.json main.js "/path/to/your/vault/.obsidian/plugins/follow-builders-sync/"
```

If you are testing from this repository's isolated worktree, use:

```bash
cd /Users/jasper.qiu/Projects/ai-labs/ai-digest4obsidian/.worktrees/follow-builders-sync
mkdir -p "/path/to/your/vault/.obsidian/plugins/follow-builders-sync"
cp manifest.json main.js "/path/to/your/vault/.obsidian/plugins/follow-builders-sync/"
```

## Enable in Obsidian

1. Open Obsidian.
2. Open the target vault.
3. Go to `Settings` -> `Community plugins`.
4. Enable Community plugins if they are not enabled yet.
5. Find `Follow Builders Sync` in the installed plugins list.
6. Enable the plugin.

If the plugin does not appear, restart Obsidian and confirm that both the folder name and manifest id are:

```text
follow-builders-sync
```

## Plugin Settings

Open `Settings` -> `Community plugins` -> `Follow Builders Sync`.

Available settings:

- `Target folder`: Root folder for synced notes. Default: `Follow Builders`.
- `Sync X posts`: Sync X/Twitter items.
- `Sync podcasts`: Sync podcast items.
- `Sync blogs`: Sync blog items.
- `Write daily digest`: Create or update one `Daily/YYYY-MM-DD.md` digest note for each synced day. Enabled by default.
- `Overwrite existing files`: Rewrite existing Markdown files. Disabled by default.
- `Clear sync history`: Clear remembered synced IDs. This does not delete existing Markdown files.

For the first test, keep the defaults.

## Run Sync

You can sync in either of these ways:

1. Click the sync icon in Obsidian's left ribbon.
2. Open the command palette and run `Sync Follow Builders feeds`.

The first sync imports all items currently visible in the central feeds. Later syncs skip duplicates using synced IDs and existing files.

## Output Structure

Default output:

```text
Follow Builders/
  Daily/
    2026-05-25.md
  2026-05-25/
    x-example-123.md
    podcast-example-title.md
    blog-example-title.md
```

The `Daily/2026-05-25.md` file is a date-level aggregation with sections for podcasts, X/Twitter, and blogs when those sources have content. It is deterministic and based only on the fetched feed fields; it is not an AI-generated summary.

Each item becomes one Markdown file containing:

- frontmatter
- original link
- author or source
- raw body or available title
- available metadata

## Network Requirements

The plugin must be able to reach the public Follow Builders feeds on GitHub Raw:

```text
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json
```

If sync fails, first confirm that your network can access these URLs.

## Update the Plugin

Rebuild and copy the files again:

```bash
npm run build
cp manifest.json main.js "/path/to/your/vault/.obsidian/plugins/follow-builders-sync/"
```

Then reload the plugin in Obsidian or restart Obsidian.

## Troubleshooting

- Plugin does not appear: confirm that `manifest.json` and `main.js` were copied, and that the plugin folder is named `follow-builders-sync`.
- Sync creates no files: confirm the target folder setting is valid and check the Obsidian Notice for feed access failures.
- Repeated syncs create no new files: this is expected when the feed has no new items.
- Re-import from scratch: click `Clear sync history`; if needed, delete generated Markdown files, then sync again.
