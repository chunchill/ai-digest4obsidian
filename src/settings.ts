import { App, PluginSettingTab, Setting } from "obsidian";
import type FollowBuildersSyncPlugin from "./main";

const DEFAULT_TARGET_FOLDER = "Follow Builders";

export class FollowBuildersSettingTab extends PluginSettingTab {
  constructor(app: App, public plugin: FollowBuildersSyncPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Target folder")
      .setDesc("Root folder where synced notes will be written.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_TARGET_FOLDER)
          .setValue(this.plugin.settings.targetFolder)
          .onChange(async (value) => {
            this.plugin.settings.targetFolder = value.trim() || DEFAULT_TARGET_FOLDER;
            await this.plugin.savePluginData();
          })
      );

    new Setting(containerEl)
      .setName("Sync X posts")
      .setDesc("Import builder posts from the central X feed.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncX).onChange(async (value) => {
          this.plugin.settings.syncX = value;
          await this.plugin.savePluginData();
        })
      );

    new Setting(containerEl)
      .setName("Sync podcasts")
      .setDesc("Import podcast episodes from the central podcast feed.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncPodcasts).onChange(async (value) => {
          this.plugin.settings.syncPodcasts = value;
          await this.plugin.savePluginData();
        })
      );

    new Setting(containerEl)
      .setName("Sync blogs")
      .setDesc("Import posts from the central blog feed.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncBlogs).onChange(async (value) => {
          this.plugin.settings.syncBlogs = value;
          await this.plugin.savePluginData();
        })
      );

    new Setting(containerEl)
      .setName("Write daily digest")
      .setDesc("Create or update one date-named digest note under Daily for each synced day.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.writeDailyDigest).onChange(async (value) => {
          this.plugin.settings.writeDailyDigest = value;
          await this.plugin.savePluginData();
        })
      );

    new Setting(containerEl)
      .setName("Overwrite existing files")
      .setDesc("When enabled, sync rewrites an existing note for the same feed item.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.overwriteExisting).onChange(async (value) => {
          this.plugin.settings.overwriteExisting = value;
          await this.plugin.savePluginData();
        })
      );

    new Setting(containerEl)
      .setName("Clear sync history")
      .setDesc("Clears remembered feed item IDs. Existing Markdown files are not deleted.")
      .addButton((button) =>
        button
          .setWarning()
          .setButtonText("Clear history")
          .setDisabled(this.plugin.isSyncing())
          .onClick(async () => {
            await this.plugin.clearSyncHistory();
            this.display();
          })
      );
  }
}
