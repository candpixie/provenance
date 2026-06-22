import { FINGERPRINTS } from "./fingerprints.js";
import type { Category, Detection, Evidence, PageInput, Signal } from "./types.js";

// Try to match one signal against the page. Returns the matched text (receipt)
// or null. Pure and deterministic — same input always yields the same output.
function matchSignal(sig: Signal, page: PageInput): string | null {
  const html = page.html ?? "";
  const headers = page.headers ?? {};

  if (sig.type === "header") {
    const idx = sig.pattern.indexOf(":");
    const name = (idx === -1 ? sig.pattern : sig.pattern.slice(0, idx)).toLowerCase();
    const valuePattern = idx === -1 ? "" : sig.pattern.slice(idx + 1);
    const value = headers[name];
    if (value == null) return null;
    if (!valuePattern) return `${name}: ${value}`;
    return new RegExp(valuePattern, "i").test(value) ? `${name}: ${value}` : null;
  }

  if (sig.type === "metaGenerator") {
    const re = new RegExp(
      `<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*${sig.pattern}[^"']*)["']`,
      "i",
    );
    const m = html.match(re);
    return m ? m[1] : null;
  }

  // html / script / asset / attr all reduce to a regex over the raw HTML.
  const m = html.match(new RegExp(sig.pattern, "i"));
  return m ? truncate(m[0]) : null;
}

function truncate(s: string, n = 140): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n) + "…" : clean;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Run every fingerprint against the page and return scored detections, highest first.
export function detect(page: PageInput): Detection[] {
  const out: Detection[] = [];
  for (const fp of FINGERPRINTS) {
    const evidence: Evidence[] = [];
    let score = 0;
    for (const sig of fp.signals) {
      const matched = matchSignal(sig, page);
      if (matched !== null) {
        score += sig.weight;
        evidence.push({ note: sig.note, weight: sig.weight, matched });
      }
    }
    if (score > 0) {
      out.push({
        id: fp.id,
        name: fp.name,
        category: fp.category,
        score: round(score),
        confidence: Math.min(1, round(score)),
        evidence: evidence.sort((a, b) => b.weight - a.weight),
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

const MAKER_CATEGORIES: Category[] = ["ai-coding-agent", "ai-site-builder", "no-code", "cms"];

// A maker needs real evidence, not one stray asset path, before we name it.
// Anything weaker is noise (e.g. a blog link exposing /wp-json on a Framer site).
const MAKER_CONFIDENCE_FLOOR = 0.5;

export interface Verdict {
  maker: Detection | null; // best guess at who built it
  inferredAgent: string | null; // heuristic when no explicit maker marker exists
  makers: Detection[];
  weakMakerSignals: Detection[]; // matched, but below the naming threshold
  stack: Detection[]; // framework-level context
  hosts: Detection[];
  all: Detection[];
}

// Turn raw detections into a single human-facing verdict.
export function verdict(page: PageInput): Verdict {
  const all = detect(page);
  const makerHits = all.filter((d) => MAKER_CATEGORIES.includes(d.category));
  const makers = makerHits.filter((d) => d.confidence >= MAKER_CONFIDENCE_FLOOR);
  const weakMakerSignals = makerHits.filter((d) => d.confidence < MAKER_CONFIDENCE_FLOOR);
  const stack = all.filter((d) => d.category === "framework");
  const hosts = all.filter((d) => d.category === "host");

  // Heuristic: a Next + shadcn (+ Geist) (+ Vercel) cluster with no explicit
  // maker marker is the signature of the v0/Lovable/Bolt family.
  const has = (id: string) => all.some((d) => d.id === id);
  let inferredAgent: string | null = null;
  if (makers.length === 0 && has("shadcn") && (has("nextjs") || has("vite-react"))) {
    if (has("geist") || has("vercel")) {
      inferredAgent = "likely an AI coding agent (Next + shadcn + Geist/Vercel cluster — v0 / Lovable / Bolt family)";
    } else {
      inferredAgent = "possibly an AI coding agent (shadcn + React stack, no explicit marker)";
    }
  }

  return { maker: makers[0] ?? null, inferredAgent, makers, weakMakerSignals, stack, hosts, all };
}
