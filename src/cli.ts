#!/usr/bin/env -S npx tsx
import { fetchPage } from "./fetch.js";
import { verdict } from "./detect.js";
import type { Detection } from "./types.js";

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function line(d: Detection): string {
  return `${c.bold(d.name)} ${c.green(pct(d.confidence))} ${c.dim(`[${d.category}]`)}`;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: npm run detect -- <url>");
    process.exit(1);
  }

  console.error(c.dim(`fetching ${url} ...`));
  const page = await fetchPage(url);
  const v = verdict(page);

  console.log("");
  console.log(c.dim(`→ ${page.url}`));
  console.log("");

  if (v.maker) {
    console.log(`${c.bold(v.headline)} ${c.green(pct(v.maker.confidence))} ${c.dim(`[${v.maker.category}]`)}`);
    for (const e of v.maker.evidence.slice(0, 4)) {
      console.log(`  ${c.dim("·")} ${e.note} ${c.dim(`(${e.matched})`)}`);
    }
  } else {
    console.log(v.kind === "inferred" ? c.yellow(v.headline) : c.bold(v.headline));
    console.log(c.dim(v.detail));
  }

  if (v.makers.length > 1) {
    console.log("");
    console.log(c.dim("Other maker signals:"));
    for (const d of v.makers.slice(1)) console.log(`  ${line(d)}`);
  }

  if (v.stack.length) {
    console.log("");
    console.log(`${c.cyan("Stack:")} ${v.stack.map((d) => `${d.name} ${c.dim(pct(d.confidence))}`).join("  ")}`);
  }
  if (v.hosts.length) {
    console.log(`${c.cyan("Host:")}  ${v.hosts.map((d) => `${d.name} ${c.dim(pct(d.confidence))}`).join("  ")}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
