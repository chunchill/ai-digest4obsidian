import { requestUrl } from "obsidian";

export const RSS_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function fetchText(url: string): Promise<string> {
  const response = await requestUrl({
    url,
    method: "GET",
    headers: {
      "User-Agent": RSS_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  return response.text;
}
