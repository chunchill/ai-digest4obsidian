# Follow Builders Daily Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic daily digest Markdown notes to the existing Follow Builders Obsidian sync plugin while preserving per-item raw archives.

**Architecture:** Add a focused digest module for grouping and rendering daily notes. Reuse the existing vault writer folder-safety behavior for digest file creation and updates. Extend sync orchestration and plugin settings so digest writing is opt-out and testable through dependency injection.

**Tech Stack:** TypeScript, Obsidian Plugin API, Vitest, esbuild.

---

## File Map

- Create `src/digest.ts`: daily grouping, digest path building, digest Markdown rendering.
- Create `tests/digest.test.ts`: unit tests for grouping, rendering, and digest path.
- Modify `src/types.ts`: add `writeDailyDigest` setting and digest counters.
- Modify `tests/types.test.ts`: assert default digest setting and result shape expectations.
- Modify `src/writer.ts`: export a reusable Markdown writer and add `writeDailyDigest`.
- Modify `tests/writer.test.ts`: cover digest create and update behavior.
- Modify `src/sync.ts`: call digest writer after item writes, even when item writes are skipped by sync history.
- Modify `tests/sync.test.ts`: cover digest regeneration for already-synced items and failure accounting.
- Modify `src/settings.ts`: add a daily digest toggle.
- Modify `src/main.ts`: load saved digest setting, wire digest writer, and include digest counts in Notice text.
- Modify `README.md`, `docs/INSTALL.en.md`, and `docs/INSTALL.zh-CN.md`: document daily digest output.

## Task 1: Add digest settings and result types

