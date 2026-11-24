import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const TMDB = "https://api.themoviedb.org/3";
const PAGE_BATCH = 15;

type TmdbMovie = {
  id: number; title?: string; overview?: string; genre_ids?: number[];
  release_date?: string; poster_path?: string | null; backdrop_path?: string | null;
  original_language?: string; vote_average?: number; popularity?: number;
  runtime?: number;
};

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) {
    return NextResponse.json({ error: "Faltan TMDB_API_READ_ACCESS_TOKEN o credenciales privadas de Supabase" }, { status: 503 });
  }

  try {
    const requestedPage = Number(new URL(request.url).searchParams.get("page") || 1);
    const start = Math.max(1, Math.min(500, requestedPage));
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const headers = { Authorization: `Bearer ${token}`, accept: "application/json" };
    const genreResponse = await fetch(`${TMDB}/genre/movie/list?language=es-ES`, { headers, cache: "no-store" });
    if (!genreResponse.ok) throw new Error(`TMDB genres: ${genreResponse.status}`);
    const genreJson = await genreResponse.json();
    const genres = new Map<number, string>((genreJson.genres || []).map((g: {id:number;name:string}) => [g.id, g.name]));
    let imported = 0;
    let lastPage = start - 1;
    let totalPages = 0;

    for (let page = start; page < start + PAGE_BATCH && page <= 500; page++) {
      const response = await fetch(`${TMDB}/discover/movie?include_adult=false&include_video=false&language=es-ES&page=${page}&region=CO&sort_by=popularity.desc`, { headers, cache: "no-store" });
      if (!response.ok) throw new Error(`TMDB page ${page}: ${response.status}`);
      const json = await response.json();
      totalPages = Math.min(500, json.total_pages || 0);
      const rows = (json.results as TmdbMovie[] || []).map((movie) => ({
        tmdb_id: movie.id,
        title: movie.title || "Sin título",
        synopsis: movie.overview || null,
        genre: (movie.genre_ids || []).map((id) => genres.get(id)).filter(Boolean).join(", ") || "Sin clasificar",
        release_year: movie.release_date ? Number(movie.release_date.slice(0,4)) || null : null,
        release_date: movie.release_date || null,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
        original_language: movie.original_language || null,
        vote_average: Number.isFinite(movie.vote_average) ? movie.vote_average : null,
        popularity: Number.isFinite(movie.popularity) ? movie.popularity : null,
        runtime_minutes: movie.runtime || null,
        creator: "The Movie Database",
        license: "Metadata e imágenes sujetos a términos TMDB; no incluye derechos de exhibición",
        credit: "Metadata e imágenes: TMDB",
        catalog_source: "tmdb",
        published: true,
        status: "soon",
      }));
      if (rows.length) {
        const { error } = await db.from("movies").upsert(rows, { onConflict: "tmdb_id", ignoreDuplicates: false });
        if (error) throw error;
        imported += rows.length;
      }
      lastPage = page;
      if (page >= totalPages || !rows.length) break;
    }
    return NextResponse.json({ imported, firstPage: start, lastPage, totalPages, nextPage: lastPage < totalPages ? lastPage + 1 : null });
  } catch (error) {
    console.error("TMDB catalog sync failed", error);
    return NextResponse.json({ error: "Falló la sincronización del catálogo" }, { status: 502 });
  }
}
