import { renderFeedItemMarkdown } from "../src/markdown";
import type { FeedItem } from "../src/types";

const item: FeedItem = {
  id: "x:123",
  source: "x",
  title: "Thariq: save me money prompt",
  author: "Thariq",
  handle: "trq212",
  bio: "Claude Code @anthropicai",
  url: "https://x.com/trq212/status/123",
  createdAt: "2026-05-24T02:51:49.000Z",
  body: "every now and then I remember you can run the prompt",
  metadata: {
    likes: 29,
    retweets: 1,
    replies: 2,
    isQuote: false
  }
};

describe("renderFeedItemMarkdown", () => {
  it("renders frontmatter, source link, content, and metadata", () => {
    const markdown = renderFeedItemMarkdown(item, "2026-05-25T03:30:00.000Z");

    expect(markdown).toContain("source: x");
    expect(markdown).toContain('title: "Thariq: save me money prompt"');
    expect(markdown).toContain('follow_builders_id: "x:123"');
    expect(markdown).toContain("# Thariq: save me money prompt");
    expect(markdown).toContain("> Source: [Original link](https://x.com/trq212/status/123)");
    expect(markdown).toContain("every now and then I remember");
    expect(markdown).toContain("- Likes: 29");
  });

  it("escapes quotes in frontmatter strings", () => {
    const markdown = renderFeedItemMarkdown(
      { ...item, title: 'Builder says "ship it"' },
      "2026-05-25T03:30:00.000Z"
    );

    expect(markdown).toContain('title: "Builder says \\"ship it\\""');
  });
});
