import type { FeedItem } from "./types";

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function labelForMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

export function renderFeedItemMarkdown(item: FeedItem, syncedAt: string): string {
  const optionalAuthor = item.author ? `author: ${yamlString(item.author)}\n` : "";
  const optionalHandle = item.handle ? `handle: ${yamlString(item.handle)}\n` : "";

  const metadataLines = Object.entries(item.metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `- ${labelForMetadataKey(key)}: ${String(value)}`);

  const bioSection = item.bio ? `\n## Bio\n\n${item.bio}\n` : "";
  const metadataSection = metadataLines.length > 0 ? `\n## Metadata\n\n${metadataLines.join("\n")}\n` : "";

  return `---\nsource: ${item.source}\ntitle: ${yamlString(item.title)}\n${optionalAuthor}${optionalHandle}url: ${yamlString(item.url)}\ncreated: ${yamlString(item.createdAt)}\nsynced: ${yamlString(syncedAt)}\nfollow_builders_id: ${yamlString(item.id)}\ntags:\n  - follow-builders\n  - ai\n---\n\n# ${item.title}\n\n> Source: [Original link](${item.url})\n${bioSection}\n## Content\n\n${item.body}\n${metadataSection}`;
}
