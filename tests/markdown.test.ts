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
    expect(markdown).toContain("> Source: <https://x.com/trq212/status/123>");
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

  it("escapes newlines and frontmatter delimiters in frontmatter strings", () => {
    const markdown = renderFeedItemMarkdown(
      { ...item, title: "Builder\n---\nship it" },
      "2026-05-25T03:30:00.000Z"
    );

    expect(markdown).toContain('title: "Builder\\n---\\nship it"');
    expect(markdown).not.toContain("title: \"Builder\n---");
  });

  it("renders multiline titles as a single-line heading", () => {
    const markdown = renderFeedItemMarkdown(
      { ...item, title: "Builder\nships" },
      "2026-05-25T03:30:00.000Z"
    );

    expect(markdown).toContain("# Builder ships");
    expect(markdown).not.toContain("# Builder\nships");
  });

  it("renders source URLs with closing parentheses as angle-bracket autolinks", () => {
    const markdown = renderFeedItemMarkdown(
      { ...item, url: "https://example.com/path(foo)?q=a b" },
      "2026-05-25T03:30:00.000Z"
    );

    expect(markdown).toContain('url: "https://example.com/path(foo)?q=a b"');
    expect(markdown).toContain("> Source: <https://example.com/path(foo)?q=a%20b>");
  });

  it("renders multiline string metadata as single-line bullet text", () => {
    const markdown = renderFeedItemMarkdown(
      {
        ...item,
        metadata: {
          ...item.metadata,
          note: "first line\n## injected\nsecond line"
        }
      },
      "2026-05-25T03:30:00.000Z"
    );

    expect(markdown).toContain("- Note: first line ## injected second line");
    expect(markdown).not.toContain("- Note: first line\n## injected");
  });
});
