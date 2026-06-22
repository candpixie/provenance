import { verdict } from "../../src/detect.js";
import type { Verdict } from "../../src/detect.js";
import type { Detection } from "../../src/types.js";

declare const chrome: any;

const CATEGORY_LABELS: Record<string, string> = {
  "ai-coding-agent": "AI coding agent",
  "ai-site-builder": "AI site builder",
  "no-code": "no-code builder",
  cms: "CMS",
  framework: "framework",
  host: "host",
};

const out = document.getElementById("out")!;

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function chips(title: string, items: Detection[]): string {
  if (!items.length) return "";
  const inner = items
    .map((d) => `<span class="chip">${esc(d.name)}<span class="n">${pct(d.confidence)}</span></span>`)
    .join("");
  return `<div class="section"><h3>${title}</h3><div class="chips">${inner}</div></div>`;
}

function render(v: Verdict): void {
  let html = "";

  if (v.maker) {
    html += `<div class="verdict-label">built with</div>`;
    html += `<div class="maker"><span class="maker-name">${esc(v.maker.name)}</span>`;
    html += `<span class="conf">${pct(v.maker.confidence)}</span></div>`;
    html += `<div class="cat">${CATEGORY_LABELS[v.maker.category] ?? v.maker.category}</div>`;
    html += `<ul class="evidence">`;
    for (const e of v.maker.evidence.slice(0, 4)) {
      html += `<li>${esc(e.note)} <code>${esc(e.matched)}</code></li>`;
    }
    html += `</ul>`;
  } else if (v.inferredAgent) {
    html += `<div class="verdict-label">best guess</div>`;
    html += `<div class="maker"><span class="maker-name inferred">${esc(v.inferredAgent)}</span></div>`;
    html += `<p class="muted" style="margin-top:6px">No definitive maker marker found. Stack clusters can only suggest, never prove.</p>`;
  } else {
    html += `<div class="verdict-label">built with</div>`;
    html += `<div class="maker"><span class="maker-name none">no known builder fingerprint</span></div>`;
    html += `<p class="muted" style="margin-top:6px">Likely hand-built, or a builder we don't fingerprint yet.</p>`;
  }

  html += chips("stack", v.stack);
  html += chips("host", v.hosts);

  out.innerHTML = html;
}

async function run(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url ?? "")) {
      out.innerHTML = `<p class="muted loading">Open a website tab, then click Provenance.</p>`;
      return;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });
    render(verdict({ url: tab.url, html: result as string }));
  } catch (err) {
    out.innerHTML = `<p class="muted loading">Couldn't read this page (${esc(String(err))}).</p>`;
  }
}

run();
