import { Notice, Plugin } from "obsidian";
import { renderDailyDigestMarkdown } from "./digest";
import { FollowBuildersSettingTab } from "./settings";
import { runSync } from "./sync";
import {
  DEFAULT_SETTINGS,
  createDefaultState,
  type FollowBuildersSettings,
  type FollowBuildersSyncState,
  type FeedItem
} from "./types";
import { writeDailyDigest } from "./writer";

type SavedPluginData = {
  settings?: Partial<FollowBuildersSettings>;
  state?: Partial<FollowBuildersSyncState>;
} & Partial<FollowBuildersSettings>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function partialSettings(value: unknown): Partial<FollowBuildersSettings> {
  if (!isRecord(value)) {
    return {};
  }

  const settings: Partial<FollowBuildersSettings> = {};

  if (typeof value.targetFolder === "string") {
    settings.targetFolder = value.targetFolder;
  }
  if (typeof value.syncX === "boolean") {
    settings.syncX = value.syncX;
  }
  if (typeof value.syncPodcasts === "boolean") {
    settings.syncPodcasts = value.syncPodcasts;
  }
  if (typeof value.syncBlogs === "boolean") {
    settings.syncBlogs = value.syncBlogs;
  }
  if (typeof value.overwriteExisting === "boolean") {
    settings.overwriteExisting = value.overwriteExisting;
  }
  return settings;
}

function partialState(value: unknown): Partial<FollowBuildersSyncState> {
  if (!isRecord(value)) {
    return {};
  }

  const state: Partial<FollowBuildersSyncState> = {};

  if (isRecord(value.syncedIds)) {
    state.syncedIds = Object.fromEntries(
      Object.entries(value.syncedIds).filter((entry): entry is [string, true] => entry[1] === true)
    );
  }
  if (isRecord(value.cachedItems)) {
    state.cachedItems = Object.fromEntries(
      Object.entries(value.cachedItems).filter((entry): entry is [string, FeedItem] => isFeedItem(entry[1]))
    );
  }
  if (typeof value.lastSyncedAt === "string") {
    state.lastSyncedAt = value.lastSyncedAt;
  }

  return state;
}

function isFeedItem(value: unknown): value is FeedItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.source === "x" || value.source === "podcast" || value.source === "blog") &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.body === "string" &&
    isRecord(value.metadata)
  );
}

function warningLabel(count: number): string {
  return count === 1 ? "warning" : "warnings";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default class FollowBuildersSyncPlugin extends Plugin {
  settings: FollowBuildersSettings = { ...DEFAULT_SETTINGS };
  state: FollowBuildersSyncState = createDefaultState();
  private syncing = false;

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.addRibbonIcon("refresh-cw", "Sync Follow Builders", () => {
      void this.syncFeeds();
    });

    this.addCommand({
      id: "sync-follow-builders-feeds",
      name: "Sync Follow Builders feeds",
      callback: () => this.syncFeeds()
    });

    this.addSettingTab(new FollowBuildersSettingTab(this.app, this));
  }

  async loadPluginData(): Promise<void> {
    const savedData = (await this.loadData()) as SavedPluginData | null;
    const savedRecord = isRecord(savedData) ? savedData : {};
    const savedSettings = isRecord(savedRecord.settings) ? savedRecord.settings : savedRecord;
    const savedState = isRecord(savedRecord.state) ? savedRecord.state : {};
    const nextState = partialState(savedState);

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...partialSettings(savedSettings)
    };
    this.state = {
      ...createDefaultState(),
      ...nextState,
      syncedIds: nextState.syncedIds ?? {},
      cachedItems: nextState.cachedItems ?? {}
    };
  }

  async savePluginData(): Promise<void> {
    await this.saveData({
      settings: this.settings,
      state: this.state
    });
  }

  async clearSyncHistory(): Promise<void> {
    if (this.syncing) {
      new Notice("Cannot clear Follow Builders history while sync is running.");
      return;
    }

    this.state = createDefaultState();
    await this.savePluginData();
    new Notice("Follow Builders sync history cleared.");
  }

  isSyncing(): boolean {
    return this.syncing;
  }

  private async syncFeeds(): Promise<void> {
    if (this.syncing) {
      new Notice("Follow Builders sync already in progress.");
      return;
    }

    this.syncing = true;
    new Notice("Syncing Follow Builders feeds...");

    try {
      const runSettings = { ...this.settings };
      const runState = this.state;
      const result = await runSync({
        settings: runSettings,
        state: runState,
        writeDigest: (date, items, generatedAt) =>
          writeDailyDigest(
            this.app.vault,
            runSettings.targetFolder,
            date,
            renderDailyDigestMarkdown(date, items, generatedAt)
          )
      });
      this.state = runState;
      await this.savePluginData();

      const warningCount = Math.max(0, result.errors.length - result.failed - result.digestFailed);
      new Notice(
        `Follow Builders sync complete: ${result.digestCreated} digest created, ${result.digestUpdated} digest updated, ${result.digestSkipped} digest skipped, ${result.digestFailed} digest failed, ${warningCount} ${warningLabel(warningCount)}.`
      );
    } catch (error) {
      new Notice(`Follow Builders sync failed: ${errorMessage(error)}`);
    } finally {
      this.syncing = false;
    }
  }
}
