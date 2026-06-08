vi.mock("obsidian", () => ({
  requestUrl: vi.fn()
}));

import { runSync } from "../src/sync";
import type { FeedItem, FollowBuildersSettings, FollowBuildersSyncState } from "../src/types";
import type { WriteResult } from "../src/writer";

const settings: FollowBuildersSettings = {
  targetFolder: "Follow Builders",
  syncX: true,
  syncPodcasts: true,
  syncBlogs: true,
  syncLocalFallback: true,
  overwriteExisting: false,
  writeDailyDigest: true
};

const nowIso = "2026-05-25T03:30:00.000Z";

const item: FeedItem = {
  id: "x:2058377974882210096",
  source: "x",
  title: "Thariq: every now and then",
  author: "Thariq",
  handle: "trq212",
  bio: "Building with AI",
  url: "https://x.com/trq212/status/2058377974882210096",
  createdAt: "2026-05-24T02:42:06.000Z",
  body: "every now and then I remember you can run the prompt",
  metadata: {
    likes: 463
  }
};

function syncedNow(): Date {
  return new Date(nowIso);
}

function writeResult(status: WriteResult["status"], path = "Follow Builders/item.md"): WriteResult {
  return { status, path };
}

describe("runSync", () => {
  it("writes daily digests without writing raw feed item notes", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {}, cachedItems: {} };
    const writeItem = vi.fn();
    const writeDigest = vi.fn().mockResolvedValue(writeResult("created", "Follow Builders/2026-05-24.md"));

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
      writeItem,
      writeDigest,
      now: syncedNow
    });

    expect(result).toEqual({
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      digestCreated: 1,
      digestUpdated: 0,
      digestSkipped: 0,
      digestFailed: 0,
      errors: []
    });
    expect(writeItem).not.toHaveBeenCalled();
    expect(writeDigest).toHaveBeenCalledWith("2026-05-24", [item], nowIso);
    expect(state.syncedIds[item.id]).toBeUndefined();
    expect(state.cachedItems[item.id]).toEqual(item);
    expect(state.lastSyncedAt).toBe(nowIso);
  });

  it("keeps cached blog items in digests when a later fetch returns no blogs", async () => {
    const blog: FeedItem = {
      id: "blog:anthropic",
      source: "blog",
      title: "Anthropic Engineering: Managed agents",
      author: "Anthropic Engineering",
      url: "https://www.anthropic.com/engineering/managed-agents",
      createdAt: "2026-06-05T07:42:12.776Z",
      body: "Blog content",
      metadata: {}
    };
    const state: FollowBuildersSyncState = {
      syncedIds: {},
      cachedItems: { [blog.id]: blog }
    };
    const writeDigest = vi.fn().mockResolvedValue(writeResult("updated", "Follow Builders/2026-06-05.md"));

    await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
      writeDigest,
      now: syncedNow
    });

    expect(writeDigest).toHaveBeenCalledWith("2026-06-05", [blog], nowIso);
    expect(writeDigest).toHaveBeenCalledWith("2026-05-24", [item], nowIso);
  });

  it("ignores raw sync history and still writes digest notes", async () => {
    const state: FollowBuildersSyncState = { syncedIds: { [item.id]: true }, cachedItems: {} };
    const writeItem = vi.fn();
    const writeDigest = vi.fn().mockResolvedValue(writeResult("updated", "Follow Builders/2026-05-24.md"));

    const result = await runSync({
      settings: { ...settings, overwriteExisting: false },
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
      writeItem,
      writeDigest,
      now: syncedNow
    });

    expect(result.skipped).toBe(0);
    expect(result.created).toBe(0);
    expect(result.digestUpdated).toBe(1);
    expect(writeItem).not.toHaveBeenCalled();
    expect(writeDigest).toHaveBeenCalledWith("2026-05-24", [item], nowIso);
    expect(state.lastSyncedAt).toBe(nowIso);
  });

  it("keeps feed errors while writing successful items", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {}, cachedItems: {} };

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: ["X feed failed: network down"] }),
      writeItem: vi.fn(),
      writeDigest: async () => writeResult("created", "Follow Builders/2026-05-24.md"),
      now: syncedNow
    });

    expect(result).toEqual({
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      digestCreated: 1,
      digestUpdated: 0,
      digestSkipped: 0,
      digestFailed: 0,
      errors: ["X feed failed: network down"]
    });
    expect(state.syncedIds[item.id]).toBeUndefined();
  });

  it("counts digest write failures without marking raw ids synced", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {}, cachedItems: {} };

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
      writeItem: vi.fn(),
      writeDigest: vi.fn().mockRejectedValueOnce(new Error("vault unavailable")),
      now: syncedNow
    });

    expect(result.created).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.digestFailed).toBe(1);
    expect(result.errors).toEqual(["Failed to write digest 2026-05-24: vault unavailable"]);
    expect(state.syncedIds[item.id]).toBeUndefined();
    expect(state.lastSyncedAt).toBe(nowIso);
  });

  it("counts malformed items skipped during feed parsing", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {}, cachedItems: {} };

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 2, errors: [] }),
      writeItem: vi.fn(),
      writeDigest: async () => writeResult("created", "Follow Builders/2026-05-24.md"),
      now: syncedNow
    });

    expect(result.created).toBe(0);
    expect(result.digestCreated).toBe(1);
    expect(result.skipped).toBe(2);
    expect(state.syncedIds[item.id]).toBeUndefined();
  });

  it("regenerates daily digests from fetched items even when raw items are already synced", async () => {
    const state: FollowBuildersSyncState = { syncedIds: { [item.id]: true }, cachedItems: {} };
    const writeItem = vi.fn();
    const writeDigest = vi.fn().mockResolvedValue({
      status: "updated",
      path: "Follow Builders/2026-05-24.md"
    });

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
    expect(result.skipped).toBe(0);
  });
});
