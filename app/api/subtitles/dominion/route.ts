import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;
export const maxDuration = 20;

const DOMINION_LATAM_SRT =
  "https://www.dominionmovement.com/downloads/subtitles/Dominion.Spanish_LatinAmerica.srt";

function srtToVtt(source: string) {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error("The official subtitle file is empty.");

  const cues = normalized.split(/\n\s*\n+/);
  const converted: string[] = [];

  for (const cue of cues) {
    const lines = cue.split("\n").map((line) => line.trimEnd());
    const timingIndex = lines.findIndex((line) =>
      /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line.trim())
    );
    if (timingIndex < 0) continue;

    const timing = lines[timingIndex]
      .trim()
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    const text = lines.slice(timingIndex + 1).join("\n").trim();
    if (!text) continue;
    converted.push(timing + "\n" + text);
  }

  if (!converted.length) throw new Error("The official subtitle file has no valid cues.");
  return "WEBVTT\n\n" + converted.join("\n\n") + "\n";
}

export async function GET() {
  try {
    const response = await fetch(DOMINION_LATAM_SRT, {
      headers: { "User-Agent": "NOIR-VAULT/7.0 subtitle format adapter; official source attribution preserved" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return new NextResponse("Official subtitles are temporarily unavailable.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const source = await response.text();
    if (source.length > 4_000_000) {
      return new NextResponse("Subtitle source exceeds the supported size.", {
        status: 413,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const vtt = srtToVtt(source);
    return new NextResponse(vtt, {
      headers: {
        "content-type": "text/vtt; charset=utf-8",
        "content-disposition": 'inline; filename="dominion-es-419.vtt"',
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Dominion subtitle adapter failed:", error);
    return new NextResponse("Could not load the official Latin American Spanish subtitles.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
