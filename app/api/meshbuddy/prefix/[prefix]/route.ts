import { NextResponse } from "next/server";
import { checkPrefix, isValidPrefix, normalizePrefix } from "@/lib/meshbuddy";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ prefix: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { prefix } = await context.params;
  const normalized = normalizePrefix(prefix);

  if (!isValidPrefix(normalized)) {
    return NextResponse.json({ error: "Invalid prefix format." }, { status: 400 });
  }

  try {
    const result = await checkPrefix(normalized);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prefix check failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