**Files:**
- Modify: `src/types.ts`
- Modify: `tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

Update `tests/types.test.ts` so `DEFAULT_SETTINGS` includes `writeDailyDigest: true`:

```ts
expect(DEFAULT_SETTINGS).toEqual({
  targetFolder: "Follow Builders",
  syncX: true,
  syncPodcasts: true,
  syncBlogs: true,
  overwriteExisting: false,
  writeDailyDigest: true
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/types.test.ts`

Expected: FAIL because `writeDailyDigest` is missing from `DEFAULT_SETTINGS`.

- [ ] **Step 3: Write minimal implementation**

In `src/types.ts`, add the setting and digest counters:

```ts
export interface FollowBuildersSettings {
  targetFolder: string;
  syncX: boolean;
  syncPodcasts: boolean;
  syncBlogs: boolean;
  overwriteExisting: boolean;
  writeDailyDigest: boolean;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  digestCreated: number;
  digestUpdated: number;
  digestSkipped: number;
  digestFailed: number;
  errors: string[];
}

export const DEFAULT_SETTINGS: FollowBuildersSettings = {
  targetFolder: "Follow Builders",
  syncX: true,
  syncPodcasts: true,
  syncBlogs: true,
  overwriteExisting: false,
  writeDailyDigest: true
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/types.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/types.ts tests/types.test.ts
git commit -m "feat: add daily digest setting"
```

## Task 2: Create digest grouping and renderer

**Files:**
- Create: `src/digest.ts`
- Create: `tests/digest.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/digest.test.ts` with tests for date grouping, section ordering, grouped X authors, and path building:

```ts
import {
  buildDailyDigestPath,
  groupItemsByDate,
  renderDailyDigestMarkdown
} from "../src/digest";
import type { FeedItem } from "../src/types";

const podcast: FeedItem = {
  id: "podcast:latent-space",
  source: "podcast",
  title: "Why Agents Keep Failing",
  author: "Latent Space",
  url: "https://youtube.com/watch?v=agents",
  createdAt: "2026-05-25T01:00:00.000Z",
  body: "Most agent failures are tool-use failures. Tool selection matters.",
  metadata: {}
};

const tweetA: FeedItem = {
  id: "x:1",
  source: "x",
  title: "Andrej Karpathy: Software 3.0",
  author: "Andrej Karpathy",
  handle: "karpathy",
  url: "https://x.com/karpathy/status/1",
  createdAt: "2026-05-25T02:00:00.000Z",
  body: "Software 3.0 changes the compile target to natural language.",
  metadata: {}
};

const tweetB: FeedItem = {
  ...tweetA,
  id: "x:2",
  url: "https://x.com/karpathy/status/2",
  body: "New tutorial on building a code interpreter from scratch."
};

const blog: FeedItem = {
  id: "blog:anthropic",
  source: "blog",
  title: "Anthropic Engineering: Building reliable agents",
  author: "Anthropic Engineering",
  url: "https://www.anthropic.com/engineering/agents",
  createdAt: "2026-05-25T03:00:00.000Z",
  body: "Reliable agents need evals, tool boundaries, and feedback loops.",
  metadata: { description: "How Anthropic builds reliable agents." }
};

describe("daily digest", () => {
  it("groups items by created date", () => {
    const groups = groupItemsByDate([
      podcast,
      { ...tweetA, createdAt: "2026-05-24T23:59:00.000Z" }
    ]);

    expect([...groups.keys()]).toEqual(["2026-05-24", "2026-05-25"]);
    expect(groups.get("2026-05-25")).toEqual([podcast]);
  });

  it("builds the date-named digest path under Daily", () => {
    expect(buildDailyDigestPath("Follow Builders", "2026-05-25")).toBe(
      "Follow Builders/Daily/2026-05-25.md"
    );
  });

  it("renders digest sections in upstream sample order", () => {
    const markdown = renderDailyDigestMarkdown("2026-05-25", [blog, tweetA, podcast], "2026-05-25T10:00:00.000Z");

    expect(markdown.indexOf("## PODCASTS")).toBeLessThan(markdown.indexOf("## X / TWITTER"));
    expect(markdown.indexOf("## X / TWITTER")).toBeLessThan(markdown.indexOf("## BLOGS"));
    expect(markdown).toContain("# AI Builders Digest - 2026-05-25");
    expect(markdown).toContain("Latent Space - \"Why Agents Keep Failing\"");
    expect(markdown).toContain("Andrej Karpathy (@karpathy)");
    expect(markdown).toContain("Anthropic Engineering - \"Anthropic Engineering: Building reliable agents\"");
  });

  it("groups multiple X posts from the same builder under one heading", () => {
    const markdown = renderDailyDigestMarkdown("2026-05-25", [tweetA, tweetB], "2026-05-25T10:00:00.000Z");

    expect(markdown.match(/Andrej Karpathy \(@karpathy\)/g)).toHaveLength(1);
    expect(markdown).toContain("https://x.com/karpathy/status/1");
    expect(markdown).toContain("https://x.com/karpathy/status/2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/digest.test.ts`

Expected: FAIL because `src/digest.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/digest.ts` with:

```ts
import { normalizePath } from "obsidian";
import { dateFolderFromIso } from "./slug";
import { normalizeRootFolder } from "./writer";
import type { FeedItem, FeedSource } from "./types";

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(value: string, maxLength = 220): string {
  const text = oneLine(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function displayTitle(item: FeedItem): string {
  if (item.author && item.title.startsWith(`${item.author}: `)) {
    return item.title.slice(item.author.length + 2);
  }
  return item.title;
}

function sourceList(items: FeedItem[]): FeedSource[] {
  return Array.from(new Set(items.map((item) => item.source))).sort();
}

export function groupItemsByDate(items: FeedItem[]): Map<string, FeedItem[]> {
  const groups = new Map<string, FeedItem[]>();
  for (const item of [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const date = dateFolderFromIso(item.createdAt);
    groups.set(date, [...(groups.get(date) ?? []), item]);
  }
  return groups;
}

export function buildDailyDigestPath(rootFolder: string, date: string): string {
  return normalizePath(`${normalizeRootFolder(rootFolder)}/Daily/${date}.md`);
}

export function renderDailyDigestMarkdown(date: string, items: FeedItem[], generatedAt: string): string {
  const sources = sourceList(items);
  const frontmatterSources = sources.map((source) => `  - ${source}`).join("\n");
  const sections: string[] = [];

  const podcasts = items.filter((item) => item.source === "podcast");
  if (podcasts.length > 0) {
    sections.push(`## PODCASTS\n\n${podcasts.map(renderPodcast).join("\n\n")}`);
  }

  const tweets = items.filter((item) => item.source === "x");
  if (tweets.length > 0) {
    sections.push(`## X / TWITTER\n\n${renderTweets(tweets)}`);
  }

  const blogs = items.filter((item) => item.source === "blog");
  if (blogs.length > 0) {
    sections.push(`## BLOGS\n\n${blogs.map(renderBlog).join("\n\n")}`);
  }

  return `---\ntype: follow-builders-digest\ndate: ${yamlString(date)}\ngenerated: ${yamlString(generatedAt)}\nitem_count: ${items.length}\nsources:\n${frontmatterSources}\ntags:\n  - follow-builders\n  - ai\n  - digest\n---\n\n# AI Builders Digest - ${date}\n\n${sections.join("\n\n")}\n`;
}

function renderPodcast(item: FeedItem): string {
  return `${item.author ?? "Podcast"} - "${displayTitle(item)}"\nBottom line: ${excerpt(item.body)}\n\nKey material:\n- ${excerpt(item.body, 160)}\n\n${item.url}`;
}

function renderTweets(items: FeedItem[]): string {
  const groups = new Map<string, FeedItem[]>();
  for (const item of items) {
    const key = `${item.author ?? "Unknown"}\n${item.handle ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()]
    .map((builderItems) => {
      const first = builderItems[0];
      const heading = first.handle ? `${first.author ?? first.handle} (@${first.handle})` : first.author ?? "Unknown builder";
      const entries = builderItems.map((item) => `${excerpt(item.body)}\n${item.url}`).join("\n\n");
      return `${heading}\n${entries}`;
    })
    .join("\n\n");
}

function renderBlog(item: FeedItem): string {
  const description = item.metadata.description;
  const summary = typeof description === "string" && description.trim() ? description : item.body;
  return `${item.author ?? "Blog"} - "${item.title}"\nBottom line: ${excerpt(summary)}\n${item.url}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/digest.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/digest.ts tests/digest.test.ts
git commit -m "feat: render daily digest markdown"
```

## Task 3: Add digest file writing

**Files:**
- Modify: `src/writer.ts`
- Modify: `tests/writer.test.ts`

- [ ] **Step 1: Write failing writer tests**

In `tests/writer.test.ts`, import `writeDailyDigest` and add:

```ts
it("creates the Daily folder and writes a daily digest file", async () => {
  const vault = new FakeVault();
  const result = await writeDailyDigest(vault, "Follow Builders", "2026-05-25", "# Digest\n");

  expect(result).toEqual({ status: "created", path: "Follow Builders/Daily/2026-05-25.md" });
  expect(vault.createdFolders).toEqual(["Follow Builders", "Follow Builders/Daily"]);
  expect(vault.createdFiles).toEqual(["Follow Builders/Daily/2026-05-25.md"]);
  expect(vault.contents.get("Follow Builders/Daily/2026-05-25.md")).toBe("# Digest\n");
});

it("updates an existing daily digest file on rerun", async () => {
  const vault = new FakeVault();
  vault.addFolder("Follow Builders");
  vault.addFolder("Follow Builders/Daily");
  const file = vault.addFile("Follow Builders/Daily/2026-05-25.md", "old");

  const result = await writeDailyDigest(vault, "Follow Builders", "2026-05-25", "new");

  expect(result).toEqual({ status: "updated", path: file.path });
  expect(vault.modifiedFiles).toEqual([file.path]);
  expect(vault.contents.get(file.path)).toBe("new");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/writer.test.ts`

Expected: FAIL because `writeDailyDigest` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/writer.ts`, add:

```ts
export async function writeMarkdownFile(
  vault: MinimalVault,
  path: string,
  markdown: string,
  options: { overwriteExisting: boolean }
): Promise<WriteResult> {
  const folderPath = path.split("/").slice(0, -1).join("/");
  await ensureFolder(vault, folderPath);

  const existing = vault.getAbstractFileByPath(path);
  if (existing) {
    if (!isFile(existing)) {
      throw new Error(`Cannot write markdown: a folder exists at ${path}`);
    }
    if (!options.overwriteExisting) {
      return { status: "skipped", path };
    }
    await vault.modify(existing, markdown);
    return { status: "updated", path };
  }

  await vault.create(path, markdown);
  return { status: "created", path };
}
```

Then update `writeFeedItem` to call `writeMarkdownFile` with its generated markdown and add:

```ts
export async function writeDailyDigest(
  vault: MinimalVault,
  rootFolder: string,
  date: string,
  markdown: string
): Promise<WriteResult> {
  const path = buildDailyDigestPath(rootFolder, date);
  return writeMarkdownFile(vault, path, markdown, { overwriteExisting: true });
}
```

Import `buildDailyDigestPath` from `./digest`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/writer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/writer.ts tests/writer.test.ts
git commit -m "feat: write daily digest notes"
```

## Task 4: Wire digest generation into sync

**Files:**
- Modify: `src/sync.ts`
- Modify: `tests/sync.test.ts`

- [ ] **Step 1: Write failing sync tests**

Update existing `SyncResult` expectations in `tests/sync.test.ts` to include:

```ts
digestCreated: 0,
digestUpdated: 0,
digestSkipped: 0,
digestFailed: 0
```

Add a digest writer dependency and test:

```ts
it("regenerates daily digests from fetched items even when raw items are already synced", async () => {
  const state: FollowBuildersSyncState = { syncedIds: { [item.id]: true } };
  const writeItem = vi.fn();
  const writeDigest = vi.fn().mockResolvedValue({ status: "updated", path: "Follow Builders/Daily/2026-05-24.md" });

  const result = await runSync({
    settings: { ...settings, writeDailyDigest: true },
    state,
    fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
    writeItem,
    writeDigest,
    now: syncedNow
  });

  expect(writeItem).not.toHaveBeenCalled();
  expect(writeDigest).toHaveBeenCalledWith("2026-05-24", [item], nowIso);
  expect(result.digestUpdated).toBe(1);
  expect(result.skipped).toBe(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/sync.test.ts`

Expected: FAIL because `writeDigest` is not part of `RunSyncDependencies` and digest counters are missing from returned results.

- [ ] **Step 3: Write minimal implementation**

In `src/sync.ts`:

- Add `writeDigest?: (date: string, items: FeedItem[], generatedAt: string) => Promise<WriteResult>`.
- Initialize digest counters in `result`.
- After the raw item loop, if `settings.writeDailyDigest && writeDigest`, call `groupItemsByDate(fetched.items)`.
- Count each digest writer result using the same `countWrite` behavior mapped to digest counters.
- Catch digest write errors as `Failed to write digest ${date}: ${message}` and increment `digestFailed`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/sync.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/sync.ts tests/sync.test.ts
git commit -m "feat: sync daily digest notes"
```

## Task 5: Wire Obsidian settings and plugin notice

**Files:**
- Modify: `src/main.ts`
- Modify: `src/settings.ts`

- [ ] **Step 1: Update plugin loading and writing**

In `src/main.ts`:

- Accept saved `writeDailyDigest` in `partialSettings`.
- Import `renderDailyDigestMarkdown`.
- Import `writeDailyDigest`.
- Pass `writeDigest` to `runSync`:

```ts
writeDigest: (date, items, generatedAt) =>
  writeDailyDigest(
    this.app.vault,
    runSettings.targetFolder,
    date,
    renderDailyDigestMarkdown(date, items, generatedAt)
  )
```

- Extend the Notice with digest counts:

```ts
`${result.digestCreated} digest created, ${result.digestUpdated} digest updated, ${result.digestSkipped} digest skipped, ${result.digestFailed} digest failed`
```

- [ ] **Step 2: Update settings UI**

In `src/settings.ts`, add a toggle before overwrite:

```ts
new Setting(containerEl)
  .setName("Write daily digest")
  .setDesc("Create or update one date-named digest note under Daily for each synced day.")
  .addToggle((toggle) =>
    toggle.setValue(this.plugin.settings.writeDailyDigest).onChange(async (value) => {
      this.plugin.settings.writeDailyDigest = value;
      await this.plugin.savePluginData();
    })
  );
```

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/main.ts src/settings.ts main.js
git commit -m "feat: expose daily digest in plugin UI"
```

## Task 6: Update documentation and verify

**Files:**
- Modify: `README.md`
- Modify: `docs/INSTALL.en.md`
- Modify: `docs/INSTALL.zh-CN.md`

- [ ] **Step 1: Update docs**

Document that sync now writes:

```text
Follow Builders/
  Daily/
    2026-05-25.md
  2026-05-25/
    x-example-123.md
```

Mention the `Write daily digest` setting and that the digest is deterministic, not AI-generated.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- All tests pass.
- Build exits 0.
- Only intended documentation and generated bundle changes remain.

- [ ] **Step 3: Commit**

Run:

```bash
git add README.md docs/INSTALL.en.md docs/INSTALL.zh-CN.md
git commit -m "docs: document daily digest output"
```

## Self-Review

- Spec coverage: daily digest setting, deterministic renderer, upstream-style sections, idempotent date path, sync regeneration from fetched items, docs, and future AI extension boundary are covered.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: the plan consistently uses `writeDailyDigest`, `renderDailyDigestMarkdown`, `groupItemsByDate`, and digest counters on `SyncResult`.
