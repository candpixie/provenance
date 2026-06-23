"use client";

import { useCallback, useEffect, useState } from "react";
import type { Verdict } from "@/lib/engine/detect.js";
import type { Detection } from "@/lib/engine/types.js";

const EXAMPLES = ["framer.com", "webflow.com", "squarespace.com", "wordpress.org"];
const CATEGORY: Record<string, string> = {
  "ai-coding-agent": "AI coding agent",
  "ai-site-builder": "AI site builder",
  "no-code": "no-code builder",
  cms: "CMS",
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Chips({ title, items }: { title: string; items: Detection[] }) {
  if (!items.length) return null;
  return (
    <div className="section">
      <h3>{title}</h3>
      <div className="chips">
        {items.map((d) => (
          <span className="chip" key={d.id}>
            {d.name}
            <span className="n">{pct(d.confidence)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Result({ target, v }: { target: string; v: Verdict }) {
  const nameClass = v.kind === "named" ? "" : v.kind === "inferred" ? "inferred" : "none";
  return (
    <div className="card">
      <div className="target">{target}</div>
      <div className="label">{v.kind === "named" ? "built with" : "verdict"}</div>
      <div className="headline">
        <span className={`name ${nameClass}`}>{v.headline}</span>
        {v.maker && <span className="conf">{pct(v.maker.confidence)}</span>}
      </div>
      {v.maker ? (
        <>
          <div className="detail">{CATEGORY[v.maker.category] ?? v.maker.category}</div>
          <ul className="evidence">
            {v.maker.evidence.slice(0, 5).map((e, i) => (
              <li key={i}>
                {e.note} <code>{e.matched}</code>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="detail">{v.detail}</div>
      )}
      <Chips title="stack" items={v.stack} />
      <Chips title="host" items={v.hosts} />
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setVerdict(null);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setTarget(data.url);
      setVerdict(data.verdict);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Shareable links: /?url=example.com auto-runs.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("url");
    if (q) {
      setUrl(q);
      run(q);
    }
  }, [run]);

  return (
    <main className="wrap">
      <header className="hero">
        <div className="brand">
          <span className="mark" />
          <b>provenance</b>
        </div>
        <h1>Who built this site?</h1>
        <p className="sub">
          Paste a URL. Find out which AI agent or builder made it: Lovable, v0, Bolt, Framer, Webflow,
          Wix and more. It only names a builder when there&apos;s a definitive marker, so a wrong answer
          is rare by design.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(url);
          }}
        >
          <input
            type="text"
            inputMode="url"
            placeholder="example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? "reading…" : "detect"}
          </button>
        </form>

        <div className="examples">
          <span>try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setUrl(ex);
                run(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </header>

      <div className="result">
        {loading && <p className="loading">reading the page…</p>}
        {error && <p className="error">{error}</p>}
        {verdict && !loading && <Result target={target} v={verdict} />}
      </div>

      <footer>
        <span className="tagline">markers prove · stacks suggest</span>
        <a href="https://github.com/candpixie/provenance" target="_blank" rel="noreferrer">
          open source on GitHub →
        </a>
      </footer>
    </main>
  );
}
