import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"; // Stable endpoint for this aggregate query while the QLever v2 migration is validated.
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const BATCH_SIZE = 20;
const SOURCE = "wikidata";

type Binding = { value: string; "xml:lang"?: string };
type WikidataFilm = {
  film: Binding;
  filmLabel: Binding;
  filmDescription?: Binding;
  releaseDate?: Binding;
  genres?: Binding;
  imageSample?: Binding;
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


const LIBRIVOX_SOURCE = "librivox";
const LIBRIVOX_BATCH_SIZE = 500;



async function runCatalogSync(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const cronAuthorized = Boolean(secret && authorization === `Bearer ${secret}`);

  let adminAuthorized = false;
  let adminSessionClient: Awaited<ReturnType<typeof createSessionClient>> | null = null;
  if (!cronAuthorized) {
    try {
      adminSessionClient = await createSessionClient();
      const { data: { user }, error: authError } = await adminSessionClient.auth.getUser();
      if (user && !authError) {
        const { data: profile, error: profileError } = await adminSessionClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        adminAuthorized = !profileError && profile?.role === "admin";
      }
    } catch {
      adminAuthorized = false;
      adminSessionClient = null;
    }
  }

  if (!cronAuthorized && !adminAuthorized) {
    return NextResponse.json({ error: "Debes iniciar sesión con una cuenta administradora." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    return NextResponse.json({ error: "Falta la URL de Supabase" }, { status: 503 });
  }
  if (!serviceKey) {
    return NextResponse.json({ error: "La importación requiere una credencial privada del servidor (SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  }
  if (!cronAuthorized && (!adminAuthorized || !adminSessionClient)) {
    return NextResponse.json({ error: "La sesión administradora no está disponible. Vuelve a iniciar sesión." }, { status: 401 });
  }

  try {
    // Always verify the administrator session above, then use the private server key.
    // The import-state table is intentionally not exposed to anon/authenticated users.
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const importLibriVox = async () => {
      const seed = await db.from("catalog_import_state").upsert(
        { source: LIBRIVOX_SOURCE, next_offset: 0, completed: false, total_imported: 0 },
        { onConflict: "source", ignoreDuplicates: true }
      );
      if (seed.error) throw seed.error;
      const stateResult = await db.from("catalog_import_state")
        .select("next_offset,completed,total_imported")
        .eq("source", LIBRIVOX_SOURCE).maybeSingle();
      if (stateResult.error) throw stateResult.error;
      const state = stateResult.data;
      if (!state) throw new Error("LibriVox import state missing");
      if (state.completed) return NextResponse.json({ source: "LibriVox", complete: true, importedSoFar: state.total_imported });
    
      const offset = Math.max(0, Number(state.next_offset) || 0);
      console.info("[catalog-sync:librivox] batch started", {
        offset,
        previousTotal: Number(state.total_imported) || 0,
        at: new Date().toISOString(),
      });
      const query = new URLSearchParams({
        format: "json",
        coverart: "1",
        extended: "1",
        fields: "{id,title,description,language,copyright_year,num_sections,url_rss,url_zip_file,url_librivox,totaltime,totaltimesecs,authors,sections,coverart_jpg,coverart_thumbnail}",
        limit: String(LIBRIVOX_BATCH_SIZE),
        offset: String(offset),
        sort_order: "asc",
      });
      const response = await fetch("https://librivox.org/api/feed/audiobooks/?" + query.toString(), {
        headers: { "User-Agent": "NOIRVAULT/7.0 audiobook catalog importer" },
        cache: "no-store",
        signal: AbortSignal.timeout(35000),
      });
      if (!response.ok) throw new Error("LibriVox API status " + response.status);
      const payload = await response.json();
      const books = Array.isArray(payload.books) ? payload.books : [];
      const cleanUrl = (value: unknown, host: string) => {
        if (typeof value !== "string") return null;
        try {
          const parsed = new URL(value);
          return parsed.protocol === "https:" && (parsed.hostname === host || parsed.hostname.endsWith("." + host)) ? parsed.toString() : null;
        } catch { return null; }
      };
      const entries = books.flatMap((book: Record<string, unknown>) => {
        const id = String(book.id || "").trim();
        const page = cleanUrl(book.url_librivox, "librivox.org");
        const title = safeText(String(book.title || ""));
        if (!id || !page || !title) return [];
        const authors = Array.isArray(book.authors)
          ? book.authors.map((a: Record<string, unknown>) => safeText([a.first_name, a.last_name].filter(Boolean).map(String).join(" "))).filter(Boolean).join(", ")
          : "";
        const language = safeText(String(book.language || ""));
        const languageMap: Record<string, string> = {
          English: "en", Spanish: "es", French: "fr", German: "de", Italian: "it",
          Portuguese: "pt", Japanese: "ja", Russian: "ru", Dutch: "nl", Danish: "da",
          Swedish: "sv", Norwegian: "no", Finnish: "fi", Latin: "la", Greek: "el",
          Chinese: "zh", Arabic: "ar", Polish: "pl", Czech: "cs", Hungarian: "hu",
          Turkish: "tr", Esperanto: "eo", Multilingual: "mul",
        };
        const bookLanguage = languageMap[language] || "";
        const seconds = Number(book.totaltimesecs) || 0;
        const rawSections = Array.isArray(book.sections) ? book.sections as Record<string, unknown>[] : [];
        const audioTracks = rawSections.flatMap((section, index) => {
          const url = cleanUrl(section.listen_url, "archive.org");
          if (!url) return [];
          const sectionLanguage = safeText(String(section.language || language));
          const trackTitle = safeText(String(section.title || ""));
          const sectionNumber = safeText(String(section.section_number || index + 1));
          const label = [String(sectionNumber).padStart(2, "0"), trackTitle || ("Capítulo " + sectionNumber)].filter(Boolean).join(" · ");
          return [{
            label,
            language: languageMap[sectionLanguage] || bookLanguage || "und",
            url,
            verified: true,
          }];
        });
         return [{
          title,
          synopsis: safeText(String(book.description || "")) || "Audiolibro grabado por voluntarios de LibriVox.",
          genre: "Literatura",
          release_year: Number(book.copyright_year) || null,
          duration: safeText(String(book.totaltime || "")) || null,
          runtime_minutes: seconds > 0 ? Math.round(seconds / 60) : null,
          poster_url: cleanUrl(book.coverart_thumbnail || book.coverart_jpg, "librivox.org"),
          creator: authors || "LibriVox volunteers",
          license: "Dominio público declarado por LibriVox en EE. UU.; derechos de grabación y texto para Colombia pendientes de verificación",
          credit: "LibriVox · grabaciones de voluntarios. Atribución al lector y al autor cuando figuran en la ficha oficial.",
          catalog_source: page,
          reader_url: page,
          audio_url: null,
          audio_tracks: [],
          audio_languages: bookLanguage ? [bookLanguage] : [],
          content_type: "audiobook",
          content_metadata: {
            catalog_provider: "librivox",
            provider_id: id,
            rss_url: cleanUrl(book.url_rss, "librivox.org"),
            archive_zip_url: cleanUrl(book.url_zip_file, "archive.org"),
            recording_license: "public_domain_us",
            local_rights_review: "required",
            source_language: language || null,
            number_of_audio_sections: Number(book.num_sections) || rawSections.length || null,
            playable_audio_sections: 0,
            official_audio_sections: audioTracks.length,
            direct_playback_enabled: false,
            playback_mode: "official_external_page_pending_local_rights_review",
          },
          published: true,
          status: "available",
        }];
      });    
      const pages = entries.map((row: Record<string, unknown>) => row.catalog_source as string);
      const existing = pages.length
        ? await db.from("movies").select("catalog_source").in("catalog_source", pages)
        : { data: [], error: null };
      if (existing.error) throw existing.error;
      const existingSet = new Set((existing.data || []).map((row: { catalog_source: string }) => row.catalog_source));
      const newRows = entries.filter((row: Record<string, unknown>) => !existingSet.has(row.catalog_source as string));
      if (newRows.length) {
        const inserted = await db.from("movies").insert(newRows);
        if (inserted.error) throw inserted.error;
      }
      const nextOffset = offset + books.length;
      const complete = books.length < LIBRIVOX_BATCH_SIZE;
      console.info("[catalog-sync:librivox] batch processed", {
        fetched: books.length,
        inserted: newRows.length,
        nextOffset,
        complete,
      });
      const total = Number(state.total_imported || 0) + newRows.length;
      const updated = await db.from("catalog_import_state").update({
        next_offset: nextOffset, completed: complete, total_imported: total, updated_at: new Date().toISOString()
      }).eq("source", LIBRIVOX_SOURCE);
      if (updated.error) throw updated.error;
      return NextResponse.json({
        source: "LibriVox",
        fetchedThisBatch: books.length,
        importedThisBatch: newRows.length,
        importedSoFar: total,
        offset,
        nextOffset,
        complete,
        playback: "Solo se abre la ficha oficial de LibriVox. La reproducción directa dentro de NOIR queda desactivada hasta verificar en Colombia los derechos del texto, la traducción y la grabación.",
        rights: "Las grabaciones son de dominio público en EE. UU.; revisar la situación legal del texto en Colombia."
      });
    };
    const requestedSource = new URL(request.url).searchParams.get("source") || SOURCE;
    if (requestedSource === LIBRIVOX_SOURCE) {
      return await importLibriVox();
    }
    if (requestedSource !== SOURCE) {
      return NextResponse.json({ error: "Fuente de importación no reconocida." }, { status: 400 });
    }
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
        (GROUP_CONCAT(DISTINCT STR(?genreLabel); SEPARATOR = ", ") AS ?genres)
        (SAMPLE(?image) AS ?imageSample)
      WHERE {
        ?film wdt:P31 wd:Q11424.
        OPTIONAL { ?film wdt:P577 ?date. }
        OPTIONAL { ?film wdt:P18 ?image. }
        OPTIONAL {
          ?film wdt:P136 ?genre.
          ?genre rdfs:label ?genreLabel.
          FILTER(LANG(?genreLabel) = "es" || LANG(?genreLabel) = "en")
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
        # Do not import entities that have no real Spanish or English title.
        FILTER(LANG(?filmLabel) IN ("es", "en"))
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
      signal: AbortSignal.timeout(28000),
    });
    if (!response.ok) {
      const responseDetail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 180);
      throw new Error(`Wikidata query failed: ${response.status}${responseDetail ? " · " + responseDetail : ""}`);
    }

    const json = await response.json();
    const bindings = (json.results?.bindings || []) as WikidataFilm[];
    const fileTitles = bindings
      .map((item) => item.imageSample?.value ? commonsFileTitle(item.imageSample.value) : null)
      .filter((value): value is string => Boolean(value));
    const images = await fetchCommonsImages(fileTitles);

    const today = new Date().toISOString().slice(0, 10);
    const rows = bindings.flatMap((item) => {
      const qid = item.film.value.split("/").pop() || "";
      const title = safeText(item.filmLabel.value);
      const genre = safeText(item.genres?.value) || "Cine";
      // Do not publish unlabelled Wikidata entities or adult-film records.
      if (!title || /^Q[0-9]+$/i.test(title)) return [];
      if (/pornographic film|cine pornográfico/i.test(genre)) return [];

      const fileTitle = item.imageSample?.value ? commonsFileTitle(item.imageSample.value) : null;
      const image = fileTitle ? images.get(fileTitle) : undefined;
      const releaseDate = item.releaseDate?.value?.slice(0, 10) || null;
      const releaseYear = releaseDate ? Number(releaseDate.slice(0, 4)) || null : null;
      return [{
        wikidata_id: qid,
        title,
        synopsis: safeText(item.filmDescription?.value) || null,
        genre,
        release_year: releaseYear,
        release_date: releaseDate,
        poster_url: image?.url || null,
        creator: "Información de Wikidata",
        license: image ? `Datos estructurados: CC0; imagen: ${image.license}` : "Datos estructurados: CC0",
        credit: image
          ? `Datos: Wikidata (${qid}); imagen: ${image.credit} — Wikimedia Commons`
          : `Datos: Wikidata (${qid})`,
        catalog_source: `https://www.wikidata.org/wiki/${qid}`,
        content_metadata: {
          catalog_availability: releaseDate && releaseDate > today ? "upcoming" : "source_pending",
        },
        published: true,
        status: "soon",
      }];
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
    const detail = error instanceof Error ? error.message.slice(0, 280) : "Error de origen o base de datos";
    return NextResponse.json({ error: "Falló la importación desde fuentes abiertas", detail }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  // GET is reserved for Vercel Cron. Browser/admin-triggered imports must use POST.
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Esta ruta GET está reservada para tareas programadas." }, { status: 401 });
  }
  return runCatalogSync(request);
}

export async function POST(request: NextRequest) {
  return runCatalogSync(request);
}
