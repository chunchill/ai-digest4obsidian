const notices: string[] = [];

vi.mock("obsidian", () => {
  class MockPlugin {
    app = { vault: {} };
    private storedData: unknown;
    commands: Array<{ id: string; name: string; callback: () => void | Promise<void> }> = [];
    ribbonIcons: Array<{ icon: string; title: string; callback: () => void | Promise<void> }> = [];
    settingTabs: unknown[] = [];

    async loadData(): Promise<unknown> {
      return this.storedData;
    }

    async saveData(data: unknown): Promise<void> {
      this.storedData = data;
    }

    setStoredData(data: unknown): void {
      this.storedData = data;
    }

    getStoredData(): unknown {
      return this.storedData;
    }

    addRibbonIcon(icon: string, title: string, callback: () => void | Promise<void>): void {
      this.ribbonIcons.push({ icon, title, callback });
    }

    addCommand(command: { id: string; name: string; callback: () => void | Promise<void> }): void {
      this.commands.push(command);
    }

    addSettingTab(tab: unknown): void {
      this.settingTabs.push(tab);
    }
  }

  class MockPluginSettingTab {
    containerEl = { empty: vi.fn() };

    constructor(
      public app: unknown,
      public plugin: unknown
    ) {}
  }

  class MockSetting {
    constructor(public containerEl: unknown) {}
    setName(): this {
      return this;
    }
    setDesc(): this {
      return this;
    }
    addText(): this {
      return this;
    }
    addToggle(): this {
      return this;
    }
    addButton(): this {
      return this;
    }
  }

  function MockNotice(message: string): void {
    notices.push(message);
  }

  return {
    Notice: vi.fn(MockNotice),
    Plugin: MockPlugin,
    PluginSettingTab: MockPluginSettingTab,
    Setting: MockSetting
  };
});

vi.mock("../src/sync", () => ({
  runSync: vi.fn()
}));

vi.mock("../src/writer", () => ({
  writeDailyDigest: vi.fn()
}));

vi.mock("../src/digest", () => ({
  renderDailyDigestMarkdown: vi.fn(() => "# Digest\n")
}));

import FollowBuildersSyncPlugin from "../src/main";
import { runSync } from "../src/sync";
import { DEFAULT_SETTINGS } from "../src/types";

type HarnessCommand = { id: string; name: string; callback: () => void | Promise<void> };
type PluginHarness = FollowBuildersSyncPlugin & {
  commands: HarnessCommand[];
  ribbonIcons: Array<{ icon: string; title: string; callback: () => void | Promise<void> }>;
  settingTabs: unknown[];
  setStoredData(data: unknown): void;
  getStoredData(): unknown;
};

function createPlugin(): PluginHarness {
  return new FollowBuildersSyncPlugin({} as never, {} as never) as PluginHarness;
}

describe("FollowBuildersSyncPlugin", () => {
  beforeEach(() => {
    notices.length = 0;
    vi.mocked(runSync).mockReset();
  });

  it("loads legacy top-level settings and registers UI entry points", async () => {
    const plugin = createPlugin();
    plugin.setStoredData({
      targetFolder: "Legacy Folder",
      syncX: false,
      syncPodcasts: true,
      syncBlogs: false,
      overwriteExisting: true,
      writeDailyDigest: false
    });

    await plugin.onload();

    expect(plugin.settings).toEqual({
      ...DEFAULT_SETTINGS,
      targetFolder: "Legacy Folder",
      syncX: false,
      syncBlogs: false,
      overwriteExisting: true,
      writeDailyDigest: true
    });
    expect(plugin.state).toEqual({ syncedIds: {}, cachedItems: {} });
    expect(plugin.ribbonIcons).toHaveLength(1);
    expect(plugin.commands.map((command) => command.id)).toContain("sync-follow-builders-feeds");
    expect(plugin.settingTabs).toHaveLength(1);
  });

  it("runs sync from the command and persists settings with state", async () => {
    vi.mocked(runSync).mockResolvedValue({
      created: 1,
      updated: 2,
      skipped: 3,
      failed: 0,
      digestCreated: 0,
      digestUpdated: 1,
      digestSkipped: 0,
      digestFailed: 0,
      errors: ["Blog feed failed"]
    });
    const plugin = createPlugin();

    await plugin.onload();
    const command = plugin.commands.find((entry) => entry.id === "sync-follow-builders-feeds");
    await command?.callback();

    expect(runSync).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: plugin.settings,
        state: plugin.state,
        writeDigest: expect.any(Function)
      })
    );
    expect(plugin.getStoredData()).toEqual({
      settings: plugin.settings,
      state: plugin.state
    });
    expect(notices).toContain(
      "Follow Builders sync complete: 0 digest created, 1 digest updated, 0 digest skipped, 0 digest failed, 1 warning."
    );
  });

  it("uses per-run settings and reports write failure issues once", async () => {
    let resolveSync: ((value: {
      created: number;
      updated: number;
      skipped: number;
      failed: number;
      digestCreated: number;
      digestUpdated: number;
      digestSkipped: number;
      digestFailed: number;
      errors: string[];
    }) => void) | undefined;
    vi.mocked(runSync).mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        })
    );
    const plugin = createPlugin();

    await plugin.onload();
    plugin.settings.targetFolder = "Initial Folder";
    const command = plugin.commands.find((entry) => entry.id === "sync-follow-builders-feeds");
    const syncPromise = command?.callback();

    expect(plugin.isSyncing()).toBe(true);
    plugin.settings.targetFolder = "Changed Folder";
    await plugin.clearSyncHistory();

    expect(notices).toContain("Cannot clear Follow Builders history while sync is running.");
    expect(runSync).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ targetFolder: "Initial Folder" })
      })
    );

    resolveSync?.({
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      digestCreated: 0,
      digestUpdated: 0,
      digestSkipped: 0,
      digestFailed: 0,
      errors: ["Failed to write x:1: vault unavailable"]
    });
    await syncPromise;

    expect(notices).toContain(
      "Follow Builders sync complete: 0 digest created, 0 digest updated, 0 digest skipped, 0 digest failed, 0 warnings."
    );
    expect(plugin.isSyncing()).toBe(false);
  });
});
