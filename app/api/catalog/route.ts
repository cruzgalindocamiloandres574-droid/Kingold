import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 20;

function catalogClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public credentials are not configured");
  // Read-only public catalogue requests are protected by the published-movies RLS policy.
  // Privileged catalogue imports continue to use server-only credentials in their own route.
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Math.min(5000, Number(request.nextUrl.searchParams.get("page") || 1)));
    const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
    const genre = request.nextUrl.searchParams.get("genre");
    const year = request.nextUrl.searchParams.get("year");
    const language = request.nextUrl.searchParams.get("language");
    const audio = request.nextUrl.searchParams.get("audio");
    const playback = request.nextUrl.searchParams.get("playback");
    const type = request.nextUrl.searchParams.get("type");
    const featureOnly = request.nextUrl.searchParams.get("feature") === "1" && type === "movie";
    const allowedTypes = new Set(["movie","series","anime","manga","podcast","documentary","audiobook","concert","short"]);
    const db = catalogClient();
    let query = db.from("movies")
      .select("id,title,synopsis,genre,release_year,duration,poster_url,backdrop_url,video_url,fallback_video_url,audio_url,reader_url,content_type,season_number,episode_number,season_count,episode_count,chapter_count,content_metadata,creator,license,credit,status,original_language,vote_average,popularity,runtime_minutes,release_date,audio_tracks,subtitle_tracks,audio_languages,has_latin_spanish,catalog_source", { count: "exact" })
      .eq("published", true);
    // Series episodes must follow season and episode numbering, not popularity.
    if (type === "series" || type === "anime") {
      query = query
        .order("status", { ascending: true })
        // Keep each show's episodes together before sorting seasons and episode numbers.
        .order("title", { ascending: true })
        .order("season_number", { ascending: true, nullsFirst: false })
        .order("episode_number", { ascending: true, nullsFirst: false })
        .order("popularity", { ascending: false, nullsFirst: false });
    } else {
      query = query
        // Put genuinely playable titles before metadata-only records in the public catalogue.
        .order("status", { ascending: true })
        .order("popularity", { ascending: false, nullsFirst: false })
        .order("release_year", { ascending: false });
    }
    // Stable unique tie-breaker prevents records from moving between pages
    // when status, popularity, and release year are identical.
    query = query.order("id", { ascending: true });
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (type && allowedTypes.has(type)) query = query.eq("content_type", type);
    if (featureOnly) query = query.gte("runtime_minutes", 60);
    if (q) {
      // Turn punctuation and spaces into SQL LIKE wildcards so searches can
      // match titles whose stored punctuation differs from the user's query.
      const terms = q.replace(/[(),.%_*]/g, " ").trim().split(/\s+/).filter(Boolean);
      if (terms.length) {
        const pattern = `%${terms.join("%")}%`;
        query = query.or(`title.ilike.${pattern},synopsis.ilike.${pattern},genre.ilike.${pattern}`);
      }
    }
    if (genre && genre !== "Todo") query = query.ilike("genre", `%${genre.replace(/[%_,]/g, " ")}%`);
    if (year && /^\d{4}$/.test(year)) query = query.eq("release_year", Number(year));
    if (language && /^[a-z]{2}$/.test(language)) query = query.eq("original_language", language);
    if (audio === "latin") query = query.eq("has_latin_spanish", true);
    if (audio === "spanish") query = query.overlaps("audio_languages", ["es", "es-ES", "es-419", "es-MX", "es-CO", "es-AR", "es-CL", "es-PE", "es-BO", "es-UY", "es-EC", "es-VE", "es-PY", "es-DO", "es-CR", "es-GT", "es-HN", "es-NI", "es-PA", "es-SV"]);
    if (playback === "internal") query = query.eq("status", "available").or("video_url.not.is.null,audio_url.not.is.null,content_metadata->>external_embed_url.not.is.null");
    if (playback === "external") query = query.eq("status", "available").is("video_url", null).is("audio_url", null).not("reader_url", "is", null).is("content_metadata->>external_embed_url", null);
    if (playback === "soon") query = query.contains("content_metadata", { catalog_availability: "upcoming" });
    if (playback === "pending") query = query.contains("content_metadata", { catalog_availability: "source_pending" });
    // Summary counts follow the selected format. Without a type filter they
    // remain global across the complete NOIR VAULT library.
    const countByStatus = (status: "available" | "soon") => {
      let countQuery = db.from("movies")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .eq("status", status);
      if (type && allowedTypes.has(type)) countQuery = countQuery.eq("content_type", type);
      return countQuery;
    };
    const [pageResult, availableResult, internalResult, embedResult, externalResult, upcomingResult, pendingResult] = await Promise.all([
      query,
      countByStatus("available")
        .or("video_url.not.is.null,audio_url.not.is.null,reader_url.not.is.null"),
      countByStatus("available")
        .or("video_url.not.is.null,audio_url.not.is.null"),
      countByStatus("available")
        .is("video_url", null)
        .is("audio_url", null)
        .not("content_metadata->external_embed_url", "is", null),
      countByStatus("available")
        .is("video_url", null)
        .is("audio_url", null)
        .not("reader_url", "is", null)
        .is("content_metadata->>external_embed_url", null),
      countByStatus("soon")
        .contains("content_metadata", { catalog_availability: "upcoming" }),
      countByStatus("soon")
        .contains("content_metadata", { catalog_availability: "source_pending" }),
    ]);
    if (pageResult.error) throw pageResult.error;
    if (availableResult.error) throw availableResult.error;
    if (internalResult.error) throw internalResult.error;
    if (embedResult.error) throw embedResult.error;
    if (externalResult.error) throw externalResult.error;
    if (upcomingResult.error) throw upcomingResult.error;
    if (pendingResult.error) throw pendingResult.error;
    const total = pageResult.count || 0;
    return NextResponse.json({
      results: pageResult.data || [],
      total,
      availableTotal: availableResult.count || 0,
      internalTotal: (internalResult.count || 0) + (embedResult.count || 0),
      externalTotal: externalResult.count || 0,
      upcomingTotal: upcomingResult.count || 0,
      pendingTotal: pendingResult.count || 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("Catalog API error", error);
    return NextResponse.json({ error: "No se pudo cargar el catálogo" }, { status: 500 });
  }
}
