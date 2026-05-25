import { normalizePath } from "obsidian";
import { dateFolderFromIso } from "./slug";
import type { FeedItem, FeedSource } from "./types";
import { normalizeRootFolder } from "./writer";

function yamlString(value: string): string {
  return JSON.stringify(value).replace(/[\u007F-\u009F]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, " ").trim();
}

function excerpt(value: string, maxLength = 220): string {
  const text = oneLine(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function displayTitle(item: FeedItem): string {
  if (item.author && item.title.startsWith(`${item.author}: `)) {
    return item.title.slice(item.author.length + 2);
  }

  return item.title;
}

function orderedSources(items: FeedItem[]): FeedSource[] {
  const order: FeedSource[] = ["podcast", "x", "blog"];
  const present = new Set(items.map((item) => item.source));

  return order.filter((source) => present.has(source));
}

export function groupItemsByDate(items: FeedItem[]): Map<string, FeedItem[]> {
  const groups = new Map<string, FeedItem[]>();

  for (const item of [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const date = dateFolderFromIso(item.createdAt);
    groups.set(date, [...(groups.get(date) ?? []), item]);
  }

  return groups;
}

export function buildDailyDigestPath(rootFolder: string, date: string): string {
  return normalizePath(`${normalizeRootFolder(rootFolder)}/Daily/${date}.md`);
}

export function renderDailyDigestMarkdown(date: string, items: FeedItem[], generatedAt: string): string {
  const sections: string[] = [];
  const frontmatterSources = orderedSources(items).map((source) => `  - ${source}`).join("\n");

  const podcasts = items.filter((item) => item.source === "podcast");
  if (podcasts.length > 0) {
    sections.push(`## PODCASTS\n\n${podcasts.map(renderPodcast).join("\n\n")}`);
  }

  const tweets = items.filter((item) => item.source === "x");
  if (tweets.length > 0) {
    sections.push(`## X / TWITTER\n\n${renderTweets(tweets)}`);
  }

  const blogs = items.filter((item) => item.source === "blog");
  if (blogs.length > 0) {
    sections.push(`## BLOGS\n\n${blogs.map(renderBlog).join("\n\n")}`);
  }

  return `---\ntype: follow-builders-digest\ndate: ${yamlString(date)}\ngenerated: ${yamlString(generatedAt)}\nitem_count: ${items.length}\nsources:\n${frontmatterSources}\ntags:\n  - follow-builders\n  - ai\n  - digest\n---\n\n# AI Builders Digest - ${date}\n\n${sections.join("\n\n")}\n`;
}

function renderPodcast(item: FeedItem): string {
  return `${item.author ?? "Podcast"} - "${displayTitle(item)}"\nBottom line: ${excerpt(item.body)}\n\nKey material:\n- ${excerpt(item.body, 160)}\n\n${item.url}`;
}

function renderTweets(items: FeedItem[]): string {
  const groups = new Map<string, FeedItem[]>();

  for (const item of items) {
    const key = `${item.author ?? "Unknown"}\n${item.handle ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.values()]
    .map((builderItems) => {
      const first = builderItems[0];
      const heading = first.handle ? `${first.author ?? first.handle} (@${first.handle})` : first.author ?? "Unknown builder";
      const entries = builderItems.map((item) => `${excerpt(item.body)}\n${item.url}`).join("\n\n");
      return `${heading}\n${entries}`;
    })
    .join("\n\n");
}

function renderBlog(item: FeedItem): string {
  const description = item.metadata.description;
  const summary = typeof description === "string" && description.trim() ? description : item.body;

  return `${item.author ?? "Blog"} - "${item.title}"\nBottom line: ${excerpt(summary)}\n${item.url}`;
}
