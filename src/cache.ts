import type { FeedItem, FollowBuildersSettings } from "./types";

export function mergeFeedItems(primary: FeedItem[], secondary: FeedItem[]): FeedItem[] {
  const byId = new Map(primary.map((item) => [item.id, item]));

  for (const item of secondary) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  return [...byId.values()];
}

export function isSourceEnabled(source: FeedItem["source"], settings: FollowBuildersSettings): boolean {
  if (source === "x") {
    return settings.syncX;
  }
  if (source === "podcast") {
    return settings.syncPodcasts;
  }
  return settings.syncBlogs;
}

export function updateItemCache(
  cache: Record<string, FeedItem>,
  fetched: FeedItem[],
  settings: FollowBuildersSettings
): Record<string, FeedItem> {
  const next = { ...cache };

  for (const item of fetched) {
    if (isSourceEnabled(item.source, settings)) {
      next[item.id] = item;
    }
  }

  return next;
}

export function digestItemsFromCache(
  cache: Record<string, FeedItem>,
  settings: FollowBuildersSettings
): FeedItem[] {
  return Object.values(cache).filter((item) => isSourceEnabled(item.source, settings));
}
