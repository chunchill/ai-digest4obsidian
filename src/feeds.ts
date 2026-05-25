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
  parser: (rawFeed: unknown) => FeedItem[]
): FetchResult {
  const errors = feedWarnings(raw, label);

  if (!hasArrayField(raw, key)) {
    return {
      items: [],
      errors: [...errors, `${label} feed failed: expected top-level ${key} array`]
    };
  }

  return {
    items: parser(raw),
    errors
  };
}

export function parseXFeed(raw: unknown): FeedItem[] {
  if (!isRecord(raw)) {
    return [];
  }

  const items: FeedItem[] = [];

  for (const builderRaw of arrayField(raw, "x")) {
    if (!isRecord(builderRaw)) {
      continue;
    }

    const author = stringField(builderRaw, "name");
    const handle = stringField(builderRaw, "handle");
    const bio = stringField(builderRaw, "bio");

    for (const tweetRaw of arrayField(builderRaw, "tweets")) {
      if (!isRecord(tweetRaw)) {
        continue;
      }

      const id = stringField(tweetRaw, "id");
      const text = stringField(tweetRaw, "text");
      const createdAt = stringField(tweetRaw, "createdAt");
      const url = stringField(tweetRaw, "url");

      if (!id || !text || !createdAt || !url) {
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

  return items;
}

export function parsePodcastFeed(raw: unknown): FeedItem[] {
  if (!isRecord(raw)) {
    return [];
  }

  const items: FeedItem[] = [];

  for (const podcastRaw of arrayField(raw, "podcasts")) {
    if (!isRecord(podcastRaw)) {
      continue;
    }

    const author = stringField(podcastRaw, "name");
    const title = stringField(podcastRaw, "title");
    const url = stringField(podcastRaw, "url");
    const createdAt = stringField(podcastRaw, "publishedAt");
    const transcript = stringField(podcastRaw, "transcript");

    if (!title || !url || !createdAt || !transcript) {
      continue;
    }

    items.push({
      id: `podcast:${url}`,
      source: "podcast",
      title: titleWithAuthor(author, title),
      author,
      url,
      createdAt,
      body: transcript,
      metadata: {}
    });
  }

  return items;
}

export function parseBlogFeed(raw: unknown): FeedItem[] {
  if (!isRecord(raw)) {
    return [];
  }

  const items: FeedItem[] = [];

  for (const blogRaw of arrayField(raw, "blogs")) {
    if (!isRecord(blogRaw)) {
      continue;
    }

    const author = stringField(blogRaw, "source");
    const title = stringField(blogRaw, "title");
    const url = stringField(blogRaw, "url");
    const createdAt = stringField(blogRaw, "publishedAt");
    const content = stringField(blogRaw, "content");

    if (!title || !url || !createdAt || !content) {
      continue;
    }

    items.push({
      id: `blog:${url}`,
      source: "blog",
      title: titleWithAuthor(author, title),
      author,
      url,
      createdAt,
      body: content,
      metadata: {}
    });
  }

  return items;
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
  const errors: string[] = [];

  if (options.syncX) {
    try {
      const result = parseFetchedFeed("X", "x", await fetchJson(FEED_X_URL), parseXFeed);
      items.push(...result.items);
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
        parsePodcastFeed
      );
      items.push(...result.items);
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Podcast feed failed: ${errorMessage(error)}`);
    }
  }

  if (options.syncBlogs) {
    try {
      const result = parseFetchedFeed("Blog", "blogs", await fetchJson(FEED_BLOGS_URL), parseBlogFeed);
      items.push(...result.items);
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`Blog feed failed: ${errorMessage(error)}`);
    }
  }

  return { items, errors };
}
