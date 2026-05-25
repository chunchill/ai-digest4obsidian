# Follow Builders Daily Digest Design

Date: 2026-05-25

## Goal

Upgrade the Obsidian plugin so one manual sync can also produce a date-named daily digest note that aggregates all Follow Builders items for that day. The first digest version is deterministic and does not require an LLM API key. It should follow the spirit and layout of upstream `follow-builders` sample digests while staying reliable inside Obsidian.

## Upstream Reference

`follow-builders` has three responsibilities:

- `scripts/generate-feed.js` runs centrally in GitHub Actions and writes public feed files for X, podcasts, and blogs.
- `scripts/prepare-digest.js` fetches those feeds plus prompt files and outputs one JSON payload for an agent.
- `SKILL.md` instructs the agent to remix that JSON into a digest, then `scripts/deliver.js` sends the result through stdout, Telegram, or email.

The JavaScript scripts do not perform the final summary writing themselves. The polished digest is an agent/LLM step. Because this Obsidian plugin should work from a click without extra services, this iteration will implement a deterministic daily digest first and leave true LLM remixing as a future optional mode.

## Scope

This iteration will:

- Preserve the existing per-item archive behavior.
- Add a new daily digest output mode that can be enabled in settings.
- Group fetched and previously synced items by item `createdAt` date.
- Write one Markdown digest per affected date.
- Use the upstream sample shape:
  - title `AI Builders Digest — YYYY-MM-DD`
  - `PODCASTS`
  - `X / TWITTER`
  - `BLOGS`
- Include source URLs for every included item.
- Make digest writes idempotent so repeated syncs update the same daily note instead of creating duplicates.

This iteration will not:

- Call OpenAI, Anthropic, or any other LLM API.
- Fetch upstream prompt files at runtime.
- Add scheduled sync.
- Remove or change existing raw item notes.
- Implement weekly digests.

## User Experience

Settings add one toggle:

```ts
writeDailyDigest: boolean;
```

Default:

```ts
writeDailyDigest: true;
```

When enabled, every sync writes or updates daily digest notes under:

```text
Follow Builders/
  Daily/
    2026-05-25.md
```

The existing raw archive remains:

```text
Follow Builders/
  2026-05-25/
    x-karpathy-123.md
```

The final sync notice should include digest counts alongside raw item counts, for example:

```text
Follow Builders sync complete: 8 created, 2 skipped, 1 digest updated.
```

## Data Flow

1. Fetch enabled feeds with the existing feed parser.
2. Build a list of candidate items for digest generation.
3. Write raw item notes using the existing writer and sync history rules.
4. Group candidate items by `YYYY-MM-DD` derived from each item's `createdAt`.
5. For each affected date, render one digest Markdown file and create or update it.
6. Persist sync state.

Digest grouping should include every item returned by the current fetch, even if the raw item note is skipped because it was already synced. This lets a user rerun sync and regenerate the daily digest without clearing history.

## Digest Content

The deterministic digest renderer will use available feed fields rather than inventing summaries.

Podcast entries:

```md
Latent Space — "Episode Title"
Bottom line: <first useful excerpt from transcript/body>

Key material:
- <trimmed excerpt line>

https://youtube.com/...
```

X entries:

```md
Andrej Karpathy (@karpathy)
<tweet text trimmed to a readable paragraph>
https://x.com/karpathy/status/...
```

Multiple tweets from the same builder on the same day should be grouped under that builder.

Blog entries:

```md
Anthropic Engineering — "Article Title"
Bottom line: <description or first useful excerpt>
https://...
```

If a section has no items, omit the section.

## Markdown Metadata

Each digest note starts with frontmatter:

```md
---
type: follow-builders-digest
date: "2026-05-25"
generated: "2026-05-25T10:00:00.000Z"
item_count: 8
sources:
  - x
  - podcast
  - blog
tags:
  - follow-builders
  - ai
  - digest
---
```

The body starts with:

```md
# AI Builders Digest — 2026-05-25
```

## Internal Components

`src/digest.ts`

- Group items by date.
- Group X items by builder.
- Render deterministic daily digest Markdown.
- Build digest file paths.

`src/writer.ts`

- Reuse folder creation behavior for digest files.
- Add `writeDailyDigest` or a small generic Markdown write helper.

`src/sync.ts`

- Accept an optional digest writer dependency for tests.
- After feed fetch, call digest writer for affected dates when enabled.
- Extend sync result with digest created/updated/skipped/failed counts.

`src/types.ts`

- Add `writeDailyDigest` to settings.
- Add digest result counters to `SyncResult`.

`src/settings.ts`

- Add one toggle for daily digest notes.

`src/main.ts`

- Wire the digest writer into `runSync`.
- Include digest results in the user notice.

## Error Handling

- A malformed item that could not be parsed into `FeedItem` remains the feed parser's responsibility and is skipped before digesting.
- If a digest path already exists as a folder, count that digest as failed and continue raw item writing.
- If raw item writing fails for one item, digest generation should still run for the fetched items.
- If digest writing fails, raw item state should still be saved for successfully written raw items.

## Testing Strategy

Add unit tests before implementation:

- Digest grouping creates one group per item date.
- Digest rendering matches section ordering: podcasts, X/Twitter, blogs.
- X tweets from the same builder are grouped together.
- Digest writer creates `Follow Builders/Daily/YYYY-MM-DD.md` and updates the same file on rerun.
- `runSync` can regenerate digest notes even when raw item IDs are already in sync history.
- Settings defaults enable daily digest without changing existing source toggles.

## Future Extension

A later iteration can add optional AI remixing:

- provider base URL
- API key stored through Obsidian settings
- model name
- output language
- prompt templates modeled after upstream `follow-builders/prompts`

That future mode should consume the same grouped daily item model introduced here.
