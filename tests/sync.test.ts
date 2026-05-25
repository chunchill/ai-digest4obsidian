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
  overwriteExisting: false
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
  it("writes new items and records synced ids", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {} };
    const writeItem = vi.fn().mockResolvedValue(writeResult("created"));

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
      writeItem,
      now: syncedNow
    });

    expect(result).toEqual({
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: []
    });
    expect(writeItem).toHaveBeenCalledWith(item, nowIso);
    expect(state.syncedIds[item.id]).toBe(true);
    expect(state.lastSyncedAt).toBe(nowIso);
  });

  it("skips items already in sync state when overwriteExisting is false", async () => {
    const state: FollowBuildersSyncState = { syncedIds: { [item.id]: true } };
    const writeItem = vi.fn();

    const result = await runSync({
      settings: { ...settings, overwriteExisting: false },
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: [] }),
      writeItem,
      now: syncedNow
    });

    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(writeItem).not.toHaveBeenCalled();
    expect(state.lastSyncedAt).toBe(nowIso);
  });

  it("keeps feed errors while writing successful items", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {} };

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 0, errors: ["X feed failed: network down"] }),
      writeItem: async () => writeResult("created"),
      now: syncedNow
    });

    expect(result).toEqual({
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: ["X feed failed: network down"]
    });
    expect(state.syncedIds[item.id]).toBe(true);
  });

  it("counts write failures and continues without marking failed ids synced", async () => {
    const failedItem = { ...item, id: "x:failed" };
    const successfulItem = { ...item, id: "x:successful" };
    const state: FollowBuildersSyncState = { syncedIds: {} };

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [failedItem, successfulItem], skipped: 0, errors: [] }),
      writeItem: vi
        .fn()
        .mockRejectedValueOnce(new Error("vault unavailable"))
        .mockResolvedValueOnce(writeResult("created")),
      now: syncedNow
    });

    expect(result.created).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(["Failed to write x:failed: vault unavailable"]);
    expect(state.syncedIds[failedItem.id]).toBeUndefined();
    expect(state.syncedIds[successfulItem.id]).toBe(true);
    expect(state.lastSyncedAt).toBe(nowIso);
  });

  it("counts malformed items skipped during feed parsing", async () => {
    const state: FollowBuildersSyncState = { syncedIds: {} };

    const result = await runSync({
      settings,
      state,
      fetchFeeds: async () => ({ items: [item], skipped: 2, errors: [] }),
      writeItem: async () => writeResult("created"),
      now: syncedNow
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(2);
    expect(state.syncedIds[item.id]).toBe(true);
  });
});
