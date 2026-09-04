import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Called by a GitHub Actions step in the louisianameshcommunity.github.io
// repo on every push, so mkdocs nav/content changes reach this site within
// seconds instead of waiting out the hourly ISR fallback.
function isAuthorized(request: Request): boolean {
  const secret = process.env.DOCS_REVALIDATE_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("x-revalidate-secret") ?? "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("docs", "max");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
