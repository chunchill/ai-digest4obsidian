import {
  extractArticleContent,
  normalizeArticleDate,
  parseBlogIndex,
  type ScrapedArticleCandidate
} from "./blog-scrape";
import { titleWithAuthor } from "./slug";
import { fetchText } from "./http";
import {
  LOCAL_BLOG_LOOKBACK_HOURS,
  LOCAL_BLOG_SCRAPE_SOURCES,
  LOCAL_MAX_ITEMS_PER_SOURCE,
  LOCAL_RELEASE_SOURCES,
  LOCAL_RSS_BLOG_SOURCES,
  LOCAL_VIDEO_LOOKBACK_HOURS,
  LOCAL_YOUTUBE_SOURCES
} from "./local-sources";
import { parseAtomFeed, parseRssFeed, type RssEntry } from "./rss";
import type { FeedItem, FetchResult } from "./types";
import { fetchYouTubeVideos, rssEntryWithinLookback } from "./youtube";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function lookbackCutoff(hours: number, now: Date): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function withinLookback(publishedAt: string | null, cutoff: Date): boolean {
  if (!publishedAt) {
    return true;
  }

  return new Date(publishedAt) >= cutoff;
}

function selectRecentCandidates(
  candidates: ScrapedArticleCandidate[],
  cutoff: Date,
  maxItems: number
): ScrapedArticleCandidate[] {
  const selected: ScrapedArticleCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.publishedAt && !withinLookback(candidate.publishedAt, cutoff)) {
      continue;
    }

    selected.push(candidate);
    if (selected.length >= maxItems) {
      break;
    }
  }

  return selected;
}

function blogItem(
  author: string,
  title: string,
  url: string,
  createdAt: string,
  body: string,
  metadata: Record<string, string | boolean> = {}
): FeedItem {
  return {
    id: `blog:${url}`,
    source: "blog",
    title: titleWithAuthor(author, title),
    author,
    url,
    createdAt,
    body,
    metadata: {
      localFallback: true,
      ...metadata
    }
  };
}

function podcastItem(
  author: string,
  title: string,
  url: string,
  createdAt: string,
  body: string,
  metadata: Record<string, string | boolean> = {}
): FeedItem {
  return {
    id: `podcast:${url}`,
    source: "podcast",
    title: titleWithAuthor(author, title),
    author,
    url,
    createdAt,
    body,
    metadata: {
      localFallback: true,
      ...metadata
    }
  };
}

function rssEntriesToBlogItems(entries: RssEntry[], author: string, now: Date, cutoff: Date): FeedItem[] {
  const items: FeedItem[] = [];

  for (const entry of entries) {
    if (!rssEntryWithinLookback(entry, cutoff)) {
      continue;
    }

    const { createdAt, dateEstimated } = normalizeArticleDate(entry.publishedAt, now, !entry.publishedAt);
    items.push(
      blogItem(author, entry.title, entry.url, createdAt, entry.description, {
        ...(dateEstimated ? { dateEstimated: true } : {})
      })
    );

    if (items.length >= LOCAL_MAX_ITEMS_PER_SOURCE) {
      break;
    }
  }

  return items;
}

async function fetchScrapedBlogSource(
  source: (typeof LOCAL_BLOG_SCRAPE_SOURCES)[number],
  now: Date,
  cutoff: Date,
  errors: string[]
): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  try {
    const indexHtml = await fetchText(source.indexUrl);
    const candidates = selectRecentCandidates(
      parseBlogIndex(source.kind, indexHtml),
      cutoff,
      LOCAL_MAX_ITEMS_PER_SOURCE
    );

    for (const candidate of candidates) {
      try {
        const articleHtml = await fetchText(candidate.url);
        const extracted = extractArticleContent(source.kind, articleHtml);
        const title = extracted.title || candidate.title || "Untitled";
        const body = extracted.content || candidate.description || title;
        const publishedAt = extracted.publishedAt ?? candidate.publishedAt;
        const { createdAt, dateEstimated } = normalizeArticleDate(publishedAt, now, !publishedAt);

        items.push(
          blogItem(source.name, title, candidate.url, createdAt, body, {
            ...(dateEstimated ? { dateEstimated: true } : {})
          })
        );
      } catch (error) {
        errors.push(`Local blog: failed to fetch ${candidate.url}: ${errorMessage(error)}`);
      }
    }
  } catch (error) {
    errors.push(`Local blog: failed to fetch index for ${source.name}: ${errorMessage(error)}`);
  }

  return items;
}

