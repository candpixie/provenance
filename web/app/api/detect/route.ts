import { NextResponse } from "next/server";
import { fetchPage } from "@/lib/engine/fetch.js";
import { verdict } from "@/lib/engine/detect.js";

export const runtime = "nodejs";
export const maxDuration = 20;

async function handle(rawUrl: string | null) {
  if (!rawUrl || !rawUrl.trim()) {
    return NextResponse.json({ error: "Provide a url." }, { status: 400 });
  }
  try {
    const page = await fetchPage(rawUrl.trim());
    const v = verdict(page);
    return NextResponse.json({ url: page.url, verdict: v });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't reach that site." },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(typeof body?.url === "string" ? body.url : null);
}

export async function GET(req: Request) {
  return handle(new URL(req.url).searchParams.get("url"));
}
