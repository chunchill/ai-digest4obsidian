import type { BlogScrapeKind } from "./local-sources";
import { parseFeedDate } from "./slug";

export interface ScrapedArticleCandidate {
  title: string;
  url: string;
  publishedAt: string | null;
  description: string;
}

export interface ScrapedArticleContent {
  title: string;
  author: string;
  publishedAt: string | null;
  content: string;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readNextDataPosts(html: string): ScrapedArticleCandidate[] {
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!nextDataMatch) {
    return [];
  }

  try {
    const data = JSON.parse(nextDataMatch[1]) as {
      props?: { pageProps?: Record<string, unknown> };
    };
    const pageProps = data.props?.pageProps ?? {};
    const posts = (pageProps.posts ?? pageProps.articles ?? pageProps.entries ?? []) as Array<
      Record<string, unknown>
    >;

    return posts.flatMap((post) => {
      const slug = (post.slug as { current?: string } | string | undefined) ?? "";
      const slugValue = typeof slug === "string" ? slug : slug.current ?? "";
      if (!slugValue) {
        return [];
      }

      return [
        {
          title: String(post.title ?? "Untitled"),
          url: `https://www.anthropic.com/engineering/${slugValue}`,
          publishedAt:
            (post.publishedOn as string | undefined) ??
            (post.publishedAt as string | undefined) ??
            (post.date as string | undefined) ??
            null,
          description: String(post.summary ?? post.description ?? "")
        }
      ];
    });
  } catch {
    return [];
  }
}

export function parseAnthropicEngineeringIndex(html: string): ScrapedArticleCandidate[] {
  const fromNextData = readNextDataPosts(html);
  if (fromNextData.length > 0) {
    return fromNextData;
  }

  const articles: ScrapedArticleCandidate[] = [];
  const linkRegex = /href="\/engineering\/([a-z0-9-]+)"/gi;
  const seenSlugs = new Set<string>();
  let linkMatch;

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const slug = linkMatch[1];
    if (seenSlugs.has(slug)) {
      continue;
    }

    seenSlugs.add(slug);
    articles.push({
      title: "",
      url: `https://www.anthropic.com/engineering/${slug}`,
      publishedAt: null,
      description: ""
    });
  }

  return articles;
}

function parseSlugIndex(
  html: string,
  pattern: RegExp,
  buildUrl: (slug: string) => string
): ScrapedArticleCandidate[] {
  const articles: ScrapedArticleCandidate[] = [];
  const seenSlugs = new Set<string>();
  let linkMatch;

  while ((linkMatch = pattern.exec(html)) !== null) {
    const slug = linkMatch[1];
    if (seenSlugs.has(slug) || slug.startsWith("topic/")) {
      continue;
    }

    seenSlugs.add(slug);
    articles.push({
      title: "",
      url: buildUrl(slug),
      publishedAt: null,
      description: ""
    });
  }

  return articles;
}

export function parseClaudeBlogIndex(html: string): ScrapedArticleCandidate[] {
  return parseSlugIndex(html, /href="\/blog\/([a-z0-9-]+)"/gi, (slug) => `https://claude.com/blog/${slug}`);
}

export function parseCursorBlogIndex(html: string): ScrapedArticleCandidate[] {
  return parseSlugIndex(html, /href="\/blog\/([a-z0-9-]+)"/gi, (slug) => `https://cursor.com/blog/${slug}`);
}

export function parseBlogIndex(kind: BlogScrapeKind, html: string): ScrapedArticleCandidate[] {
  if (kind === "anthropic-engineering") {
    return parseAnthropicEngineeringIndex(html);
  }
  if (kind === "claude-blog") {
    return parseClaudeBlogIndex(html);
  }
  return parseCursorBlogIndex(html);
}

export function extractAnthropicArticleContent(html: string): ScrapedArticleContent {
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]) as {
        props?: { pageProps?: Record<string, unknown> };
      };
      const pageProps = data.props?.pageProps ?? {};
      const post = (pageProps.post ?? pageProps.article ?? pageProps.entry ?? pageProps) as Record<
        string,
        unknown
      >;
      const body = (post.body ?? post.content ?? []) as Array<Record<string, unknown>>;
      const textParts: string[] = [];

      if (Array.isArray(body)) {
        for (const block of body) {
          if (block._type === "block" && Array.isArray(block.children)) {
            const text = block.children
              .map((child) => String((child as { text?: string }).text ?? ""))
              .join("");
            if (text.trim()) {
              textParts.push(text.trim());
            }
          }
        }
      }

      const content = textParts.join("\n\n");
      if (content) {
        return {
          title: String(post.title ?? ""),
          author: String((post.author as { name?: string } | undefined)?.name ?? ""),
          publishedAt:
            (post.publishedOn as string | undefined) ??
            (post.publishedAt as string | undefined) ??
            (post.date as string | undefined) ??
            null,
          content
        };
      }
    } catch {
      // fall through
    }
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const title = h1Match ? stripHtml(h1Match[1]) : "";
  const content = stripHtml(articleMatch ? articleMatch[1] : html).slice(0, 4000);

  return { title, author: "", publishedAt: null, content };
}

export function extractClaudeBlogArticleContent(html: string): ScrapedArticleContent {
  let title = "";
  let author = "";
  let publishedAt: string | null = null;
  let content = "";

  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;

  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]) as {
        "@type"?: string;
        headline?: string;
        name?: string;
        author?: { name?: string };
        datePublished?: string;
      };
      if (ld["@type"] === "BlogPosting" || ld["@type"] === "Article") {
        title = ld.headline ?? ld.name ?? title;
        author = ld.author?.name ?? author;
        publishedAt = ld.datePublished ?? publishedAt;
        break;
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }

  const richTextMatch =
    html.match(/<div[^>]*class="[^"]*u-rich-text-blog[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    html.match(/<div[^>]*class="[^"]*w-richtext[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (richTextMatch) {
    content = stripHtml(richTextMatch[1]).slice(0, 4000);
  }

  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    title = h1Match ? stripHtml(h1Match[1]) : title;
  }

  if (!content) {
    content = title;
  }

  return { title, author, publishedAt, content };
}

export function extractCursorBlogArticleContent(html: string): ScrapedArticleContent {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const title = h1Match ? stripHtml(h1Match[1]) : "";
  const content = stripHtml(articleMatch ? articleMatch[1] : html).slice(0, 4000);

  return { title, author: "", publishedAt: null, content };
}

export function extractArticleContent(kind: BlogScrapeKind, html: string): ScrapedArticleContent {
  if (kind === "anthropic-engineering") {
    return extractAnthropicArticleContent(html);
  }
  if (kind === "claude-blog") {
    return extractClaudeBlogArticleContent(html);
  }
  return extractCursorBlogArticleContent(html);
}

export function normalizeArticleDate(
  publishedAt: string | null,
  fallback: Date,
  estimated = false
): { createdAt: string; dateEstimated: boolean } {
  if (publishedAt) {
    return { createdAt: parseFeedDate(publishedAt, fallback), dateEstimated: false };
  }

  return { createdAt: fallback.toISOString(), dateEstimated: estimated };
}
