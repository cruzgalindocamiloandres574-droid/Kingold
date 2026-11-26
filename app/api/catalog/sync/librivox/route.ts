import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron invokes scheduled routes with GET. Keep POST support for
// compatibility with other callers; both methods share the same authorization.
async function handleLibriVoxCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const destination = new URL("/api/catalog/sync?source=librivox", request.url);
    const upstream = await fetch(destination, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        accept: "application/json",
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(55_000),
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The LibriVox catalog sync could not reach the importer." },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleLibriVoxCron(request);
}

export async function POST(request: NextRequest) {
  return handleLibriVoxCron(request);
}