async function fetchRssBlogSources(now: Date, cutoff: Date, errors: string[]): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  for (const source of LOCAL_RSS_BLOG_SOURCES) {
    try {
      const xml = await fetchText(source.rssUrl);
      const entries = parseRssFeed(xml).filter((entry) =>
        source.include ? source.include(entry.title, entry.url) : true
      );
      items.push(...rssEntriesToBlogItems(entries, source.name, now, cutoff));
    } catch (error) {
      errors.push(`Local blog RSS failed for ${source.name}: ${errorMessage(error)}`);
    }
  }

  return items;
}

async function fetchReleaseBlogSources(now: Date, cutoff: Date, errors: string[]): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  for (const source of LOCAL_RELEASE_SOURCES) {
    try {
      const xml = await fetchText(source.atomUrl);
      const entries = parseAtomFeed(xml).filter((entry) => !/Release notes from/i.test(entry.title));
      items.push(...rssEntriesToBlogItems(entries, source.name, now, cutoff));
    } catch (error) {
      errors.push(`Local release feed failed for ${source.name}: ${errorMessage(error)}`);
    }
  }

  return items;
}

async function fetchYouTubeSources(now: Date, cutoff: Date, errors: string[]): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  for (const source of LOCAL_YOUTUBE_SOURCES) {
    try {
      const videos = await fetchYouTubeVideos(source.channelUrl);
      let count = 0;

      for (const video of videos) {
        if (!withinLookback(video.publishedAt, cutoff)) {
          continue;
        }

        const { createdAt, dateEstimated } = normalizeArticleDate(video.publishedAt, now, !video.publishedAt);
        items.push(
          podcastItem(source.name, video.title, video.url, createdAt, video.title, {
            mediaKind: "youtube",
            ...(dateEstimated ? { dateEstimated: true } : {})
          })
        );
        count += 1;

        if (count >= LOCAL_MAX_ITEMS_PER_SOURCE) {
          break;
        }
      }
    } catch (error) {
      errors.push(`Local YouTube failed for ${source.name}: ${errorMessage(error)}`);
    }
  }

  return items;
}

export async function fetchLocalFallbackItems(options: {
  syncBlogs: boolean;
  syncPodcasts: boolean;
  syncLocalFallback: boolean;
  now?: Date;
}): Promise<FetchResult> {
  if (!options.syncLocalFallback) {
    return { items: [], skipped: 0, errors: [] };
  }

  const now = options.now ?? new Date();
  const blogCutoff = lookbackCutoff(LOCAL_BLOG_LOOKBACK_HOURS, now);
  const videoCutoff = lookbackCutoff(LOCAL_VIDEO_LOOKBACK_HOURS, now);
  const items: FeedItem[] = [];
  const errors: string[] = [];

  if (options.syncBlogs) {
    for (const source of LOCAL_BLOG_SCRAPE_SOURCES) {
      items.push(...(await fetchScrapedBlogSource(source, now, blogCutoff, errors)));
    }
    items.push(...(await fetchRssBlogSources(now, blogCutoff, errors)));
    items.push(...(await fetchReleaseBlogSources(now, blogCutoff, errors)));
  }

  if (options.syncPodcasts) {
    items.push(...(await fetchYouTubeSources(now, videoCutoff, errors)));
  }

  return { items, skipped: 0, errors };
}
