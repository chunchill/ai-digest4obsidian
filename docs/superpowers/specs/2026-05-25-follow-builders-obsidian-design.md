# Follow Builders Obsidian Plugin Design

Date: 2026-05-25

## Goal

Build an Obsidian plugin that lets the user manually sync the public Follow Builders central feeds into a configured vault folder. The first version archives raw feed items only. It does not generate AI summaries and does not require API keys.

## Scope

The plugin will:

- Add a ribbon action and command palette command to run sync on demand.
- Fetch the public central JSON feeds from `zarazhangrui/follow-builders`.
- Sync X/Twitter, podcast, and blog feed items.
- Store each feed item as one Markdown file under a date folder.
- Import all currently visible feed items on first sync.
- Deduplicate future syncs by stable item IDs.
- Provide a settings tab for folder and source options.

The plugin will not:

- Generate AI digest summaries.
- Schedule automatic syncs.
- Modify the upstream source list.
- Require Node.js scripts, local `follow-builders` installation, or external API keys.

## External Feed Contract

The plugin will fetch these public JSON endpoints:

- `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json`
- `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json`
- `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json`

The current upstream model has:

- `feed-x.json`: top-level `generatedAt`, `x[]`, each builder with `name`, `handle`, `bio`, and `tweets[]`.
- Tweet items: `id`, `text`, `createdAt`, `url`, `likes`, `retweets`, `replies`, `isQuote`, `quotedTweetId`.
- `feed-podcasts.json`: top-level `podcasts[]`.
- `feed-blogs.json`: top-level `blogs[]`.

The plugin will parse defensively. Required fields for writing an item are a stable identity, a URL, content text or title, and a date. Items missing enough data to create a meaningful note are skipped and counted in the sync result.

## User Experience

The plugin loads with:

- Ribbon icon: `refresh-cw`, tooltip `Sync Follow Builders`.
- Command: `Sync Follow Builders feeds`.
- Settings tab: `Follow Builders Sync`.

When the user runs sync:

1. Show a short notice that sync started.
2. Fetch enabled feeds.
3. Convert feed items into normalized internal items.
4. Create the target folder tree if needed.
5. Write new Markdown files and skip already-synced items.
6. Persist sync state.
7. Show a result notice with created, skipped, and failed counts.

Default target root folder:

```text
Follow Builders
```

File layout:

```text
Follow Builders/
  2026-05-25/
    x-karpathy-2058380417716125966.md
    podcast-latent-space-example-episode.md
    blog-anthropic-engineering-example-title.md
```

## Settings

Persistent settings stored through Obsidian plugin data:

```ts
interface FollowBuildersSettings {
  targetFolder: string;
  syncX: boolean;
  syncPodcasts: boolean;
  syncBlogs: boolean;
  overwriteExisting: boolean;
}
```

Defaults:

```ts
{
  targetFolder: "Follow Builders",
  syncX: true,
  syncPodcasts: true,
  syncBlogs: true,
  overwriteExisting: false
}
```

The settings tab will include:

- Text input for target folder.
- Toggles for X, Podcasts, and Blogs.
- Toggle for overwrite existing files.
- Button to clear sync history after confirmation text in the setting description.

## Sync State

The plugin will store sync state in plugin data alongside settings:

```ts
interface FollowBuildersSyncState {
  syncedIds: Record<string, true>;
  lastSyncedAt?: string;
}
```

Stable IDs:

- X: `x:<tweet.id>`
- Podcast: `podcast:<url>` if no stronger upstream ID exists
- Blog: `blog:<url>` if no stronger upstream ID exists

If `overwriteExisting` is `false`, an item is skipped when either its stable ID is in state or the target file already exists.

If `overwriteExisting` is `true`, the plugin updates an existing file with the regenerated Markdown and still records the stable ID.

## Internal Components

`main.ts`

- Plugin lifecycle.
- Settings and state load/save.
- Ribbon and command registration.
- Settings tab registration.
- Sync orchestration.

`settings.ts`

- `PluginSettingTab` implementation.
- Settings controls.
- Clear history action.

`feeds.ts`

- Feed endpoint constants.
- Fetch helpers using Obsidian network APIs.
- Defensive parsers for X, podcast, and blog feeds.
- Conversion into normalized `FeedItem` objects.

`writer.ts`

- Date folder creation.
- File path generation.
- Markdown rendering.
- Create or modify behavior.

`slug.ts`

- Filename-safe slug generation.
- Path normalization helpers.

`types.ts`

- Settings, state, raw feed, and normalized item types.

## Normalized Item Model

```ts
interface FeedItem {
  id: string;
  source: "x" | "podcast" | "blog";
  title: string;
  author?: string;
  handle?: string;
  bio?: string;
  url: string;
  createdAt: string;
  body: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
}
```

## Markdown Format

Each note uses frontmatter plus raw content:

```md
---
source: x
title: "Author: first words of post"
author: "Author"
handle: "handle"
url: "https://x.com/example/status/123"
created: "2026-05-24T02:51:49.000Z"
synced: "2026-05-25T03:30:00.000Z"
follow_builders_id: "x:123"
tags:
  - follow-builders
  - ai
---

# Author: first words of post

> Source: [Original link](https://x.com/example/status/123)

## Content

Raw item content.

## Metadata

- Author: Author
- Handle: @handle
- Likes: 29
- Retweets: 0
- Replies: 2
```

Podcast and blog notes use the same shape, replacing X-specific metadata with available upstream fields.

## Error Handling

Network failure:

- Fail the affected feed.
- Continue syncing other enabled feeds.
- Include failed feed count in the final notice.

Malformed items:

- Skip individual malformed items.
- Do not abort the whole sync.

File system errors:

- Stop writing the affected item.
- Continue with remaining items where possible.
- Show a final notice with failure count.

Folder conflicts:

- If a target folder path already exists as a file, abort sync and show an actionable notice.

## Testing Strategy

Unit tests:

- X feed parser converts builders and tweets into normalized items.
- Podcast and blog parser tolerate missing optional fields.
- Slug generation removes path separators and unsafe filename characters.
- Date folder selection uses item `createdAt`.
- Deduplication skips known IDs.
- Markdown renderer produces stable frontmatter and body sections.

Integration-level tests where feasible:

- Sync orchestration writes only new items.
- Existing files are skipped by default.
- `overwriteExisting` modifies existing files.
- Partial feed failure still writes successful feeds.

## Implementation Notes

The plugin should be scaffolded as a standard TypeScript Obsidian plugin. It should use Obsidian APIs for commands, ribbon actions, settings, network requests, and vault writes. It should not shell out to Node.js or assume any local `follow-builders` checkout.

The first implementation should keep the parsing and writing modules small and independent so an AI-summary digest feature can be added later without rewriting the archival path.
