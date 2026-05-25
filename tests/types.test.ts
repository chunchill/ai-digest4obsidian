import { DEFAULT_SETTINGS, createDefaultState } from "../src/types";

describe("settings defaults", () => {
  it("enables all feed sources and stores notes under Follow Builders", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      targetFolder: "Follow Builders",
      syncX: true,
      syncPodcasts: true,
      syncBlogs: true,
      overwriteExisting: false
    });
  });

  it("creates an empty sync state", () => {
    expect(createDefaultState()).toEqual({
      syncedIds: {}
    });
  });
});
