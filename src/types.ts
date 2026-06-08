export interface FollowBuildersSettings {
  targetFolder: string;
  syncX: boolean;
  syncPodcasts: boolean;
  syncBlogs: boolean;
  overwriteExisting: boolean;
  writeDailyDigest: boolean;
}

export interface FollowBuildersSyncState {
  syncedIds: Record<string, true>;
  cachedItems: Record<string, FeedItem>;
  lastSyncedAt?: string;
}

export interface FollowBuildersPluginData {
  settings: FollowBuildersSettings;
  state: FollowBuildersSyncState;
}

export type FeedSource = "x" | "podcast" | "blog";

export interface FeedItem {
  id: string;
  source: FeedSource;
  title: string;
  author?: string;
  handle?: string;
  bio?: string;
  url: string;
  createdAt: string;
  body: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
}

export interface FetchResult {
  items: FeedItem[];
  skipped: number;
  errors: string[];
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

export function createDefaultState(): FollowBuildersSyncState {
  return {
    syncedIds: {},
    cachedItems: {}
  };
}
