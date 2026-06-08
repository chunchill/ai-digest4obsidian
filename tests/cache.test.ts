import type { FeedItem, FollowBuildersSettings } from "../src/types";
import {
  digestItemsFromCache,
  isSourceEnabled,
  updateItemCache
} from "../src/cache";

const settings: FollowBuildersSettings = {
  targetFolder: "Follow Builders",
  syncX: true,
  syncPodcasts: true,
  syncBlogs: true,
  syncLocalFallback: true,
  overwriteExisting: false,
  writeDailyDigest: true
};

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

const tweet: FeedItem = {
  id: "x:1",
  source: "x",
  title: "Thariq: hello",
  author: "Thariq",
  url: "https://x.com/trq212/status/1",
  createdAt: "2026-06-07T02:00:00.000Z",
  body: "hello",
  metadata: {}
};

describe("item cache", () => {
  it("stores fetched items for enabled sources", () => {
    const cache = updateItemCache({}, [blog, tweet], settings);

    expect(Object.keys(cache)).toEqual([blog.id, tweet.id]);
  });

  it("keeps cached items when a later fetch returns no blog entries", () => {
    const cache = updateItemCache({}, [blog], settings);
    const next = updateItemCache(cache, [tweet], settings);

    expect(next[blog.id]).toEqual(blog);
    expect(next[tweet.id]).toEqual(tweet);
  });

  it("respects disabled source toggles when building digest items", () => {
    const cache = updateItemCache({}, [blog, tweet], settings);
    const items = digestItemsFromCache(cache, { ...settings, syncBlogs: false });

    expect(items.map((item) => item.id)).toEqual([tweet.id]);
  });

  it("does not add disabled sources to the cache", () => {
    const cache = updateItemCache({}, [blog, tweet], { ...settings, syncBlogs: false });

    expect(cache[blog.id]).toBeUndefined();
    expect(cache[tweet.id]).toEqual(tweet);
    expect(isSourceEnabled("blog", { ...settings, syncBlogs: false })).toBe(false);
  });
});
