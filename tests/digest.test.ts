vi.mock("obsidian", () => ({
  normalizePath: (path: string) => path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "")
}));

import { buildDailyDigestPath, groupItemsByDate, renderDailyDigestMarkdown } from "../src/digest";
import type { FeedItem } from "../src/types";

const podcast: FeedItem = {
  id: "podcast:latent-space",
  source: "podcast",
  title: "Why Agents Keep Failing",
  author: "Latent Space",
  url: "https://youtube.com/watch?v=agents",
  createdAt: "2026-05-25T01:00:00.000Z",
  body: "Most agent failures are tool-use failures. Tool selection matters.",
  metadata: {}
};

const tweetA: FeedItem = {
  id: "x:1",
  source: "x",
  title: "Andrej Karpathy: Software 3.0",
  author: "Andrej Karpathy",
  handle: "karpathy",
  url: "https://x.com/karpathy/status/1",
  createdAt: "2026-05-25T02:00:00.000Z",
  body: "Software 3.0 changes the compile target to natural language.",
  metadata: {}
};

const tweetB: FeedItem = {
  ...tweetA,
  id: "x:2",
  url: "https://x.com/karpathy/status/2",
  body: "New tutorial on building a code interpreter from scratch."
};

const blog: FeedItem = {
  id: "blog:anthropic",
  source: "blog",
  title: "Anthropic Engineering: Building reliable agents",
  author: "Anthropic Engineering",
  url: "https://www.anthropic.com/engineering/agents",
  createdAt: "2026-05-25T03:00:00.000Z",
  body: "Reliable agents need evals, tool boundaries, and feedback loops.",
  metadata: { description: "How Anthropic builds reliable agents." }
};

describe("daily digest", () => {
  it("groups items by created date", () => {
    const groups = groupItemsByDate([podcast, { ...tweetA, createdAt: "2026-05-24T23:59:00.000Z" }]);

    expect([...groups.keys()]).toEqual(["2026-05-24", "2026-05-25"]);
    expect(groups.get("2026-05-25")).toEqual([podcast]);
  });

  it("builds the date-named digest path directly under the root folder", () => {
    expect(buildDailyDigestPath("Follow Builders", "2026-05-25")).toBe("Follow Builders/2026-05-25.md");
  });

  it("renders digest sections in upstream sample order", () => {
    const markdown = renderDailyDigestMarkdown("2026-05-25", [blog, tweetA, podcast], "2026-05-25T10:00:00.000Z");

    expect(markdown.indexOf("## PODCASTS")).toBeLessThan(markdown.indexOf("## X / TWITTER"));
    expect(markdown.indexOf("## X / TWITTER")).toBeLessThan(markdown.indexOf("## BLOGS"));
    expect(markdown).toContain("# AI Builders Digest - 2026-05-25");
    expect(markdown).toContain('Latent Space - "Why Agents Keep Failing"');
    expect(markdown).toContain("Andrej Karpathy (@karpathy)");
    expect(markdown).toContain('Anthropic Engineering - "Anthropic Engineering: Building reliable agents"');
  });

  it("groups multiple X posts from the same builder under one heading", () => {
    const markdown = renderDailyDigestMarkdown("2026-05-25", [tweetA, tweetB], "2026-05-25T10:00:00.000Z");

    expect(markdown.match(/Andrej Karpathy \(@karpathy\)/g)).toHaveLength(1);
    expect(markdown).toContain("https://x.com/karpathy/status/1");
    expect(markdown).toContain("https://x.com/karpathy/status/2");
  });
});
