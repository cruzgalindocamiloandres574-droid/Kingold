import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;
export const maxDuration = 20;

const SINTEL_SPANISH_SRT =
  "https://commons.wikimedia.org/wiki/TimedText:Sintel_movie_-_Blender_Fondation.ogv.es.srt?action=raw";

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
    const response = await fetch(SINTEL_SPANISH_SRT, {
      headers: { "User-Agent": "NOIR-VAULT/7.0 subtitle format adapter; Wikimedia Commons attribution preserved" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return new NextResponse("Wikimedia Commons subtitles are temporarily unavailable.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const source = await response.text();
    if (source.length > 1_000_000) {
      return new NextResponse("Subtitle source exceeds the supported size.", {
        status: 413,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const vtt = srtToVtt(source);
    const cueEnds = [...vtt.matchAll(/\\d{2}:(\\d{2}):(\\d{2})\\.(\\d{3})\\s+$/gm)];
    const lastCue = cueEnds[cueEnds.length - 1];
    const lastCueSeconds = lastCue
      ? Number(lastCue[1]) * 60 + Number(lastCue[2]) + Number(lastCue[3]) / 1000
      : 0;
    // The Commons Spanish track currently stops at 10:29 although the film is 14:48.
    // Never publish a partial track as complete subtitles.
    if (lastCueSeconds < 888 * 0.9) {
      return new NextResponse("The available Spanish subtitle file is incomplete and is not enabled for playback.", {
        status: 422,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return new NextResponse(vtt, {
      headers: {
        "content-type": "text/vtt; charset=utf-8",
        "content-disposition": 'inline; filename="sintel-es.vtt"',
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Sintel subtitle adapter failed:", error);
    return new NextResponse("Could not load the Spanish subtitles for Sintel.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
