import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const BATCH_SIZE = 40;
const SOURCE = "wikidata";

type Binding = { value: string; "xml:lang"?: string };
type WikidataFilm = {
  film: Binding;
  filmLabel: Binding;
  filmDescription?: Binding;
  releaseDate?: Binding;
  genres?: Binding;
  image?: Binding;
};

function safeText(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function commonsFileTitle(imageUrl: string) {
  const marker = "/Special:FilePath/";
  const index = imageUrl.indexOf(marker);
  if (index < 0) return null;
  try {
    return "File:" + decodeURIComponent(imageUrl.slice(index + marker.length).split("?")[0]);
  } catch {
    return null;
  }
}

function reusableLicense(label: string) {
  const normalized = label.toLowerCase().replace(/\s+/g, " ").trim();
  return /\b(cc0|public domain|dominio público|cc by(?:-sa)? 1\.[0-9]|cc by(?:-sa)? 2\.[0-9]|cc by(?:-sa)? 3\.[0-9]|cc by(?:-sa)? 4\.[0-9])\b/.test(normalized);
}

async function fetchCommonsImages(titles: string[]) {
  const result = new Map<string, { url: string; license: string; credit: string }>();
  if (!titles.length) return result;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "500",
    titles: titles.join("|"),
  });
  const response = await fetch(COMMONS_API + "?" + params.toString(), {
    headers: { "User-Agent": "NOIRVAULT/7.0 (open movie metadata importer)" },
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

async function runCatalogSync(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const cronAuthorized = Boolean(secret && authorization === `Bearer ${secret}`);

  let adminAuthorized = false;
  if (!cronAuthorized) {
    try {
      const sessionClient = await createSessionClient();
      const { data: { user }, error: authError } = await sessionClient.auth.getUser();
      if (user && !authError) {
        const { data: profile, error: profileError } = await sessionClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        adminAuthorized = !profileError && profile?.role === "admin";
      }
    } catch {
      adminAuthorized = false;
    }
  }

  if (!cronAuthorized && !adminAuthorized) {
    return NextResponse.json({ error: "Debes iniciar sesión con una cuenta administradora." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Faltan las credenciales privadas de Supabase" }, { status: 503 });
  }

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: state, error: stateError } = await db
      .from("catalog_import_state")
      .select("next_offset,completed,total_imported")
      .eq("source", SOURCE)
      .maybeSingle();
    if (stateError) throw stateError;
    if (!state) throw new Error("No existe el estado inicial de la importación");

    if (state.completed) {
      return NextResponse.json({
        source: "Wikidata + Wikimedia Commons",
        complete: true,
        importedSoFar: state.total_imported,
        message: "La importación inicial ya terminó.",
      });
    }

    const urlPage = new URL(request.url).searchParams.get("page");
    const requestedPage = urlPage ? Number(urlPage) : null;
    const offset = requestedPage && Number.isFinite(requestedPage)
      ? Math.max(0, Math.min(399960, (Math.max(1, Math.floor(requestedPage)) - 1) * BATCH_SIZE))
      : state.next_offset;

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
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(`Wikidata query failed: ${response.status}`);

    const json = await response.json();
    const bindings = (json.results?.bindings || []) as WikidataFilm[];
    const fileTitles = bindings
      .map((item) => item.image?.value ? commonsFileTitle(item.image.value) : null)
      .filter((value): value is string => Boolean(value));
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
        creator: "Información de Wikidata",
        license: image ? `Datos estructurados: CC0; imagen: ${image.license}` : "Datos estructurados: CC0",
        credit: image
          ? `Datos: Wikidata (${qid}); imagen: ${image.credit} — Wikimedia Commons`
          : `Datos: Wikidata (${qid})`,
        catalog_source: `https://www.wikidata.org/wiki/${qid}`,
        published: true,
        status: "soon",
      };
    });

    if (rows.length) {
      const { error } = await db.from("movies").upsert(rows, {
        onConflict: "wikidata_id",
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }

    const nextOffset = offset + bindings.length;
    const complete = bindings.length < BATCH_SIZE;
    const { error: updateError } = await db
      .from("catalog_import_state")
      .update({
        next_offset: nextOffset,
        completed: complete,
        total_imported: state.total_imported + rows.length,
        updated_at: new Date().toISOString(),
      })
      .eq("source", SOURCE);
    if (updateError) throw updateError;

    return NextResponse.json({
      source: "Wikidata + imágenes de Wikimedia Commons con licencias reutilizables",
      importedThisBatch: rows.length,
      importedSoFar: state.total_imported + rows.length,
      postersWithVerifiedLicense: rows.filter((row) => row.poster_url).length,
      offset,
      nextOffset,
      complete,
      playback: "No se asignan vídeos: los derechos de exhibición se verifican por separado.",
    });
  } catch (error) {
    console.error("Open catalog sync failed", error);
    return NextResponse.json({ error: "Falló la importación desde fuentes abiertas" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return runCatalogSync(request);
}

export async function POST(request: NextRequest) {
  return runCatalogSync(request);
}
