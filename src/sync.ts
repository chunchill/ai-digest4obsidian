import { fetchEnabledFeeds } from "./feeds";
import type {
  FeedItem,
  FetchResult,
  FollowBuildersSettings,
  FollowBuildersSyncState,
  SyncResult
} from "./types";
import type { WriteResult } from "./writer";

export interface RunSyncDependencies {
  settings: FollowBuildersSettings;
  state: FollowBuildersSyncState;
  fetchFeeds?: (options: FollowBuildersSettings) => Promise<FetchResult>;
  writeItem: (item: FeedItem, syncedAt: string) => Promise<WriteResult>;
  now?: () => Date;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function countWrite(result: SyncResult, status: WriteResult["status"]): void {
  result[status] += 1;
}

export async function runSync({
  settings,
  state,
  fetchFeeds = fetchEnabledFeeds,
  writeItem,
  now = () => new Date()
}: RunSyncDependencies): Promise<SyncResult> {
  const syncedAt = now().toISOString();
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  const fetched = await fetchFeeds(settings);
  result.errors.push(...fetched.errors);

  for (const item of fetched.items) {
    if (state.syncedIds[item.id] && !settings.overwriteExisting) {
      result.skipped += 1;
      continue;
    }

    try {
      const writeResult = await writeItem(item, syncedAt);
      countWrite(result, writeResult.status);
      state.syncedIds[item.id] = true;
    } catch (error) {
      result.failed += 1;
      result.errors.push(`Failed to write ${item.id}: ${errorMessage(error)}`);
    }
  }

  state.lastSyncedAt = syncedAt;
  return result;
}
