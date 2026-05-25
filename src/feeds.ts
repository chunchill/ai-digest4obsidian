import { requestUrl } from "obsidian";
import { truncateText } from "./slug";
import type { FeedItem, FetchResult } from "./types";

export const FEED_X_URL =
  "https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json";
export const FEED_PODCASTS_URL =
  "https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json";
export const FEED_BLOGS_URL =
  "https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function arrayField(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

export function titleWithAuthor(author: string | undefined, title: string): string {
  const normalizedTitle = truncateText(title.replace(/\s+/g, " ").trim(), 80);
  return author ? `${author}: ${normalizedTitle}` : normalizedTitle;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanField(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ParsedFeed {
  items: FeedItem[];
  skipped: number;
}

function feedWarnings(raw: unknown, label: string): string[] {
  if (!isRecord(raw)) {
    return [];
  }

  return arrayField(raw, "errors").map((error) => `${label} feed warning: ${errorMessage(error)}`);
}

function hasArrayField(raw: unknown, key: string): raw is Record<string, unknown> {
  return isRecord(raw) && Array.isArray(raw[key]);
}

function parseFetchedFeed(
  label: string,
  key: string,
  raw: unknown,
  parser: (rawFeed: unknown) => ParsedFeed
): FetchResult {
  const errors = feedWarnings(raw, label);

  if (!hasArrayField(raw, key)) {
    return {
      items: [],
      skipped: 0,
      errors: [...errors, `${label} feed failed: expected top-level ${key} array`]
    };
  }

  const parsed = parser(raw);
  return {
    items: parsed.items,
    skipped: parsed.skipped,
    errors
  };
}

function parseXFeedResult(raw: unknown): ParsedFeed {
  if (!isRecord(raw)) {
    return { items: [], skipped: 0 };
  }

  const items: FeedItem[] = [];
  let skipped = 0;

  for (const builderRaw of arrayField(raw, "x")) {
    if (!isRecord(builderRaw)) {
      continue;
    }

    const author = stringField(builderRaw, "name");
    const handle = stringField(builderRaw, "handle");
    const bio = stringField(builderRaw, "bio");

    for (const tweetRaw of arrayField(builderRaw, "tweets")) {
      if (!isRecord(tweetRaw)) {
        skipped += 1;
        continue;
      }

      const id = stringField(tweetRaw, "id");
      const text = stringField(tweetRaw, "text");
      const createdAt = stringField(tweetRaw, "createdAt");
      const url = stringField(tweetRaw, "url");

      if (!id || !text || !createdAt || !url) {
        skipped += 1;
        continue;
      }

      items.push({
        id: `x:${id}`,
        source: "x",
        title: titleWithAuthor(author, text),
        author,
        handle,
        bio,
        url,
        createdAt,
        body: text,
        metadata: {
          likes: numberField(tweetRaw, "likes"),
          retweets: numberField(tweetRaw, "retweets"),
          replies: numberField(tweetRaw, "replies"),
          isQuote: booleanField(tweetRaw, "isQuote"),
          quotedTweetId: stringField(tweetRaw, "quotedTweetId")
        }
      });
    }
  }

  return { items, skipped };
}

export function parseXFeed(raw: unknown): FeedItem[] {
  return parseXFeedResult(raw).items;
}

function parsePodcastFeedResult(raw: unknown): ParsedFeed {
  if (!isRecord(raw)) {
    return { items: [], skipped: 0 };
  }

  const items: FeedItem[] = [];
  let skipped = 0;

  for (const podcastRaw of arrayField(raw, "podcasts")) {
    if (!isRecord(podcastRaw)) {
      skipped += 1;
      continue;
    }

    const author =
      stringField(podcastRaw, "name") ??
      stringField(podcastRaw, "podcast") ??
      stringField(podcastRaw, "source") ??
      stringField(podcastRaw, "show");
    const title = stringField(podcastRaw, "title") ?? stringField(podcastRaw, "episodeTitle");
    const url = stringField(podcastRaw, "url") ?? stringField(podcastRaw, "link");
    const createdAt =
      stringField(podcastRaw, "publishedAt") ??
      stringField(podcastRaw, "createdAt") ??
      stringField(podcastRaw, "date");
    const body =
      stringField(podcastRaw, "transcript") ??
      stringField(podcastRaw, "summary") ??
      stringField(podcastRaw, "description") ??
      stringField(podcastRaw, "content") ??
      title;

    if (!title || !url || !createdAt || !body) {
      skipped += 1;
      continue;
    }

    items.push({
      id: `podcast:${url}`,
      source: "podcast",
      title: titleWithAuthor(author, title),
      author,
      url,
      createdAt,
      body,
      metadata: {}
    });
  }

  return { items, skipped };
}

export function parsePodcastFeed(raw: unknown): FeedItem[] {
  return parsePodcastFeedResult(raw).items;
}

function parseBlogFeedResult(raw: unknown): ParsedFeed {
  if (!isRecord(raw)) {
    return { items: [], skipped: 0 };
  }

  const items: FeedItem[] = [];
  let skipped = 0;

  for (const blogRaw of arrayField(raw, "blogs")) {
    if (!isRecord(blogRaw)) {
      skipped += 1;
      continue;
    }

    const author =
      stringField(blogRaw, "source") ??
      stringField(blogRaw, "name") ??
      stringField(blogRaw, "site") ??
      stringField(blogRaw, "author");
    const title = stringField(blogRaw, "title");
    const url = stringField(blogRaw, "url") ?? stringField(blogRaw, "link");
    const createdAt =
      stringField(blogRaw, "publishedAt") ??
      stringField(blogRaw, "createdAt") ??
      stringField(blogRaw, "date");
    const body =
      stringField(blogRaw, "content") ??
      stringField(blogRaw, "text") ??
      stringField(blogRaw, "summary") ??
      stringField(blogRaw, "description") ??
      title;

    if (!title || !url || !createdAt || !body) {
      skipped += 1;
      continue;
    }

    items.push({
      id: `blog:${url}`,
      source: "blog",
      title: titleWithAuthor(author, title),
      author,
      url,
      createdAt,
      body,
      metadata: {}
    });
  }

  return { items, skipped };
}

export function parseBlogFeed(raw: unknown): FeedItem[] {
  return parseBlogFeedResult(raw).items;
}

export async function fetchJson(url: string): Promise<unknown> {
  const response = await requestUrl({ url, method: "GET" });
  return response.json;
}

export async function fetchEnabledFeeds(options: {
  syncX: boolean;
  syncPodcasts: boolean;
  syncBlogs: boolean;
}): Promise<FetchResult> {
  const items: FeedItem[] = [];
  let skipped = 0;
  const errors: string[] = [];

  if (options.syncX) {
    try {
      const result = parseFetchedFeed("X", "x", await fetchJson(FEED_X_URL), parseXFeedResult);
      items.push(...result.items);
      skipped += result.skipped;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`X feed failed: ${errorMessage(error)}`);
    }
  }

  if (options.syncPodcasts) {
    try {
      const result = parseFetchedFeed(
        "Podcast",
        "podcasts",
        await fetchJson(FEED_PODCASTS_URL),
        parsePodcastFeedResult
      );
      items.push(...result.items);
      skipped += result.skipped;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Podcast feed failed: ${errorMessage(error)}`);
    }
  }

  if (options.syncBlogs) {
    try {
      const result = parseFetchedFeed("Blog", "blogs", await fetchJson(FEED_BLOGS_URL), parseBlogFeedResult);
      items.push(...result.items);
      skipped += result.skipped;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Blog feed failed: ${errorMessage(error)}`);
    }
  }

  return { items, skipped, errors };
}
