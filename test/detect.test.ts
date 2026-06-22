import { describe, expect, it } from "vitest";
import { detect, verdict } from "../src/detect.js";
import type { PageInput } from "../src/types.js";

// Fixtures are trimmed but use the real signatures each builder ships.
const LOVABLE: PageInput = {
  url: "https://my-app.lovableproject.com",
  html: `<!doctype html><html><head><title>x</title></head>
    <body><div id="root"></div>
    <script type="module" src="https://cdn.gpteng.co/gptengineer.js"></script>
    <script type="module" src="/assets/index-A1b2C3.js"></script></body></html>`,
  headers: { server: "cloudflare" },
};

const FRAMER: PageInput = {
  html: `<!doctype html><html><head>
    <meta name="generator" content="Framer 0d1c2b3"/>
    <link rel="preload" href="https://framerusercontent.com/images/abc.png"/>
    </head><body><div class="framer-AbCdE"></div>
    <script src="https://events.framer.com/script"></script></body></html>`,
  headers: {},
};

const WEBFLOW: PageInput = {
  html: `<!doctype html><html data-wf-page="123" data-wf-site="456">
    <head><meta content="Webflow" name="generator"/></head>
    <body><div class="w-nav"></div>
    <img src="https://assets.website-files.com/x.png"/></body></html>`,
  headers: {},
};

const WIX: PageInput = {
  html: `<html><head><meta name="generator" content="Wix.com Website Builder"/>
    <img src="https://static.wixstatic.com/media/x.jpg"/></head><body></body></html>`,
  headers: { "x-wix-request-id": "abc123" },
};

const V0_INFERRED: PageInput = {
  url: "https://something.vercel.app",
  html: `<!doctype html><html><head><style>.__geist{}</style></head>
    <body><div id="__next"></div>
    <button class="bg-background text-foreground" data-[state=open]></button>
    <script src="/_next/static/chunks/main.js"></script></body></html>`,
  headers: { server: "Vercel", "x-vercel-id": "iad1::abc" },
};

describe("detect", () => {
  it("flags Lovable on the gptengineer.js runtime", () => {
    const v = verdict(LOVABLE);
    expect(v.maker?.id).toBe("lovable");
    expect(v.maker!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(v.maker!.evidence[0].matched).toContain("gptengineer.js");
  });

  it("identifies Framer via generator + framerusercontent", () => {
    expect(verdict(FRAMER).maker?.id).toBe("framer");
  });

  it("identifies Webflow via generator + data-wf attributes", () => {
    const v = verdict(WEBFLOW);
    expect(v.maker?.id).toBe("webflow");
    expect(v.maker!.evidence.some((e) => /data-wf/.test(e.matched))).toBe(true);
  });

  it("identifies Wix including the X-Wix header", () => {
    const v = verdict(WIX);
    expect(v.maker?.id).toBe("wix");
    expect(v.maker!.evidence.some((e) => e.matched.includes("x-wix-request-id"))).toBe(true);
  });

  it("infers the AI-coding-agent family from the Next+shadcn+Geist+Vercel cluster", () => {
    const v = verdict(V0_INFERRED);
    expect(v.maker).toBeNull();
    expect(v.inferredAgent).toMatch(/AI coding agent/);
    expect(v.hosts.some((d) => d.id === "vercel")).toBe(true);
    expect(v.stack.some((d) => d.id === "nextjs")).toBe(true);
  });

  it("returns nothing for a plain hand-written page", () => {
    const plain: PageInput = {
      html: `<!doctype html><html><head><title>hi</title></head><body><h1>hello</h1></body></html>`,
      headers: {},
    };
    const v = verdict(plain);
    expect(v.maker).toBeNull();
    expect(v.inferredAgent).toBeNull();
  });

  it("is deterministic", () => {
    expect(detect(FRAMER)).toEqual(detect(FRAMER));
  });
});

// The credibility suite: pages that LOOK like a builder but aren't.
// A false "Built with X" is worse than admitting we don't know.
describe("no false positives", () => {
  it("does not flag a tutorial that quotes gptengineer.js in a code block", () => {
    const blog: PageInput = {
      url: "https://myblog.dev/how-lovable-works",
      html: `<!doctype html><html><head><meta name="generator" content="Hugo 0.1"/></head>
        <body><article><h1>How Lovable works</h1>
        <p>It injects a script tag:</p>
        <pre><code>&lt;script src="https://cdn.gpteng.co/gptengineer.js"&gt;&lt;/script&gt;</code></pre>
        <p>and you can host it on lovableproject.com.</p>
        </article></body></html>`,
      headers: {},
    };
    const v = verdict(blog);
    expect(v.maker).toBeNull();
    expect(v.makers.find((d) => d.id === "lovable")).toBeUndefined();
  });

  it("does not flag a site that merely links to bolt.new / carrd.co", () => {
    const linker: PageInput = {
      url: "https://example.com",
      html: `<html><body>
        <a href="https://bolt.new">try bolt</a>
        <a href="https://mysite.carrd.co">my other site</a>
        <p>I love framer and squarespace for design.</p>
        </body></html>`,
      headers: {},
    };
    const v = verdict(linker);
    expect(v.maker).toBeNull();
  });

  it("does not name a maker from weak signals alone (no definitive marker)", () => {
    // Webflow w- class + asset CDN but NO generator and NO data-wf attribute.
    const partial: PageInput = {
      url: "https://example.com",
      html: `<html><body><div class="nav w-nav"></div>
        <img src="https://assets.website-files.com/x.png"/></body></html>`,
      headers: {},
    };
    const v = verdict(partial);
    expect(v.maker).toBeNull();
    expect(v.weakMakerSignals.some((d) => d.id === "webflow")).toBe(true);
  });

  it("only names a deployment-domain maker when the PAGE is served from it", () => {
    const served: PageInput = { url: "https://app.lovableproject.com/", html: "<html></html>", headers: {} };
    const merelyLinks: PageInput = {
      url: "https://example.com",
      html: `<a href="https://x.lovableproject.com">x</a>`,
      headers: {},
    };
    expect(verdict(served).maker?.id).toBe("lovable");
    expect(verdict(merelyLinks).maker).toBeNull();
  });
});
