import { fetchText } from "./http";
import type { RssEntry } from "./rss";

export interface YouTubeVideo {
  title: string;
  url: string;
  publishedAt: string | null;
}

export async function resolveYouTubeFeedUrl(channelUrl: string): Promise<string | null> {
  const playlistMatch = channelUrl.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (playlistMatch) {
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistMatch[1]}`;
  }

  const channelIdMatch = channelUrl.match(/\/channel\/(UC[A-Za-z0-9_-]+)/);
  if (channelIdMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;
  }

  const handleMatch = channelUrl.match(/\/@([A-Za-z0-9_.-]+)/);
  if (!handleMatch) {
    return null;
  }

  try {
    const html = await fetchText(channelUrl);
    const idMatch =
      html.match(/"channelId":"(UC[A-Za-z0-9_-]{20,})"/) ||
      html.match(/<meta\s+itemprop="(?:identifier|channelId)"\s+content="(UC[A-Za-z0-9_-]{20,})"/);
    return idMatch ? `https://www.youtube.com/feeds/videos.xml?channel_id=${idMatch[1]}` : null;
  } catch {
    return null;
  }
}

export function parseYouTubeAtomFeed(xml: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1];
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const publishedMatch = block.match(/<published>([\s\S]*?)<\/published>/i);
    const linkMatch = block.match(/<link[^>]*href="([^"]+)"/i);
    const videoIdMatch = block.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/i);

    const title = titleMatch?.[1]?.trim() ?? "Untitled";
    const publishedAtRaw = publishedMatch?.[1]?.trim();
    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;
    const url =
      linkMatch?.[1] ??
      (videoIdMatch ? `https://www.youtube.com/watch?v=${videoIdMatch[1].trim()}` : undefined);

    if (!url) {
      continue;
    }

    videos.push({ title, url, publishedAt });
  }

  return videos;
}

export function rssEntryWithinLookback(entry: RssEntry, cutoff: Date): boolean {
  if (!entry.publishedAt) {
    return true;
  }

  return new Date(entry.publishedAt) >= cutoff;
}

export async function fetchYouTubeVideos(channelUrl: string): Promise<YouTubeVideo[]> {
  const feedUrl = await resolveYouTubeFeedUrl(channelUrl);
  if (!feedUrl) {
    return [];
  }

  const xml = await fetchText(feedUrl);
  return parseYouTubeAtomFeed(xml);
}
