import type { FeedItem } from "./types";

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function labelForMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function singleLineText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F\s]+/g, " ").trim();
}

function sourceUrl(value: string): string {
  return singleLineText(value).replace(/[<>\s]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`
  );
}

function metadataValue(value: string | number | boolean): string {
  return typeof value === "string" ? singleLineText(value) : String(value);
}

function hasMetadataValue(
  entry: [string, string | number | boolean | null | undefined]
): entry is [string, string | number | boolean] {
  const [, value] = entry;
  return value !== undefined && value !== null && value !== "";
}

export function renderFeedItemMarkdown(item: FeedItem, syncedAt: string): string {
  const optionalAuthor = item.author ? `author: ${yamlString(item.author)}\n` : "";
  const optionalHandle = item.handle ? `handle: ${yamlString(item.handle)}\n` : "";
  const displayTitle = singleLineText(item.title);
  const displaySourceUrl = sourceUrl(item.url);

  const metadataLines = Object.entries(item.metadata)
    .filter(hasMetadataValue)
    .map(([key, value]) => `- ${labelForMetadataKey(key)}: ${metadataValue(value)}`);

  const bioSection = item.bio ? `\n## Bio\n\n${item.bio}\n` : "";
  const metadataSection = metadataLines.length > 0 ? `\n## Metadata\n\n${metadataLines.join("\n")}\n` : "";

  return `---\nsource: ${item.source}\ntitle: ${yamlString(item.title)}\n${optionalAuthor}${optionalHandle}url: ${yamlString(item.url)}\ncreated: ${yamlString(item.createdAt)}\nsynced: ${yamlString(syncedAt)}\nfollow_builders_id: ${yamlString(item.id)}\ntags:\n  - follow-builders\n  - ai\n---\n\n# ${displayTitle}\n\n> Source: <${displaySourceUrl}>\n${bioSection}\n## Content\n\n${item.body}\n${metadataSection}`;
}
