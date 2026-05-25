vi.mock("obsidian", () => ({
  requestUrl: vi.fn()
}));

import { requestUrl } from "obsidian";
import { fetchEnabledFeeds, parseBlogFeed, parsePodcastFeed, parseXFeed } from "../src/feeds";

const requestUrlMock = vi.mocked(requestUrl);

function jsonResponse(json: unknown): Awaited<ReturnType<typeof requestUrl>> {
  return {
    arrayBuffer: new ArrayBuffer(0),
    headers: {},
    json,
    status: 200,
    text: JSON.stringify(json)
  };
}

beforeEach(() => {
  requestUrlMock.mockReset();
});

describe("parseXFeed", () => {
  it("normalizes builder tweets", () => {
    const [item] = parseXFeed({
      x: [
        {
          name: "Thariq",
          handle: "trq212",
          bio: "Building with AI",
          tweets: [
            {
              id: "2058377974882210096",
              text: "every now and then I remember you can run the prompt",
              createdAt: "2026-05-24T02:51:49.000Z",
              url: "https://x.com/trq212/status/2058377974882210096",
              likes: 463,
              retweets: 24,
              replies: 11,
              isQuote: false
            }
          ]
        }
      ]
    });

    expect(item).toMatchObject({
      id: "x:2058377974882210096",
      source: "x",
      title: "Thariq: every now and then I remember you can run the prompt",
      author: "Thariq",
      handle: "trq212",
      url: "https://x.com/trq212/status/2058377974882210096",
      createdAt: "2026-05-24T02:51:49.000Z",
      body: "every now and then I remember you can run the prompt",
      metadata: {
        likes: 463
      }
    });
  });

  it("skips tweets without id, url, text, or date", () => {
    const items = parseXFeed({
      x: [
        {
          name: "Thariq",
          handle: "trq212",
          tweets: [
            {
              text: "missing id",
              createdAt: "2026-05-24T02:51:49.000Z",
              url: "https://x.com/trq212/status/1"
            },
            {
              id: "2",
              text: "missing url",
              createdAt: "2026-05-24T02:51:49.000Z"
            },
            {
              id: "3",
              createdAt: "2026-05-24T02:51:49.000Z",
              url: "https://x.com/trq212/status/3"
            },
            {
              id: "4",
              text: "missing date",
              url: "https://x.com/trq212/status/4"
            }
          ]
        }
      ]
    });

    expect(items).toEqual([]);
  });
});

describe("parsePodcastFeed", () => {
  it("normalizes podcast items", () => {
    const [item] = parsePodcastFeed({
      podcasts: [
        {
          name: "Latent Space",
          title: "AI episode",
          url: "https://www.latent.space/p/ai-episode",
          publishedAt: "2026-05-23T12:00:00.000Z",
          transcript: "Episode transcript"
        }
      ]
    });

    expect(item).toMatchObject({
      id: "podcast:https://www.latent.space/p/ai-episode",
      source: "podcast",
      title: "Latent Space: AI episode",
      author: "Latent Space",
      url: "https://www.latent.space/p/ai-episode",
      createdAt: "2026-05-23T12:00:00.000Z",
      body: "Episode transcript"
    });
  });
});

describe("parseBlogFeed", () => {
  it("normalizes blog items", () => {
    const [item] = parseBlogFeed({
      blogs: [
        {
          source: "Anthropic Engineering",
          title: "Engineering post",
          url: "https://www.anthropic.com/engineering/post",
          publishedAt: "2026-05-22T09:00:00.000Z",
          content: "Blog content"
        }
      ]
    });

    expect(item).toMatchObject({
      id: "blog:https://www.anthropic.com/engineering/post",
      source: "blog",
      title: "Anthropic Engineering: Engineering post",
      author: "Anthropic Engineering",
      url: "https://www.anthropic.com/engineering/post",
      createdAt: "2026-05-22T09:00:00.000Z",
      body: "Blog content"
    });
  });
});

describe("fetchEnabledFeeds", () => {
  it("isolates per-feed request failures", async () => {
    requestUrlMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(
        jsonResponse({
          podcasts: [
            {
              name: "Latent Space",
              title: "AI episode",
              url: "https://www.latent.space/p/ai-episode",
              publishedAt: "2026-05-23T12:00:00.000Z",
              transcript: "Episode transcript"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          blogs: [
            {
              source: "Anthropic Engineering",
              title: "Engineering post",
              url: "https://www.anthropic.com/engineering/post",
              publishedAt: "2026-05-22T09:00:00.000Z",
              content: "Blog content"
            }
          ]
        })
      );

    const result = await fetchEnabledFeeds({
      syncX: true,
      syncPodcasts: true,
      syncBlogs: true
    });

    expect(result.errors).toEqual(["X feed failed: network down"]);
    expect(result.items.map((item) => item.id)).toEqual([
      "podcast:https://www.latent.space/p/ai-episode",
      "blog:https://www.anthropic.com/engineering/post"
    ]);
  });

  it("reports invalid top-level feed shapes", async () => {
    requestUrlMock.mockResolvedValueOnce(jsonResponse({ notX: [] }));

    const result = await fetchEnabledFeeds({
      syncX: true,
      syncPodcasts: false,
      syncBlogs: false
    });

    expect(result).toEqual({
      items: [],
      errors: ["X feed failed: expected top-level x array"]
    });
  });

  it("preserves upstream feed errors as warnings", async () => {
    requestUrlMock.mockResolvedValueOnce(
      jsonResponse({
        errors: ["transcript fetch incomplete"],
        podcasts: [
          {
            name: "Latent Space",
            title: "AI episode",
            url: "https://www.latent.space/p/ai-episode",
            publishedAt: "2026-05-23T12:00:00.000Z",
            transcript: "Episode transcript"
          }
        ]
      })
    );

    const result = await fetchEnabledFeeds({
      syncX: false,
      syncPodcasts: true,
      syncBlogs: false
    });

    expect(result.errors).toEqual(["Podcast feed warning: transcript fetch incomplete"]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("podcast:https://www.latent.space/p/ai-episode");
  });

  it("returns partial success items with invalid shape errors", async () => {
    requestUrlMock
      .mockResolvedValueOnce(jsonResponse({ x: [] }))
      .mockResolvedValueOnce(jsonResponse({ podcasts: "not an array" }))
      .mockResolvedValueOnce(
        jsonResponse({
          blogs: [
            {
              source: "Anthropic Engineering",
              title: "Engineering post",
              url: "https://www.anthropic.com/engineering/post",
              publishedAt: "2026-05-22T09:00:00.000Z",
              content: "Blog content"
            }
          ]
        })
      );

    const result = await fetchEnabledFeeds({
      syncX: true,
      syncPodcasts: true,
      syncBlogs: true
    });

    expect(result.errors).toEqual(["Podcast feed failed: expected top-level podcasts array"]);
    expect(result.items.map((item) => item.id)).toEqual([
      "blog:https://www.anthropic.com/engineering/post"
    ]);
  });
});
