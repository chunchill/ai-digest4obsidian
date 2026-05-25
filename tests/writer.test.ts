vi.mock("obsidian", () => ({
  normalizePath: (path: string) => path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, ""),
  TFile: class TFile {},
  TFolder: class TFolder {}
}));

import { buildItemPath, normalizeRootFolder, writeDailyDigest, writeFeedItem } from "../src/writer";
import { renderFeedItemMarkdown } from "../src/markdown";
import type { FeedItem } from "../src/types";

type FakeFile = { kind: "file"; path: string };
type FakeFolder = { kind: "folder"; path: string };
type FakeNode = FakeFile | FakeFolder;

class FakeVault {
  readonly nodes = new Map<string, FakeNode>();
  readonly contents = new Map<string, string>();
  readonly createdFolders: string[] = [];
  readonly createdFiles: string[] = [];
  readonly modifiedFiles: string[] = [];

  getAbstractFileByPath(path: string): FakeNode | null {
    return this.nodes.get(path) ?? null;
  }

  async createFolder(path: string): Promise<void> {
    this.nodes.set(path, { kind: "folder", path });
    this.createdFolders.push(path);
  }

  async create(path: string, data: string): Promise<FakeFile> {
    const file = { kind: "file" as const, path };
    this.nodes.set(path, file);
    this.contents.set(path, data);
    this.createdFiles.push(path);
    return file;
  }

  async modify(file: FakeFile, data: string): Promise<void> {
    this.contents.set(file.path, data);
    this.modifiedFiles.push(file.path);
  }

  addFile(path: string, data: string): FakeFile {
    const file = { kind: "file" as const, path };
    this.nodes.set(path, file);
    this.contents.set(path, data);
    return file;
  }

  addFolder(path: string): FakeFolder {
    const folder = { kind: "folder" as const, path };
    this.nodes.set(path, folder);
    return folder;
  }
}

const item: FeedItem = {
  id: "x:2058377974882210096",
  source: "x",
  title: "Thariq: every now and then",
  author: "Thariq",
  handle: "trq212",
  bio: "Building with AI",
  url: "https://x.com/trq212/status/2058377974882210096",
  createdAt: "2026-05-24T02:42:06.000Z",
  body: "every now and then I remember you can run the prompt",
  metadata: {
    likes: 463,
    retweets: 24,
    replies: 11
  }
};

describe("buildItemPath", () => {
  it("builds a normalized root/date/source-title-id markdown path", () => {
    expect(buildItemPath("Follow Builders", item)).toBe(
      "Follow Builders/2026-05-24/x-thariq-every-now-and-then-2058377974882210096.md"
    );
  });

  it("normalizes root folder whitespace, separators, and trailing slashes", () => {
    expect(buildItemPath(" Follow Builders\\\\Daily/// ", item)).toBe(
      "Follow Builders/Daily/2026-05-24/x-thariq-every-now-and-then-2058377974882210096.md"
    );
  });
});

