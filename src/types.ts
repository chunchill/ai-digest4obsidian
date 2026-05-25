export interface FollowBuildersSettings {
  targetFolder: string;
  syncX: boolean;
  syncPodcasts: boolean;
  syncBlogs: boolean;
  overwriteExisting: boolean;
}

export interface FollowBuildersSyncState {
  syncedIds: Record<string, true>;
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
  errors: string[];
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export const DEFAULT_SETTINGS: FollowBuildersSettings = {
  targetFolder: "Follow Builders",
  syncX: true,
  syncPodcasts: true,
  syncBlogs: true,
  overwriteExisting: false
};

export function createDefaultState(): FollowBuildersSyncState {
  return {
    syncedIds: {}
  };
}
