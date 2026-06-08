export interface RssEntry {
  title: string;
  url: string;
  guid: string;
  publishedAt: string | null;
  description: string;
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
}

function field(block: string, tag: string): string | undefined {
  const match =
    block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")) ||
    block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));

  if (!match) {
    return undefined;
  }

  const value = stripCdata(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return value.length > 0 ? value : undefined;
}

function atomLink(block: string): string | undefined {
  const alternate = block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
  if (alternate) {
    return alternate[1];
  }

  const href = block.match(/<link[^>]*href="([^"]+)"/i);
  return href?.[1];
}

function parseDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseRssFeed(xml: string): RssEntry[] {
  const entries: RssEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const block = itemMatch[1];
    const title = field(block, "title") ?? "Untitled";
    const guid = field(block, "guid") ?? field(block, "link") ?? title;
    const url = field(block, "link") ?? guid;
    const publishedAt = parseDate(field(block, "pubDate") ?? field(block, "published"));
    const description =
      field(block, "description") ??
      field(block, "content:encoded") ??
      field(block, "summary") ??
      title;

    if (!url) {
      continue;
    }

    entries.push({ title, url, guid, publishedAt, description });
  }

  return entries;
}

export function parseAtomFeed(xml: string): RssEntry[] {
  const entries: RssEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1];
    const title = field(block, "title") ?? "Untitled";
    const url = atomLink(block) ?? field(block, "id");
    const guid = field(block, "id") ?? url ?? title;
    const publishedAt = parseDate(
      field(block, "published") ?? field(block, "updated") ?? field(block, "issued")
    );
    const description = field(block, "summary") ?? field(block, "content") ?? title;

    if (!url) {
      continue;
    }

    entries.push({ title, url, guid, publishedAt, description });
  }

  return entries;
}
