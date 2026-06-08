export const LOCAL_BLOG_LOOKBACK_HOURS = 72;
export const LOCAL_VIDEO_LOOKBACK_HOURS = 336;
export const LOCAL_MAX_ITEMS_PER_SOURCE = 5;

export type BlogScrapeKind = "anthropic-engineering" | "claude-blog" | "cursor-blog";

export interface BlogScrapeSource {
  name: string;
  indexUrl: string;
  kind: BlogScrapeKind;
}

export interface RssBlogSource {
  name: string;
  rssUrl: string;
  include?: (title: string, url: string) => boolean;
}

export interface YouTubeSource {
  name: string;
  channelUrl: string;
}

export interface AtomReleaseSource {
  name: string;
  atomUrl: string;
}

const CODEX_KEYWORDS =
  /\b(codex|coding agent|code interpreter|developer|engineering|software|agent|gpt-?5|computer use)\b/i;

export const LOCAL_BLOG_SCRAPE_SOURCES: BlogScrapeSource[] = [
  {
    name: "Anthropic Engineering",
    indexUrl: "https://www.anthropic.com/engineering",
    kind: "anthropic-engineering"
  },
  {
    name: "Claude Blog",
    indexUrl: "https://claude.com/blog",
    kind: "claude-blog"
  },
  {
    name: "Cursor Blog",
    indexUrl: "https://cursor.com/blog",
    kind: "cursor-blog"
  }
];

export const LOCAL_RSS_BLOG_SOURCES: RssBlogSource[] = [
  {
    name: "OpenAI Developers",
    rssUrl: "https://developers.openai.com/rss.xml"
  },
  {
    name: "OpenAI Codex",
    rssUrl: "https://openai.com/news/rss.xml",
    include: (title, url) => CODEX_KEYWORDS.test(`${title} ${url}`)
  }
];

export const LOCAL_YOUTUBE_SOURCES: YouTubeSource[] = [
  { name: "Cursor", channelUrl: "https://www.youtube.com/@cursor_ai" },
  { name: "OpenAI", channelUrl: "https://www.youtube.com/@OpenAI" }
];

export const LOCAL_RELEASE_SOURCES: AtomReleaseSource[] = [
  {
    name: "Cursor Releases",
    atomUrl: "https://github.com/cursor/cursor/releases.atom"
  },
  {
    name: "OpenCode Releases",
    atomUrl: "https://github.com/anomalyco/opencode/releases.atom"
  }
];
