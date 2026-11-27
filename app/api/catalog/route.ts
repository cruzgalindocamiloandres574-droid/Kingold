import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 20;
const PRIVATE_CATALOG_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

async function catalogClient() {
  // Keep the request's Supabase session so database RLS can decide whether
  // this viewer may read premium catalogue records.
  return createClient();
}

export async function GET(request: NextRequest) {
  try {
    const requestedPage = Number(request.nextUrl.searchParams.get("page") || 1);
    const page = Number.isFinite(requestedPage)
      ? Math.max(1, Math.min(5000, Math.floor(requestedPage)))
      : 1;
    const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
    const searchTerms = q.replace(/[(),.%_*]/g, " ").trim().split(/\s+/).filter(Boolean);
    const genre = request.nextUrl.searchParams.get("genre");
    const year = request.nextUrl.searchParams.get("year");
    const language = request.nextUrl.searchParams.get("language");
    const audio = request.nextUrl.searchParams.get("audio");
    const playback = request.nextUrl.searchParams.get("playback");
    const type = request.nextUrl.searchParams.get("type");
    const featureOnly = request.nextUrl.searchParams.get("feature") === "1" && type === "movie";
    const allowedTypes = new Set(["movie","series","anime","manga","podcast","documentary","audiobook","concert","short"]);
    const db = await catalogClient();
    let query = db.from("movies")
      .select("id,title,synopsis,genre,release_year,duration,poster_url,backdrop_url,video_url,fallback_video_url,audio_url,reader_url,content_type,season_number,episode_number,season_count,episode_count,chapter_count,content_metadata,creator,license,credit,status,original_language,vote_average,popularity,runtime_minutes,release_date,audio_tracks,subtitle_tracks,audio_languages,has_latin_spanish,catalog_source,requires_premium", { count: "exact" })
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
    if (searchTerms.length) {
      // Turn punctuation and spaces into SQL LIKE wildcards so searches can
      // match titles whose stored punctuation differs from the user's query.
      const pattern = `%${searchTerms.join("%")}%`;
      query = query.or(`title.ilike.${pattern},synopsis.ilike.${pattern},genre.ilike.${pattern}`);
    }
    if (genre && genre !== "Todo") query = query.ilike("genre", `%${genre.replace(/[%_,]/g, " ")}%`);
    if (year && /^\d{4}$/.test(year)) query = query.eq("release_year", Number(year));
    if (language && /^[a-z]{2}$/.test(language)) query = query.eq("original_language", language);
    if (audio === "latin") query = query.eq("has_latin_spanish", true);
    if (audio === "spanish") query = query.overlaps("audio_languages", ["es", "es-ES", "es-419", "es-MX", "es-CO", "es-AR", "es-CL", "es-PE", "es-BO", "es-UY", "es-EC", "es-VE", "es-PY", "es-DO", "es-CR", "es-GT", "es-HN", "es-NI", "es-PA", "es-SV"]);
    if (playback === "internal") query = query.eq("status", "available").or("video_url.not.is.null,audio_url.not.is.null,audio_tracks->0->>url.not.is.null,content_metadata->>external_embed_url.not.is.null");
    if (playback === "external") query = query.eq("status", "available").is("video_url", null).is("audio_url", null).is("audio_tracks->0->>url", null).not("reader_url", "is", null).is("content_metadata->>external_embed_url", null);
    if (playback === "soon") query = query.contains("content_metadata", { catalog_availability: "upcoming" });
    if (playback === "pending") query = query.contains("content_metadata", { catalog_availability: "source_pending" });
    // Count the filtered result set independently so an out-of-range page can
    // return an empty list instead of requesting an impossible PostgREST range.
    let totalQuery = db.from("movies")
      .select("id", { count: "exact", head: true })
      .eq("published", true);
    if (type && allowedTypes.has(type)) totalQuery = totalQuery.eq("content_type", type);
    if (featureOnly) totalQuery = totalQuery.gte("runtime_minutes", 60);
    if (searchTerms.length) {
      const pattern = `%${searchTerms.join("%")}%`;
      totalQuery = totalQuery.or(`title.ilike.${pattern},synopsis.ilike.${pattern},genre.ilike.${pattern}`);
    }
    if (genre && genre !== "Todo") totalQuery = totalQuery.ilike("genre", `%${genre.replace(/[%_,]/g, " ")}%`);
    if (year && /^\d{4}$/.test(year)) totalQuery = totalQuery.eq("release_year", Number(year));
    if (language && /^[a-z]{2}$/.test(language)) totalQuery = totalQuery.eq("original_language", language);
    if (audio === "latin") totalQuery = totalQuery.eq("has_latin_spanish", true);
    if (audio === "spanish") totalQuery = totalQuery.overlaps("audio_languages", ["es", "es-ES", "es-419", "es-MX", "es-CO", "es-AR", "es-CL", "es-PE", "es-BO", "es-UY", "es-EC", "es-VE", "es-PY", "es-DO", "es-CR", "es-GT", "es-HN", "es-NI", "es-PA", "es-SV"]);
    if (playback === "internal") totalQuery = totalQuery.eq("status", "available").or("video_url.not.is.null,audio_url.not.is.null,audio_tracks->0->>url.not.is.null,content_metadata->>external_embed_url.not.is.null");
    if (playback === "external") totalQuery = totalQuery.eq("status", "available").is("video_url", null).is("audio_url", null).is("audio_tracks->0->>url", null).not("reader_url", "is", null).is("content_metadata->>external_embed_url", null);
    if (playback === "soon") totalQuery = totalQuery.contains("content_metadata", { catalog_availability: "upcoming" });
    if (playback === "pending") totalQuery = totalQuery.contains("content_metadata", { catalog_availability: "source_pending" });

    // Summary counts follow the selected format and are filtered by the same RLS
    // entitlement as results, so anonymous viewers cannot infer premium inventory.
    const countByStatus = (status: "available" | "soon") => {
      let countQuery = db.from("movies")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .eq("status", status);
      if (type && allowedTypes.has(type)) countQuery = countQuery.eq("content_type", type);
      return countQuery;
    };
    const [pageResult, totalResult, availableResult, internalResult, embedResult, externalResult, upcomingResult, pendingResult] = await Promise.all([
      query,
      totalQuery,
      countByStatus("available")
        .or("video_url.not.is.null,audio_url.not.is.null,audio_tracks->0->>url.not.is.null,reader_url.not.is.null"),
      countByStatus("available")
        .or("video_url.not.is.null,audio_url.not.is.null,audio_tracks->0->>url.not.is.null"),
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
    if (totalResult.error) throw totalResult.error;
    const total = totalResult.count || 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (pageResult.error && page <= totalPages) throw pageResult.error;
    if (availableResult.error) throw availableResult.error;
    if (internalResult.error) throw internalResult.error;
    if (embedResult.error) throw embedResult.error;
    if (externalResult.error) throw externalResult.error;
    if (upcomingResult.error) throw upcomingResult.error;
    if (pendingResult.error) throw pendingResult.error;
    return NextResponse.json({
      results: page > totalPages ? [] : pageResult.data || [],
      total,
      availableTotal: availableResult.count || 0,
      internalTotal: (internalResult.count || 0) + (embedResult.count || 0),
      externalTotal: externalResult.count || 0,
      upcomingTotal: upcomingResult.count || 0,
      pendingTotal: pendingResult.count || 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
    }, { headers: PRIVATE_CATALOG_HEADERS });
  } catch (error) {
    console.error("Catalog API error", error);
    return NextResponse.json(
      { error: "No se pudo cargar el catálogo" },
      { status: 500, headers: PRIVATE_CATALOG_HEADERS },
    );
  }
}
