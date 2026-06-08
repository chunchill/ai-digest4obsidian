export function safeFileName(input: string, maxLength = 80): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return slug || "untitled";
}

export function parseFeedDate(value: string, fallback = new Date()): string {
  const trimmed = value.trim();
  const localeDateMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);

  if (localeDateMatch) {
    const parsed = new Date(`${localeDateMatch[1]} ${localeDateMatch[2]}, ${localeDateMatch[3]} 12:00:00 GMT`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return fallback.toISOString();
}

export function dateFolderFromIso(isoTimestamp: string, today = new Date()): string {
  const parsed = new Date(isoTimestamp.trim());
  const validDate = Number.isNaN(parsed.getTime()) ? today : parsed;

  return validDate.toISOString().slice(0, 10);
}

export function truncateText(text: string, maxLength: number): string {
  return text.slice(0, maxLength);
}

export function titleWithAuthor(author: string | undefined, title: string): string {
  const normalizedTitle = truncateText(title.replace(/\s+/g, " ").trim(), 80);
  return author ? `${author}: ${normalizedTitle}` : normalizedTitle;
}