describe("writeFeedItem", () => {
  it("creates root/date folders and writes a new file using renderFeedItemMarkdown", async () => {
    const vault = new FakeVault();
    const syncedAt = "2026-05-25T03:30:00.000Z";
    const path = buildItemPath("Follow Builders", item);

    const result = await writeFeedItem(vault, "Follow Builders", item, {
      overwriteExisting: false,
      syncedAt
    });

    expect(result).toEqual({ status: "created", path });
    expect(vault.createdFolders).toEqual(["Follow Builders", "Follow Builders/2026-05-24"]);
    expect(vault.createdFiles).toEqual([path]);
    expect(vault.contents.get(path)).toBe(renderFeedItemMarkdown(item, syncedAt));
  });

  it("skips an existing file when overwriteExisting is false", async () => {
    const vault = new FakeVault();
    const path = buildItemPath("Follow Builders", item);
    vault.nodes.set("Follow Builders", { kind: "folder", path: "Follow Builders" });
    vault.nodes.set("Follow Builders/2026-05-24", {
      kind: "folder",
      path: "Follow Builders/2026-05-24"
    });
    vault.addFile(path, "existing");

    const result = await writeFeedItem(vault, "Follow Builders", item, {
      overwriteExisting: false,
      syncedAt: "2026-05-25T03:30:00.000Z"
    });

    expect(result).toEqual({ status: "skipped", path });
    expect(vault.contents.get(path)).toBe("existing");
    expect(vault.modifiedFiles).toEqual([]);
    expect(vault.createdFiles).toEqual([]);
  });

  it("modifies an existing file when overwriteExisting is true", async () => {
    const vault = new FakeVault();
    const syncedAt = "2026-05-25T03:30:00.000Z";
    const path = buildItemPath("Follow Builders", item);
    vault.nodes.set("Follow Builders", { kind: "folder", path: "Follow Builders" });
    vault.nodes.set("Follow Builders/2026-05-24", {
      kind: "folder",
      path: "Follow Builders/2026-05-24"
    });
    vault.addFile(path, "existing");

    const result = await writeFeedItem(vault, "Follow Builders", item, {
      overwriteExisting: true,
      syncedAt
    });

    expect(result).toEqual({ status: "updated", path });
    expect(vault.modifiedFiles).toEqual([path]);
    expect(vault.createdFiles).toEqual([]);
    expect(vault.contents.get(path)).toBe(renderFeedItemMarkdown(item, syncedAt));
  });

  it.each([
    "../Follow Builders",
    "/Follow Builders",
    "\\\\server\\share",
    "C:/Follow Builders",
    ".obsidian/Follow Builders",
    "Follow Builders/./Other",
    "Follow Builders/../Other",
    ""
  ])("rejects unsafe root folder %j", async (rootFolder) => {
    const vault = new FakeVault();

    expect(() => normalizeRootFolder(rootFolder)).toThrow(/unsafe root folder/i);
    expect(() => buildItemPath(rootFolder, item)).toThrow(/unsafe root folder/i);
    await expect(
      writeFeedItem(vault, rootFolder, item, {
        overwriteExisting: false,
        syncedAt: "2026-05-25T03:30:00.000Z"
      })
    ).rejects.toThrow(/unsafe root folder/i);
  });

  it.each(["Follow Builders", "Follow Builders/2026-05-24"])(
    "throws when a file exists where folder %j is needed",
    async (conflictPath) => {
      const vault = new FakeVault();
      if (conflictPath !== "Follow Builders") {
        vault.addFolder("Follow Builders");
      }
      vault.addFile(conflictPath, "not a folder");

      await expect(
        writeFeedItem(vault, "Follow Builders", item, {
          overwriteExisting: false,
          syncedAt: "2026-05-25T03:30:00.000Z"
        })
      ).rejects.toThrow(`Cannot create folder ${conflictPath}: a file exists at that path`);
    }
  );

  it("throws when a folder exists at the final markdown path", async () => {
    const vault = new FakeVault();
    const path = buildItemPath("Follow Builders", item);
    vault.addFolder("Follow Builders");
    vault.addFolder("Follow Builders/2026-05-24");
    vault.addFolder(path);

    await expect(
      writeFeedItem(vault, "Follow Builders", item, {
        overwriteExisting: true,
        syncedAt: "2026-05-25T03:30:00.000Z"
      })
    ).rejects.toThrow(`Cannot write item ${item.id}: a folder exists at ${path}`);
  });
});

describe("writeDailyDigest", () => {
  it("creates the Daily folder and writes a daily digest file", async () => {
    const vault = new FakeVault();

    const result = await writeDailyDigest(vault, "Follow Builders", "2026-05-25", "# Digest\n");

    expect(result).toEqual({ status: "created", path: "Follow Builders/Daily/2026-05-25.md" });
    expect(vault.createdFolders).toEqual(["Follow Builders", "Follow Builders/Daily"]);
    expect(vault.createdFiles).toEqual(["Follow Builders/Daily/2026-05-25.md"]);
    expect(vault.contents.get("Follow Builders/Daily/2026-05-25.md")).toBe("# Digest\n");
  });

  it("updates an existing daily digest file on rerun", async () => {
    const vault = new FakeVault();
    vault.addFolder("Follow Builders");
    vault.addFolder("Follow Builders/Daily");
    const file = vault.addFile("Follow Builders/Daily/2026-05-25.md", "old");

    const result = await writeDailyDigest(vault, "Follow Builders", "2026-05-25", "new");

    expect(result).toEqual({ status: "updated", path: file.path });
    expect(vault.modifiedFiles).toEqual([file.path]);
    expect(vault.contents.get(file.path)).toBe("new");
  });
});
