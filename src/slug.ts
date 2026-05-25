export function safeFileName(input: string, maxLength = 80): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return slug || "untitled";
}

export function dateFolderFromIso(isoTimestamp: string, today = new Date()): string {
  const date = new Date(isoTimestamp);
  const validDate = Number.isNaN(date.getTime()) ? today : date;

  return validDate.toISOString().slice(0, 10);
}

export function truncateText(text: string, maxLength: number): string {
  return text.slice(0, maxLength);
}
