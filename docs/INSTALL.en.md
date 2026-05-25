# Follow Builders Sync Installation and Configuration Guide

This guide explains how to install and test `Follow Builders Sync` in a local Obsidian vault.

## What It Does

The plugin syncs public Follow Builders feed items into date-named digest notes in Obsidian:

- X/Twitter builder posts
- Podcast episodes
- Blog posts

Each digest groups the day's fetched items. The plugin does not generate AI summaries, does not require an OpenAI API key, and does not require a local `follow-builders` checkout.

## Install from a Release Package

Download the release zip, unzip it, and run the installer from the unzipped folder:

```bash
bash install-to-vault.sh "/path/to/your/vault"
```

The installer copies the packaged plugin files into:

```text
/path/to/your/vault/.obsidian/plugins/follow-builders-sync/
```

The release package includes:

```text
manifest.json
main.js
install-to-vault.sh
README.md
docs/INSTALL.en.md
docs/INSTALL.zh-CN.md
```

If `styles.css` is added in a future version, the installer will copy it automatically when present.

## Build from Source

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

## Install with the Script from Source

After building from source, run:

```bash
bash scripts/install-to-vault.sh "/path/to/your/vault"
```

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

For the first test, keep the defaults.

## Run Sync

You can sync in either of these ways:

1. Click the sync icon in Obsidian's left ribbon.
2. Open the command palette and run `Sync Follow Builders feeds`.

Each sync fetches the currently visible central feed items and creates or updates the digest notes for the dates present in that fetch.

## Output Structure

Default output:

```text
Follow Builders/
  2026-05-25.md
  2026-05-26.md
```

Each `YYYY-MM-DD.md` file is a date-level aggregation with sections for podcasts, X/Twitter, and blogs when those sources have content. It is deterministic and based only on the fetched feed fields; it is not an AI-generated summary.

Each digest note contains:

- frontmatter
- source sections
- source names or authors
- excerpts from the fetched content
- original links for included items

## Network Requirements

The plugin must be able to reach the public Follow Builders feeds on GitHub Raw:

```text
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json
https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json
```

If sync fails, first confirm that your network can access these URLs.

## Update the Plugin

For a release package, unzip the new package and rerun:

```bash
bash install-to-vault.sh "/path/to/your/vault"
```

For source installs, rebuild and run the source installer:

```bash
npm run build
bash scripts/install-to-vault.sh "/path/to/your/vault"
```

Then reload the plugin in Obsidian or restart Obsidian.

## Build a Release Package

Maintainers can create the zip used for releases with:

```bash
npm run package
```

The generated file is written under `dist/` and includes the root-level `install-to-vault.sh` script.

## Troubleshooting

- Plugin does not appear: confirm that `manifest.json` and `main.js` were copied, and that the plugin folder is named `follow-builders-sync`.
- Installer says `Vault directory does not exist`: pass the vault folder itself, not the `.obsidian` folder.
- Sync creates no files: confirm the target folder setting is valid and check the Obsidian Notice for feed access failures.
- Repeated syncs create no new date files: this is expected when the feed only contains dates that already have digest notes; existing digest notes are updated.
- Re-import from scratch: delete the generated digest Markdown files, then sync again.
