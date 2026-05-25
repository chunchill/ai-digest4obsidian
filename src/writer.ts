import { normalizePath, TFile, TFolder, type Vault } from "obsidian";
import { renderFeedItemMarkdown } from "./markdown";
import { dateFolderFromIso, safeFileName } from "./slug";
import type { FeedItem } from "./types";

type FakeFile = { kind: "file"; path: string };
type FakeFolder = { kind: "folder"; path: string };
type VaultEntry = NonNullable<ReturnType<Vault["getAbstractFileByPath"]>> | FakeFile | FakeFolder;
type WritableFile = TFile | FakeFile;

export interface MinimalVault {
  getAbstractFileByPath(path: string): VaultEntry | null;
  createFolder(path: string): Promise<TFolder | void>;
  create(path: string, data: string): Promise<WritableFile>;
  modify(file: WritableFile, data: string): ReturnType<Vault["modify"]>;
}

export interface WriteOptions {
  overwriteExisting: boolean;
  syncedAt: string;
}

export interface WriteResult {
  status: "created" | "updated" | "skipped";
  path: string;
}

function idSuffix(id: string): string {
  const colonIndex = id.indexOf(":");
  const suffix = colonIndex === -1 ? id : id.slice(colonIndex + 1);
  return safeFileName(suffix, 40);
}

function isTFile(entry: VaultEntry): entry is TFile {
  return entry instanceof TFile;
}

function isTFolder(entry: VaultEntry): entry is TFolder {
  return entry instanceof TFolder;
}

function fakeKind(entry: VaultEntry): "file" | "folder" | undefined {
  return (entry as { kind?: "file" | "folder" }).kind;
}

function isFile(entry: VaultEntry): entry is WritableFile {
  return isTFile(entry) || fakeKind(entry) === "file";
}

function isFolder(entry: VaultEntry): entry is TFolder | FakeFolder {
  return isTFolder(entry) || fakeKind(entry) === "folder";
}

export function normalizeRootFolder(rootFolder: string): string {
  const trimmed = rootFolder.trim();
  const slashNormalized = trimmed.replace(/\\/g, "/");

  if (!slashNormalized) {
    throw new Error("Unsafe root folder: path must not be empty");
  }

  if (
    slashNormalized.startsWith("/") ||
    slashNormalized.startsWith("//") ||
    /^[A-Za-z]:($|\/)/.test(slashNormalized)
  ) {
    throw new Error("Unsafe root folder: absolute paths are not allowed");
  }

  const normalized = normalizePath(slashNormalized).replace(/\/+$/g, "");

  if (!normalized) {
    throw new Error("Unsafe root folder: path must not be empty");
  }

  if (normalized.startsWith("/") || /^[A-Za-z]:($|\/)/.test(normalized)) {
    throw new Error("Unsafe root folder: absolute paths are not allowed");
  }

  const segments = normalized.split("/");
  const unsafeSegment = segments.find(
    (segment) => segment === "." || segment === ".." || segment.toLowerCase() === ".obsidian"
  );

  if (unsafeSegment) {
    throw new Error(`Unsafe root folder: disallowed path segment "${unsafeSegment}"`);
  }

  return normalized;
}

export function buildItemPath(rootFolder: string, item: FeedItem): string {
  const safeRootFolder = normalizeRootFolder(rootFolder);
  const dateFolder = dateFolderFromIso(item.createdAt);
  const titleSlug = safeFileName(item.title, 64);
  const suffix = idSuffix(item.id);

  return normalizePath(`${safeRootFolder}/${dateFolder}/${item.source}-${titleSlug}-${suffix}.md`);
}

export function buildDailyDigestPath(rootFolder: string, date: string): string {
  const safeRootFolder = normalizeRootFolder(rootFolder);
  return normalizePath(`${safeRootFolder}/${date}.md`);
}

async function ensureFolder(vault: MinimalVault, folderPath: string): Promise<void> {
  const normalizedPath = normalizePath(folderPath);
  const parts = normalizedPath.split("/").filter((part) => part.length > 0);
  let currentPath = "";

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const existing = vault.getAbstractFileByPath(currentPath);

    if (existing) {
      if (!isFolder(existing)) {
        throw new Error(`Cannot create folder ${currentPath}: a file exists at that path`);
      }
      continue;
    }

    await vault.createFolder(currentPath);
  }
}

export async function writeFeedItem(
  vault: MinimalVault,
  rootFolder: string,
  item: FeedItem,
  options: WriteOptions
): Promise<WriteResult> {
  const path = buildItemPath(rootFolder, item);
  const markdown = renderFeedItemMarkdown(item, options.syncedAt);

  try {
    return await writeMarkdownFile(vault, path, markdown, {
      overwriteExisting: options.overwriteExisting
    });
  } catch (error) {
    if (error instanceof Error && error.message === `Cannot write markdown: a folder exists at ${path}`) {
      throw new Error(`Cannot write item ${item.id}: a folder exists at ${path}`);
    }
    throw error;
  }
}

export async function writeMarkdownFile(
  vault: MinimalVault,
  path: string,
  markdown: string,
  options: { overwriteExisting: boolean }
): Promise<WriteResult> {
  const folderPath = path.split("/").slice(0, -1).join("/");
  await ensureFolder(vault, folderPath);

  const existing = vault.getAbstractFileByPath(path);
  if (existing) {
    if (!isFile(existing)) {
      throw new Error(`Cannot write markdown: a folder exists at ${path}`);
    }

    if (!options.overwriteExisting) {
      return { status: "skipped", path };
    }

    await vault.modify(existing, markdown);
    return { status: "updated", path };
  }

  await vault.create(path, markdown);
  return { status: "created", path };
}

export async function writeDailyDigest(
  vault: MinimalVault,
  rootFolder: string,
  date: string,
  markdown: string
): Promise<WriteResult> {
  const path = buildDailyDigestPath(rootFolder, date);
  return writeMarkdownFile(vault, path, markdown, { overwriteExisting: true });
}
