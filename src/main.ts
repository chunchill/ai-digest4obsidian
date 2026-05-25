import { Notice, Plugin } from "obsidian";

export default class FollowBuildersSyncPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addRibbonIcon("refresh-cw", "Sync Follow Builders", () => {
      new Notice("Follow Builders Sync is not implemented yet.");
    });

    this.addCommand({
      id: "sync-follow-builders-feeds",
      name: "Sync Follow Builders feeds",
      callback: () => {
        new Notice("Follow Builders Sync is not implemented yet.");
      }
    });
  }
}
