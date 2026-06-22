# Provenance

**Detect which AI agent or builder made a website.** Paste a URL, get the maker
(Lovable, v0, Bolt, Framer, Webflow, Wix, Squarespace, WordPress, …), the stack,
the host, and the receipts that prove it.

Think "Wappalyzer / BuiltWith, but pointed at the AI-builder era."

## Why this exists

AI made it trivial to *generate* a website. It did not make it easy to tell
*who/what* generated one. Provenance is a forensic tool: given a page, what
fingerprints does it carry?

The companion question ("is this design any good / is it slop?") is a separate,
contested, taste problem. This tool deliberately does the **provable** half first.

## The one honest rule

There are two very different claims this tool can make, and it never blurs them:

1. **Named maker** — backed by a *definitive marker* that only that builder ships.
   Example: `cdn.gpteng.co/gptengineer.js` ⇒ Lovable. A `<meta generator>` tag ⇒
   Framer/Webflow/Wix/etc. These are provenance. High confidence.

2. **Inferred family** — a *stack cluster* with no explicit marker. Example:
   Next.js + shadcn/ui + Geist on Vercel. That's the v0/Lovable/Bolt house stack…
   but it's *also* exactly how Vercel hand-builds `vercel.com`. So stack alone can
   only say "likely an AI coding agent," never "built by X." The tool labels this
   `inferredAgent` and will not put a name on it.

If you remember one thing: **markers prove, stacks only suggest.**

## Usage

```bash
npm install
npm run detect -- framer.com        # detect a live URL
npm test                            # the engine is pure + fully unit-tested
```

## How it works

- `src/fingerprints.ts` — the signature database (one entry per maker/stack/host,
  each with weighted, evidence-bearing signals). Every signal is harvestable:
  generate a site with the builder, inspect the HTML/headers, add the signature.
- `src/detect.ts` — pure scoring engine. `detect()` returns ranked detections;
  `verdict()` collapses them into maker / inferred-family / stack / host.
- `src/fetch.ts` — static fetch (server-rendered HTML + headers).
- `src/cli.ts` — terminal runner.

## Known limits (v1)

- **Static fetch only.** Pure SPA shells (some Vite/React apps) hide their DOM
  behind JS. v2: headless render, or read the live DOM from a browser extension.
- **Coverage is the moat, and it's young.** ~18 fingerprints today. Real coverage
  comes from harvesting ground truth: generate N sites per builder, diff them.

## Roadmap

- [ ] Browser extension (reads the rendered DOM directly — best signal, no fetch)
- [ ] `/api/detect` route + minimal web UI (paste URL → verdict)
- [ ] Headless-render fallback for SPA shells
- [ ] Ground-truth harness: auto-generate sites per builder, auto-extract signatures
- [ ] (later) optional taste score as a downstream feature
