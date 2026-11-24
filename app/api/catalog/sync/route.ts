import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const BATCH_SIZE = 40;

type Binding = { value: string; "xml:lang"?: string };
type WikidataFilm = {
  film: Binding;
  filmLabel: Binding;
  filmDescription?: Binding;
  date?: Binding;
  genres?: Binding;
  image?: Binding;
};

function safeText(value?: string) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function commonsFileTitle(imageUrl: string) {
  const marker = "/Special:FilePath/";
  const index = imageUrl.indexOf(marker);
  if (index < 0) return null;
  try { return "File:" + decodeURIComponent(imageUrl.slice(index + marker.length)); }
  catch { return null; }
}

function reusableLicense(label: string) {
  const normalized = label.toLowerCase();
  return /\b(cc0|public domain|dominio público|cc by(?:-sa)? 1\.[0-9]|cc by(?:-sa)? 2\.[0-9]|cc by(?:-sa)? 3\.[0-9]|cc by(?:-sa)? 4\.[0-9])\b/.test(normalized);
}

async function fetchCommonsImages(titles: string[]) {
  const result = new Map<string, { url: string; license: string; credit: string }>();
  if (!titles.length) return result;
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", prop: "imageinfo",
    iiprop: "url|extmetadata", iiurlwidth: "500", titles: titles.join("|"),
  });
  const response = await fetch(COMMONS_API + "?" + params.toString(), {
    headers: { "User-Agent": "NOIRVAULT/7.0 (catalog metadata; contact via site)" },
    cache: "no-store",
  });
  if (!response.ok) return result;
  const json = await response.json();
  for (const page of json.query?.pages || []) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    const meta = info.extmetadata || {};
    const license = safeText(meta.LicenseShortName?.value || "");
    if (!reusableLicense(license)) continue;
    const artist = safeText(meta.Artist?.value || "");
    const credit = safeText(meta.Credit?.value || artist || page.title || "");
    result.set(page.title, { url: info.thumburl, license, credit });
  }
  return result;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Faltan las credenciales privadas de Supabase" }, { status: 503 });
  }

  try {
    const requestedPage = Number(new URL(request.url).searchParams.get("page") || 1);
    const page = Math.max(1, Math.min(10000, Number.isFinite(requestedPage) ? requestedPage : 1));
    const offset = (page - 1) * BATCH_SIZE;
    const sparql = `
      SELECT ?film ?filmLabel ?filmDescription
        (SAMPLE(?date) AS ?releaseDate)
        (GROUP_CONCAT(DISTINCT STR(?genreLabel); separator=", ") AS ?genres)
        (SAMPLE(?image) AS ?image)
      WHERE {
        ?film wdt:P31/wdt:P279* wd:Q11424.
        OPTIONAL { ?film wdt:P577 ?date. }
        OPTIONAL { ?film wdt:P18 ?image. }
        OPTIONAL {
          ?film wdt:P136 ?genre.
          ?genre rdfs:label ?genreLabel.
          FILTER(LANG(?genreLabel) = "es" || LANG(?genreLabel) = "en")
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      GROUP BY ?film ?filmLabel ?filmDescription
      ORDER BY ?film
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;
    const response = await fetch(WIKIDATA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/sparql-results+json",
        "User-Agent": "NOIRVAULT/7.0 (open movie metadata importer)",
      },
      body: new URLSearchParams({ query: sparql }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Wikidata query failed: ${response.status}`);
    const json = await response.json();
    const bindings = (json.results?.bindings || []) as WikidataFilm[];
    const fileTitles = bindings.map((item) => item.image?.value ? commonsFileTitle(item.image.value) : null).filter((value): value is string => Boolean(value));
    const images = await fetchCommonsImages(fileTitles);
    const rows = bindings.map((item) => {
      const qid = item.film.value.split("/").pop() || "";
      const fileTitle = item.image?.value ? commonsFileTitle(item.image.value) : null;
      const image = fileTitle ? images.get(fileTitle) : undefined;
      const releaseDate = item.releaseDate?.value?.slice(0, 10) || null;
      const releaseYear = releaseDate ? Number(releaseDate.slice(0, 4)) || null : null;
      return {
        wikidata_id: qid,
        title: safeText(item.filmLabel.value) || "Película sin título",
        synopsis: safeText(item.filmDescription?.value) || null,
        genre: safeText(item.genres?.value) || "Cine",
        release_year: releaseYear,
        release_date: releaseDate,
        poster_url: image?.url || null,
        creator: "Wikidata contributors",
        license: image ? `Datos: CC0; imagen: ${image.license}` : "Datos estructurados: CC0",
        credit: image ? `Datos: Wikidata (${qid}); imagen: ${image.credit} — Wikimedia Commons` : `Datos: Wikidata (${qid})`,
        catalog_source: "wikidata",
        published: true,
        status: "soon",
      };
    });
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    if (rows.length) {
      const { error } = await db.from("movies").upsert(rows, { onConflict: "wikidata_id", ignoreDuplicates: false });
      if (error) throw error;
    }
    return NextResponse.json({
      source: "Wikidata + imágenes de Wikimedia Commons con licencias reutilizables",
      imported: rows.length,
      page,
      nextPage: rows.length === BATCH_SIZE ? page + 1 : null,
      postersWithVerifiedLicense: rows.filter((row) => row.poster_url).length,
      playback: "No se asignan vídeos: los derechos de exhibición deben verificarse por separado.",
    });
  } catch (error) {
    console.error("Open catalog sync failed", error);
    return NextResponse.json({ error: "Falló la importación desde fuentes abiertas" }, { status: 502 });
  }
}
