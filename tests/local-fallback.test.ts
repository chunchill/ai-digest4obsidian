vi.mock("obsidian", () => ({
  requestUrl: vi.fn()
}));

import { mergeFeedItems } from "../src/cache";
import { parseAnthropicEngineeringIndex, parseCursorBlogIndex } from "../src/blog-scrape";
import { parseAtomFeed, parseRssFeed } from "../src/rss";
import { parseYouTubeAtomFeed } from "../src/youtube";
import type { FeedItem } from "../src/types";

describe("rss parsing", () => {
  it("parses RSS items", () => {
    const [entry] = parseRssFeed(`
      <rss><channel>
        <item>
          <title><![CDATA[Hello world]]></title>
          <link>https://example.com/post</link>
          <guid>guid-1</guid>
          <pubDate>Mon, 05 Jun 2026 07:42:12 GMT</pubDate>
          <description>Summary text</description>
        </item>
      </channel></rss>
    `);

    expect(entry).toMatchObject({
      title: "Hello world",
      url: "https://example.com/post",
      description: "Summary text"
    });
    expect(entry.publishedAt).toBeTruthy();
  });

  it("parses Atom release entries", () => {
    const entries = parseAtomFeed(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>v1.2.3</title>
          <link href="https://github.com/example/repo/releases/tag/v1.2.3" rel="alternate"/>
          <id>tag:github.com,2008:example/v1.2.3</id>
          <published>2026-06-05T07:42:12Z</published>
          <summary>Release notes</summary>
        </entry>
      </feed>
    `);

    expect(entries[0]).toMatchObject({
      title: "v1.2.3",
      url: "https://github.com/example/repo/releases/tag/v1.2.3",
      description: "Release notes"
    });
  });
});

describe("blog scrape parsing", () => {
  it("extracts Anthropic engineering slugs from index HTML", () => {
    const articles = parseAnthropicEngineeringIndex(`
      <a href="/engineering/managed-agents">Managed agents</a>
      <a href="/engineering/claude-code-auto-mode">Auto mode</a>
    `);

    expect(articles.map((article) => article.url)).toEqual([
      "https://www.anthropic.com/engineering/managed-agents",
      "https://www.anthropic.com/engineering/claude-code-auto-mode"
    ]);
  });

  it("skips Cursor topic pages", () => {
    const articles = parseCursorBlogIndex(`
      <a href="/blog/composer-2-5">Composer</a>
      <a href="/blog/topic/product">Product</a>
    `);

    expect(articles).toHaveLength(1);
    expect(articles[0]?.url).toBe("https://cursor.com/blog/composer-2-5");
  });
});

describe("youtube parsing", () => {
  it("parses YouTube atom entries", () => {
    const [video] = parseYouTubeAtomFeed(`
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
        <entry>
          <title>Cursor 3 launch</title>
          <link href="https://www.youtube.com/watch?v=abc123"/>
          <published>2026-06-05T07:42:12+00:00</published>
          <yt:videoId>abc123</yt:videoId>
        </entry>
      </feed>
    `);

    expect(video).toMatchObject({
      title: "Cursor 3 launch",
      url: "https://www.youtube.com/watch?v=abc123"
    });
  });
});

describe("mergeFeedItems", () => {
  it("keeps central items and fills gaps from local fallback", () => {
    const central: FeedItem = {
      id: "blog:https://central.example/post",
      source: "blog",
      title: "Central post",
      url: "https://central.example/post",
      createdAt: "2026-06-05T07:42:12.776Z",
      body: "central",
      metadata: {}
    };
    const local: FeedItem = {
      id: "blog:https://www.anthropic.com/engineering/managed-agents",
      source: "blog",
      title: "Anthropic Engineering: Managed agents",
      author: "Anthropic Engineering",
      url: "https://www.anthropic.com/engineering/managed-agents",
      createdAt: "2026-06-05T07:42:12.776Z",
      body: "local",
      metadata: { localFallback: true }
    };

    const merged = mergeFeedItems([central], [local, { ...central, body: "duplicate" }]);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === central.id)?.body).toBe("central");
  });
});
