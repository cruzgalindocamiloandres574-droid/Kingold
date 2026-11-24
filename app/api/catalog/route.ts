import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 20;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Math.min(5000, Number(request.nextUrl.searchParams.get("page") || 1)));
    const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
    const genre = request.nextUrl.searchParams.get("genre");
    const year = request.nextUrl.searchParams.get("year");
    const language = request.nextUrl.searchParams.get("language");
    const db = adminClient();
    let query = db.from("movies")
      .select("id,title,synopsis,genre,release_year,duration,poster_url,backdrop_url,video_url,fallback_video_url,creator,license,credit,status,original_language,vote_average,popularity,runtime_minutes,release_date", { count: "exact" })
      .eq("published", true)
      .order("popularity", { ascending: false, nullsFirst: false })
      .order("release_year", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (q) { const term = q.replace(/[(),.%_*]/g, " ").replace(/\s+/g, " ").trim(); query = query.or(`title.ilike.%${term}%,synopsis.ilike.%${term}%,genre.ilike.%${term}%`); }
    if (genre && genre !== "Todo") query = query.ilike("genre", `%${genre.replace(/[%_,]/g, " ")}%`);
    if (year && /^\d{4}$/.test(year)) query = query.eq("release_year", Number(year));
    if (language && /^[a-z]{2}$/.test(language)) query = query.eq("original_language", language);
    const { data, count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ results: data || [], total: count || 0, page, pageSize: PAGE_SIZE, totalPages: Math.ceil((count || 0) / PAGE_SIZE) });
  } catch (error) {
    console.error("Catalog API error", error);
    return NextResponse.json({ error: "No se pudo cargar el catálogo" }, { status: 500 });
  }
}
