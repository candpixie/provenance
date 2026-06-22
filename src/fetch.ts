import type { PageInput } from "./types.js";

// Fetch a URL and normalize it into PageInput. Static fetch only: this sees the
// server-rendered HTML + headers, which catches most no-code builders and any
// SSR'd app. Pure SPA shells (some Vite/React apps) may need a headless browser
// or the browser-extension path to read the rendered DOM — that's a v2 upgrade.
export async function fetchPage(url: string): Promise<PageInput> {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const res = await fetch(normalized, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 provenance-bot/0.1",
    },
  });
  const html = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return { url: res.url || normalized, html, headers };
}
