"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";


type ContentType = "movie" | "series" | "anime" | "manga" | "podcast" | "documentary" | "audiobook" | "concert" | "short";
type Film = {
  id: string; name: string; genre: string; year: number; duration: string;
  synopsis: string; posterUrl: string; videoUrl?: string; fallbackVideoUrl?: string;
  audioUrl?: string; readerUrl?: string; contentType?: ContentType;
  seasonNumber?: number; episodeNumber?: number; seasonCount?: number; episodeCount?: number; chapterCount?: number;
  creator: string; license: string; credit: string; sourcePageUrl?: string;
  audioTracks?: { label: string; language: string; url: string; verified?: boolean }[];
  subtitleTracks?: { label: string; language: string; src: string; isDefault?: boolean }[];
  audioLanguages?: string[];
  hasLatinSpanish?: boolean;
  status: "available" | "soon";
};

const CONTENT_TYPES: { value: ContentType; label: string; eyebrow: string; description: string }[] = [
  { value: "movie", label: "Películas", eyebrow: "01 / CINE", description: "Largometrajes y cortometrajes con fuentes verificadas." },
  { value: "series", label: "Series", eyebrow: "02 / SERIES", description: "Historias organizadas por temporadas y episodios." },
  { value: "anime", label: "Anime", eyebrow: "03 / ANIME", description: "Animación japonesa y otras escuelas de animación." },
  { value: "manga", label: "Manga", eyebrow: "04 / MANGA", description: "Lectura por tomos y capítulos desde fuentes autorizadas." },
  { value: "podcast", label: "Podcasts", eyebrow: "05 / PODCAST", description: "Conversaciones, cultura, ficción sonora y audio." },
  { value: "documentary", label: "Documentales", eyebrow: "06 / DOCS", description: "Historias reales, ciencia, cultura y naturaleza." },
  { value: "audiobook", label: "Audiolibros", eyebrow: "07 / BOOKS", description: "Literatura narrada y libros en audio." },
  { value: "concert", label: "Conciertos", eyebrow: "08 / LIVE", description: "Música en directo y sesiones especiales." },
  { value: "short", label: "Cortometrajes", eyebrow: "09 / SHORTS", description: "Piezas breves, experimentales y de autor." },
];
const CONTENT_LABELS: Record<ContentType, string> = {
  movie: "Películas", series: "Series", anime: "Anime", manga: "Manga", podcast: "Podcasts",
  documentary: "Documentales", audiobook: "Audiolibros", concert: "Conciertos", short: "Cortometrajes",
};

const commons = "https://upload.wikimedia.org/wikipedia/commons";
const transcoded = (folder: string, file: string, rendition: string) =>
  commons + "/transcoded/" + folder + "/" + file + "/" + file + "." + rendition;

const initialFilms: Film[] = [
  {
    id: "big-buck-bunny", name: "BIG BUCK BUNNY", genre: "Animación", year: 2008, duration: "10 min 35 s",
    synopsis: "Un conejo gigante y tranquilo decide enfrentarse a tres roedores que alteran la paz del bosque.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Big_Buck_Bunny_4K.webm/1280px--Big_Buck_Bunny_4K.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/bf1f3fb5-b119-4f9f-9930-8e20e892b898-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/bf1f3fb5-b119-4f9f-9930-8e20e892b898-360.mp4",
    creator: "Blender Foundation", license: "CC BY 3.0",
    credit: "© copyright Blender Foundation | www.bigbuckbunny.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Big_Buck_Bunny_4K.webm", status: "available",
  },
  {
    id: "sintel", name: "SINTEL", genre: "Fantasía", year: 2010, duration: "14 min 48 s",
    synopsis: "Una joven atraviesa tierras heladas en busca del pequeño dragón que perdió.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sintel_poster.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/0eb052d0-fd51-43e6-aa33-ecdbf77a5d40-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/0eb052d0-fd51-43e6-aa33-ecdbf77a5d40-360.mp4",
    creator: "Durian Open Movie Project / Blender Foundation", license: "CC BY 3.0",
    credit: "© copyright Blender Foundation | www.sintel.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Sintel_movie_4K.webm", status: "available",
  },
  {
    id: "tears-of-steel", name: "TEARS OF STEEL", genre: "Ciencia ficción", year: 2012, duration: "12 min 14 s",
    synopsis: "En un futuro devastado, un grupo intenta salvar a la humanidad de una amenaza tecnológica.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/7/70/Tos-poster.png",
    videoUrl: "https://video.blender.org/object-storage/web_videos/8533ea43-4271-4a57-9694-e9d0b35e1aa1-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/8533ea43-4271-4a57-9694-e9d0b35e1aa1-360.mp4",
    creator: "Blender Foundation", license: "CC BY 3.0",
    credit: "(CC) Blender Foundation | mango.blender.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Tears_of_Steel_1080p.webm", status: "available",
  },
  {
    id: "elephants-dream", name: "ELEPHANTS DREAM", genre: "Ciencia ficción", year: 2006, duration: "10 min 58 s",
    synopsis: "Dos viajeros exploran una máquina gigantesca y misteriosa que parece tener vida propia.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Elephants_Dream_%282006%29.webm/1280px--Elephants_Dream_%282006%29.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/cccc3e60-0291-4ecc-aa56-39b2e2c7d0d5-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/cccc3e60-0291-4ecc-aa56-39b2e2c7d0d5-360.mp4",
    creator: "Orange Open Movie Team / Blender Foundation", license: "CC BY 2.5",
    credit: "© copyright 2006, Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Elephants_Dream_(2006).webm", status: "available",
  },
  {
    id: "cosmos-laundromat", name: "COSMOS LAUNDROMAT", genre: "Ciencia ficción", year: 2015, duration: "12 min 11 s",
    synopsis: "En una isla desolada, una oveja conoce a un vendedor extravagante que le ofrece una oportunidad imposible.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm/1280px--Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/f507dfdc-e73e-45a4-9778-d758cbe1ce96-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/f507dfdc-e73e-45a4-9778-d758cbe1ce96-360.mp4",
    creator: "Blender Foundation", license: "CC BY-SA 3.0",
    credit: "Blender Foundation | gooseberry.blender.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm", status: "available",
  },
  {
    id: "spring", name: "SPRING", genre: "Fantasía", year: 2019, duration: "7 min 44 s",
    synopsis: "Una pastora y su perro se enfrentan a antiguos espíritus para mantener el ciclo de la vida.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Spring_-_Blender_Open_Movie.webm/1280px--Spring_-_Blender_Open_Movie.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/3d95fb3d-c866-42c8-9db1-fe82f48ccb95-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/3d95fb3d-c866-42c8-9db1-fe82f48ccb95-360.mp4",
    creator: "Blender Animation Studio", license: "CC BY 4.0",
    credit: "Blender Foundation | blender.org/press/spring-open-movie",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Spring_-_Blender_Open_Movie.webm", status: "available",
  },
  {
    id: "sprite-fright", name: "SPRITE FRIGHT", genre: "Aventura", year: 2021, duration: "10 min 30 s",
    synopsis: "Un grupo de adolescentes descubre criaturas del bosque que esconden una fuerza inesperada.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm/1280px--Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/a69d68a5-a0e0-4a80-9d66-49f093c97aaf-720.mp4",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/transcoded/7/74/Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm/Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm.360p.vp9.webm",
    creator: "Blender Studio", license: "CC BY 4.0",
    credit: "Blender Foundation | studio.blender.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm", status: "available",
  },
  {
    id: "coffee-run", name: "COFFEE RUN", genre: "Animación", year: 2020, duration: "3 min 05 s",
    synopsis: "Un recorrido veloz y colorido acompaña a una joven a través de recuerdos y emociones.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Coffee_Run_-_Blender_Open_Movie-full_movie.webm/1280px--Coffee_Run_-_Blender_Open_Movie-full_movie.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/ff8fe61b-026f-4f07-b66b-2a790d6f6ab1-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/ff8fe61b-026f-4f07-b66b-2a790d6f6ab1-360.mp4",
    creator: "Blender Foundation", license: "CC BY 4.0", credit: "Blender Foundation",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Coffee_Run_-_Blender_Open_Movie-full_movie.webm", status: "available",
  },
  {
    id: "glass-half", name: "GLASS HALF", genre: "Comedia", year: 2015, duration: "3 min 13 s",
    synopsis: "Una comedia animada sobre el arte, las opiniones y las discusiones que nunca terminan.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Glass_Half_-_Blender_Open_Movie-full_movie.webm/1280px--Glass_Half_-_Blender_Open_Movie-full_movie.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/64222c8a-c4c7-4b3b-9850-7fb2078edcf6-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/64222c8a-c4c7-4b3b-9850-7fb2078edcf6-360.mp4",
    creator: "Blender Foundation", license: "CC BY 4.0", credit: "Blender Foundation",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Glass_Half_-_Blender_Open_Movie-full_movie.webm", status: "available",
  },
  {
    id: "caminandes", name: "CAMINANDES: GRAN DILLAMA", genre: "Animación", year: 2013, duration: "2 min 26 s",
    synopsis: "Koro, una llama obstinada, intenta conseguir una baya en la Patagonia.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm/1280px--Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm.jpg",
    videoUrl: "https://video.blender.org/object-storage/web_videos/fb70d459-48d2-4db5-adba-813c84f9200a-480.mp4",
    fallbackVideoUrl: "https://video.blender.org/object-storage/web_videos/fb70d459-48d2-4db5-adba-813c84f9200a-360.mp4",
    creator: "Blender Institute", license: "CC BY-SA 3.0", credit: "(CC) caminandes.com",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm", status: "available",
  },
  {
    id: "pasion-oriental", name: "PASIÓN ORIENTAL", genre: "Cine latinoamericano", year: 2017, duration: "12 min 38 s",
    synopsis: "Cortometraje argentino presentado en festivales de Mar del Plata y Valencia. Audio original en español rioplatense; no es un doblaje.",
    posterUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Pasi%C3%B3n_Oriental.webm/960px--Pasi%C3%B3n_Oriental.webm.jpg",
    videoUrl: "https://upload.wikimedia.org/wikipedia/commons/transcoded/d/da/Pasi%C3%B3n_Oriental.webm/Pasi%C3%B3n_Oriental.webm.480p.vp9.webm",
    fallbackVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/transcoded/d/da/Pasi%C3%B3n_Oriental.webm/Pasi%C3%B3n_Oriental.webm.360p.vp9.webm",
    creator: "Santi Korovsky", license: "CC BY 3.0",
    credit: "Santi Korovsky · Cambios de formato para reproducción web; audio original en español rioplatense.",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Pasión_Oriental.webm", status: "available",
    audioLanguages: ["es-AR"], hasLatinSpanish: true,
  },
  {
    id: "agent-327", name: "AGENT 327", genre: "Comedia", year: 2017, duration: "En preparación",
    synopsis: "Un agente secreto se infiltra en una barbería en una misión que se sale de control.",
    posterUrl: "", creator: "Blender Foundation", license: "Pendiente de verificar fuente completa",
    credit: "La versión disponible públicamente es un teaser; reproducción completa deshabilitada.", status: "soon",
  },
];

function licenseUrl(license: string) {
  const versionMatch = license.match(/\\b(1\\.0|2\\.0|2\\.5|3\\.0|4\\.0)\\b/);
  // If the provider does not expose a version, link to the official CC overview instead of guessing one.
  if (!versionMatch) return "https://creativecommons.org/share-your-work/cclicenses/";
  const version = versionMatch[1];
  return /BY-SA|Attribution-ShareAlike/i.test(license)
    ? "https://creativecommons.org/licenses/by-sa/" + version + "/"
    : "https://creativecommons.org/licenses/by/" + version + "/";
}

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className={footer ? "brandLockup brandLockupFooter" : "brandLockup"} href="#" aria-label="NOIR VAULT, inicio">
      <svg className="brandMark" viewBox="0 0 44 44" role="img" aria-label="Símbolo NOIR VAULT">
        <path d="M22 2.5 38.9 12.2v19.6L22 41.5 5.1 31.8V12.2L22 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M14 30V14h3.1l9 10.5V14H30v16h-3.1l-9-10.5V30H14Z" fill="currentColor"/>
      </svg>
      <span className="brandWords"><strong><b>NOIR</b> VAULT</strong><small>THE CINEMA CLUB</small></span>
    </a>
  );
}

export default function Home() {
  const [supabase] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  });
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const [pendingWatchId, setPendingWatchId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastProgressRef = useRef<{ movieId: string; seconds: number }>({ movieId: "", seconds: 0 });
  const progressSavingRef = useRef(false);
  const [catalogFilms, setCatalogFilms] = useState<Film[]>(initialFilms);
  const [genre, setGenre] = useState("Todo");
  const [contentType, setContentType] = useState<ContentType | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Film | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [audioFilter, setAudioFilter] = useState<"all" | "latin" | "spanish">("all");
  const [videoState, setVideoState] = useState<"loading" | "ready" | "error">("loading");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(12);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);

  const openFilm = useCallback(async (film: Film) => {
    if (film.status !== "available" || (!film.videoUrl && !film.audioUrl && !film.readerUrl)) return;
    setSourceIndex(0);
    setSelectedAudioIndex(0);
    setResumeAt(0);
    lastProgressRef.current = { movieId: film.id, seconds: 0 };
    setVideoState("loading");
    setSelected(film);
    if (!supabase || !film.videoUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    setViewerId(user?.id ?? null);
    if (!user) return;
    const { data } = await supabase
      .from("watch_progress")
      .select("seconds_watched")
      .eq("user_id", user.id)
      .eq("movie_id", film.id)
      .maybeSingle();
    const savedSeconds = Number(data?.seconds_watched || 0);
    if (savedSeconds > 15) setResumeAt(savedSeconds);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setViewerId(user?.id ?? null);
    });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    const watchId = new URLSearchParams(window.location.search).get("watch");
    if (watchId) setPendingWatchId(watchId);
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(catalogPage) });
    if (contentType !== "all") params.set("type", contentType);
    if (query.trim()) params.set("q", query.trim());
    if (genre !== "Todo") params.set("genre", genre);
    if (audioFilter !== "all") params.set("audio", audioFilter);
    void fetch("/api/catalog?" + params.toString(), { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("catalog"); return response.json(); })
      .then((result) => {
        if (!active) return;
        const databaseFilms: Film[] = (result.results || []).map((movie: Record<string, unknown>) => ({
          id: String(movie.id), name: String(movie.title || "Sin título"), genre: String(movie.genre || "Cine"),
          year: Number(movie.release_year || 0), duration: movie.runtime_minutes ? String(movie.runtime_minutes) + " min" : String(movie.duration || "—"),
          synopsis: String(movie.synopsis || ""), posterUrl: String(movie.poster_url || ""),
          videoUrl: movie.video_url ? String(movie.video_url) : undefined,
          fallbackVideoUrl: movie.fallback_video_url ? String(movie.fallback_video_url) : undefined,
          audioUrl: movie.audio_url ? String(movie.audio_url) : undefined,
          readerUrl: movie.reader_url ? String(movie.reader_url) : undefined,
          contentType: String(movie.content_type || "movie") as ContentType,
          seasonNumber: movie.season_number ? Number(movie.season_number) : undefined,
          episodeNumber: movie.episode_number ? Number(movie.episode_number) : undefined,
          seasonCount: movie.season_count ? Number(movie.season_count) : undefined,
          episodeCount: movie.episode_count ? Number(movie.episode_count) : undefined,
          chapterCount: movie.chapter_count ? Number(movie.chapter_count) : undefined,
          creator: String(movie.creator || "Autoría por confirmar"), license: String(movie.license || "Licencia por confirmar"),
          credit: String(movie.credit || ""), sourcePageUrl: movie.catalog_source ? String(movie.catalog_source) : undefined,
          audioTracks: Array.isArray(movie.audio_tracks) ? movie.audio_tracks as Film["audioTracks"] : [],
          subtitleTracks: Array.isArray(movie.subtitle_tracks) ? movie.subtitle_tracks as Film["subtitleTracks"] : [],
          audioLanguages: Array.isArray(movie.audio_languages) ? movie.audio_languages as string[] : [],
          hasLatinSpanish: Boolean(movie.has_latin_spanish),
          status: movie.status === "available" && (movie.video_url || movie.audio_url || movie.reader_url) ? "available" : "soon",
        }));
        setCatalogFilms(databaseFilms); setCatalogTotal(Number(result.total || 0)); setCatalogTotalPages(Number(result.totalPages || 1));
      })
      .catch(() => { if (active && catalogPage === 1 && !query && genre === "Todo" && contentType === "all") setCatalogFilms(initialFilms); });
    return () => { active = false; };
  }, [catalogPage, genre, query, audioFilter, contentType]);

  useEffect(() => {
    if (!pendingWatchId) return;
    const film = catalogFilms.find((item) => item.id === pendingWatchId);
    if (!film) return;
    openFilm(film);
    setPendingWatchId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("watch");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [pendingWatchId, catalogFilms, openFilm]);

  useEffect(() => {
    if (resumeAt <= 0 || !videoRef.current || videoRef.current.readyState < 1) return;
    if (Math.abs(videoRef.current.currentTime - resumeAt) > 8) {
      videoRef.current.currentTime = resumeAt;
    }
  }, [resumeAt, selected]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const genres = useMemo(
    () => ["Todo", ...Array.from(new Set([
      "Acción", "Aventura", "Animación", "Ciencia ficción", "Comedia", "Crimen",
      "Documental", "Drama", "Familia", "Fantasía", "Historia", "Terror",
      "Misterio", "Música", "Romance", "Suspense", "Bélica", "Western",
      ...catalogFilms.flatMap((film) => film.genre.split(",").map((value) => value.trim()).filter(Boolean)),
    ])).sort((a, b) => a.localeCompare(b, "es"))],
    [catalogFilms],
  );

  const visibleFilms = catalogFilms;

  const availableCount = catalogFilms.filter((film) => film.status === "available" && (film.videoUrl || film.audioUrl || film.readerUrl)).length;
  function changeCatalogFilter(value: string) { setGenre(value); setCatalogPage(1); }
  function changeContentType(value: ContentType | "all") { setContentType(value); setCatalogPage(1); setGenre("Todo"); }
  function changeCatalogSearch(value: string) { setQuery(value); setCatalogPage(1); }
  const featured = catalogFilms.find((film) => film.status === "available" && film.videoUrl) || initialFilms[0];

  async function saveProgress(seconds: number, force = false) {
    if (!supabase || !viewerId || !selected || progressSavingRef.current) return;
    const wholeSeconds = Math.floor(seconds);
    if (wholeSeconds < 5) return;
    const previous = lastProgressRef.current;
    if (previous.movieId === selected.id && !force && wholeSeconds - previous.seconds < 15) return;
    lastProgressRef.current = { movieId: selected.id, seconds: wholeSeconds };
    progressSavingRef.current = true;
    const { error } = await supabase.from("watch_progress").upsert({
      user_id: viewerId,
      movie_id: selected.id,
      seconds_watched: wholeSeconds,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,movie_id" });
    progressSavingRef.current = false;
    if (error) lastProgressRef.current = previous;
  }

  async function clearCompletedProgress() {
    if (!supabase || !viewerId || !selected) return;
    await supabase.from("watch_progress").delete()
      .eq("user_id", viewerId).eq("movie_id", selected.id);
    lastProgressRef.current = { movieId: selected.id, seconds: 0 };
  }

  function handleVideoError() {
    if (selectedAudioIndex > 0) {
      setSelectedAudioIndex(0);
      setSourceIndex(0);
      setVideoState("loading");
      return;
    }
    if (selected?.fallbackVideoUrl && sourceIndex === 0) {
      setSourceIndex(1);
      setVideoState("loading");
      return;
    }
    setVideoState("error");
  }

  const activeVideoUrl = selected?.videoUrl
    ? selectedAudioIndex > 0 && selected.audioTracks?.[selectedAudioIndex - 1]?.url
      ? selected.audioTracks[selectedAudioIndex - 1].url
      : sourceIndex === 1 && selected.fallbackVideoUrl ? selected.fallbackVideoUrl : selected.videoUrl
    : undefined;
  const activeAudioUrl = selected?.audioUrl;

  return (
    <main className="noirSite">
      <header className="siteHeader">
        <Brand />
        <nav aria-label="Navegación principal">
          <a href="#formatos">Explorar</a><a href="#catalogo">Catálogo</a><a href="#planes">Membresía</a>
        </nav>
        <div className="headerActions"><a className="headerLogin" href="/login">Entrar</a><a className="headerJoin" href="/registro">Unirme <span>↗</span></a></div>
      </header>

      <section className="heroSection">
        <div className="heroBackdropImage"><img src={featured.posterUrl || initialFilms[1].posterUrl} alt="" /></div>
        <div className="heroShade" />
        <div className="heroContent">
          <div className="heroKicker"><span className="goldDot" /> UNA BIBLIOTECA DE ENTRETENIMIENTO</div>
          <div className="heroEyebrow">NOIR VAULT ORIGINAL SELECTION</div>
          <h1>El cine merece<br /><em>otra mirada.</em></h1>
          <p>Cine, series, anime, manga, podcasts y otras formas de contar historias, reunidas en un solo lugar.</p>
          <div className="heroButtons">
            <button className="buttonPrimary" onClick={() => openFilm(featured)}><span className="buttonPlay">▶</span> VER DESTACADO</button>
            <a className="buttonGhost" href="#catalogo">EXPLORAR CARTELERA <span>↓</span></a>
          </div>
          <div className="heroStats"><span><strong>{availableCount.toString().padStart(2, "0")}</strong> TÍTULOS CON FUENTE</span><i /><span>CONTENIDO Y DERECHOS IDENTIFICADOS</span></div>
        </div>
        <div className="heroSideNote"><span>NV / 001</span><span>CURATED FOR THE CURIOUS</span></div>
      </section>

      <div className="trustStrip"><span>NOIR VAULT</span><i>✳</i><span>OPEN CINEMA</span><i>✳</i><span>IMÁGENES Y CRÉDITOS DE AUTOR</span><i>✳</i><span>UNA BIBLIOTECA EN CRECIMIENTO</span></div>

      <section id="formatos" className="formatsSection">
        <div className="contentWrap">
          <div className="sectionOverline">EXPLORA POR FORMATO</div>
          <div className="formatsIntro"><h2>Más que una <em>cartelera.</em></h2><p>Elige qué quieres ver, leer o escuchar. Cada formato tiene su propio filtro y su ficha de contenido.</p></div>
          <div className="formatGrid">
            {CONTENT_TYPES.map((format) => (
              <button key={format.value} type="button" className={contentType === format.value ? "formatCard formatCardActive" : "formatCard"} onClick={() => { changeContentType(format.value); document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span>{format.eyebrow}</span><strong>{format.label}</strong><small>{format.description}</small><b>EXPLORAR ↗</b>
              </button>
            ))}
          </div>
          <button type="button" className="allFormatsButton" onClick={() => { changeContentType("all"); document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }); }}>VER TODAS LAS SECCIONES</button>
        </div>
      </section>

      <section id="catalogo" className="catalogSection">
        <div className="contentWrap">
          <div className="sectionIntro">
            <div><div className="sectionOverline">{contentType === "all" ? "LA BIBLIOTECA NOIR" : CONTENT_LABELS[contentType].toUpperCase()}</div><h2>{contentType === "all" ? <>Encuentra tu próxima <em>historia.</em></> : <>Explora <em>{CONTENT_LABELS[contentType]}.</em></>}</h2><p>{contentType === "all" ? "Películas, series, manga, podcasts y más formatos en una biblioteca en crecimiento." : CONTENT_TYPES.find((item) => item.value === contentType)?.description}</p></div>
            <div className="catalogCounter"><strong>{catalogTotal.toLocaleString("es-CO")}</strong><span>TÍTULOS<br />EN CATÁLOGO</span></div>
          </div>

          <div className="catalogToolbar">
            <label className="catalogSearch">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
              <input value={query} onChange={(event) => changeCatalogSearch(event.target.value)} placeholder="Buscar título, género o historia..." aria-label="Buscar en NOIR VAULT" />
              {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => changeCatalogSearch("")}>×</button>}
            </label>
            <div className="genreChips" aria-label="Filtrar por género">
              {genres.map((item) => <button key={item} className={genre === item ? "active" : ""} onClick={() => changeCatalogFilter(item)}>{item}</button>)}
            </div>
            <div className="audioFilters" aria-label="Filtrar por idioma de audio">
              <span>IDIOMA DE AUDIO</span>
              <button className={audioFilter === "all" ? "active" : ""} onClick={() => { setAudioFilter("all"); setCatalogPage(1); }}>TODOS</button>
              <button className={audioFilter === "latin" ? "active" : ""} onClick={() => { setAudioFilter("latin"); setCatalogPage(1); }}>AUDIO LATINO</button>
              <button className={audioFilter === "spanish" ? "active" : ""} onClick={() => { setAudioFilter("spanish"); setCatalogPage(1); }}>ESPAÑOL</button>
            </div>
          </div>

          <div className="filmGrid">
            {visibleFilms.map((film, index) => (
              <button key={film.id} className={film.status === "soon" ? "filmCard filmSoon" : "filmCard"}
                onClick={() => openFilm(film)} disabled={film.status !== "available"}
                aria-label={film.status === "available" ? "Reproducir " + film.name : film.name + ", próximamente"}>
                <span className="filmPoster">
                  {film.posterUrl && <img className="posterImage" src={film.posterUrl} alt={"Póster de " + film.name} loading={index > 3 ? "lazy" : "eager"} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                  <span className="posterVignette" />
                  <span className="posterTop"><span>NOIR / OPEN CINEMA</span><span>{String(index + 1).padStart(2, "0")}</span></span>
                  {film.status === "available" ? <span className="posterPlay"><span>{film.readerUrl ? "LEER" : "▶"}</span></span> : <span className="soonPill">PRÓXIMAMENTE</span>}
                  <span className="posterBottom"><span className="posterGenre">{film.genre} <i>·</i> {film.year}</span><strong>{film.name}</strong><small>{film.duration}{film.audioLanguages?.some((language) => language.startsWith("es")) ? " · AUDIO ESPAÑOL" : ""}</small></span>
                </span>
                <span className="filmCaption"><strong>{film.name}</strong><small>{film.year} <i>·</i> {film.genre} <i>·</i> {film.duration}</small></span>
              </button>
            ))}
          </div>
          {catalogTotalPages > 1 && <div className="catalogPagination"><button disabled={catalogPage <= 1} onClick={() => setCatalogPage((p) => Math.max(1,p-1))}>← ANTERIORES</button><span>PÁGINA {catalogPage} DE {catalogTotalPages}</span><button disabled={catalogPage >= catalogTotalPages} onClick={() => setCatalogPage((p) => Math.min(catalogTotalPages,p+1))}>SIGUIENTES →</button></div>}
          {visibleFilms.length === 0 && <div className="noResults"><strong>{query ? "No encontramos ese título." : "Esta sección está preparando su catálogo."}</strong><span>{query ? "Prueba con otro término de búsqueda." : "Publicaremos contenidos cuando la fuente, el permiso y el formato de reproducción o lectura estén verificados."}</span></div>}
          <p className="catalogFootnote">Las películas, episodios y audios solo se activan cuando existe una fuente multimedia registrada. Manga y lecturas abren su lector autorizado. Las fichas sin fuente completa o permisos confirmados permanecen deshabilitadas.</p>
        </div>
      </section>

      <section id="colecciones" className="collectionsSection">
        <div className="contentWrap collectionsLayout">
          <div className="collectionsCopy"><div className="sectionOverline">UN UNIVERSO MULTIFORMATO</div><h2>Una biblioteca.<br /><em>Mil maneras de sentir.</em></h2><p>Del cine a la lectura y el audio: descubre historias en formatos distintos, con sus fuentes, créditos y permisos identificados.</p></div>
          <div className="collectionCards">
            <a className="collectionCard collectionOpen" href="#formatos"><span>01 / NOIR LIBRARY</span><strong>Una colección<br /><em>para explorar.</em></strong><small>VER LOS FORMATOS <b>↗</b></small></a>
            <a className="collectionCard collectionPremiere" href="#formatos"><span>02 / AUDIO & READ</span><strong>Escucha y lee<br /><em>nuevas historias.</em></strong><small>PODCASTS · MANGA · AUDIOLIBROS</small></a>
          </div>
        </div>
      </section>

      <section id="planes" className="membershipSection">
        <div className="membershipSeal"><Brand footer /></div>
        <div className="sectionOverline">NOIR VAULT MEMBERSHIP</div>
        <h2>Tu próxima película<br />está <em>por comenzar.</em></h2>
        <p>Crea tu cuenta y acompaña el crecimiento de una biblioteca dedicada a las buenas historias.</p>
        <div className="membershipPrice"><strong>$20.000</strong><span>COP / MES</span></div>
        <a className="buttonPrimary membershipButton" href="/registro">CREAR MI CUENTA <span>↗</span></a>
        <small>Stripe está conectado en modo de prueba. NOIR VAULT aún no realiza cobros reales; el lanzamiento comercial está pendiente de validar el recorrido de pago y la biblioteca con licencias de distribución.</small>
      </section>

      <footer className="siteFooter">
        <Brand footer />
        <div className="footerLinks"><a href="#catalogo">Cartelera</a><a href="/cuenta">Mi cuenta</a><a href="/registro">Crear cuenta</a></div>
        <span>© 2026 NOIR VAULT · THE CINEMA CLUB</span>
      </footer>

      {selected && (activeVideoUrl || activeAudioUrl || selected.readerUrl) && (
        <div className="playerOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="playerDialog" role="dialog" aria-modal="true" aria-label={"Reproductor " + selected.name}>
            <div className="playerHeader"><div><span className="playerBrandDot">N</span><span>NOIR VAULT <i>/</i> OPEN CINEMA</span></div><button onClick={() => setSelected(null)} aria-label="Cerrar reproductor">×</button></div>
            <div className="videoStage">
              {activeVideoUrl ? (
                <video ref={videoRef} key={selected.id + "-" + sourceIndex + "-" + selectedAudioIndex} controls autoPlay playsInline preload="metadata" poster={selected.posterUrl || undefined}
                  onLoadedMetadata={(event) => { if (resumeAt > 15) event.currentTarget.currentTime = resumeAt; }}
                  onTimeUpdate={(event) => { void saveProgress(event.currentTarget.currentTime); }}
                  onPause={(event) => { void saveProgress(event.currentTarget.currentTime, true); }}
                  onEnded={() => { void clearCompletedProgress(); }}
                  onLoadedData={() => setVideoState("ready")} onCanPlay={() => setVideoState("ready")} onPlaying={() => setVideoState("ready")} onWaiting={() => { if (videoRef.current && videoRef.current.readyState < 3) setVideoState("loading"); }} onError={handleVideoError}>
                  <source src={activeVideoUrl} type={activeVideoUrl.toLowerCase().includes(".mp4") ? "video/mp4" : "video/webm"} />
                  {(selected.subtitleTracks || []).map((track) => <track key={track.src} kind="subtitles" src={track.src} srcLang={track.language} label={track.label} default={Boolean(track.isDefault)} />)}
                  Tu navegador no puede reproducir este formato de vídeo.
                </video>
              ) : activeAudioUrl ? (
                <div className="audioStage">
                  <span className="audioStageMark">NV / AUDIO</span><strong>{selected.name}</strong><p>{selected.synopsis}</p>
                  <audio key={selected.id} controls autoPlay preload="metadata" onLoadedData={() => setVideoState("ready")} onCanPlay={() => setVideoState("ready")} onPlaying={() => setVideoState("ready")} onError={() => setVideoState("error")}>
                    <source src={activeAudioUrl} />
                    Tu navegador no puede reproducir este audio.
                  </audio>
                </div>
              ) : (
                <div className="readerStage">
                  <span>NOIR / DIGITAL READING</span><strong>{selected.name}</strong><p>{selected.synopsis}</p>
                  <a href={selected.readerUrl} target="_blank" rel="noreferrer">ABRIR LECTOR O CAPÍTULOS ↗</a>
                </div>
              )}
              {(activeVideoUrl || activeAudioUrl) && videoState === "loading" && <div className="videoLoading"><span className="loadingRing" /><strong>Preparando la reproducción</strong><small>Conectando con la fuente multimedia</small></div>}
              {(activeVideoUrl || activeAudioUrl) && videoState === "error" && <div className="videoError"><strong>No se pudo iniciar esta fuente.</strong><span>Comprueba tu conexión o abre la fuente original.</span><a href={selected.sourcePageUrl || activeAudioUrl || activeVideoUrl || selected.readerUrl} target="_blank" rel="noreferrer">ABRIR FUENTE ORIGINAL ↗</a><button onClick={() => { setSourceIndex(0); setVideoState("loading"); }}>VOLVER A INTENTAR</button></div>}
            </div>
            <div className="playerInfo">
              <div className="playerMeta"><span>{selected.year || "—"}</span><i>·</i><span>{selected.genre}</span><i>·</i><span>{selected.duration}</span>{selected.seasonNumber && selected.episodeNumber ? <><i>·</i><span>T{selected.seasonNumber} · E{selected.episodeNumber}</span></> : null}<span className="licenseTag">{selected.license || "DERECHOS POR VERIFICAR"}</span></div>
              <h2>{selected.name}</h2><p>{selected.synopsis}</p>
              {resumeAt > 15 && <p className="playerLanguageNote">Continuando desde {Math.floor(resumeAt / 60)}:{String(Math.floor(resumeAt % 60)).padStart(2, "0")}.</p>}
              {!viewerId && <p className="playerLanguageNote">Inicia sesión para guardar tu avance y continuar después desde Mi cuenta.</p>}
              {selected.videoUrl && <div className="playerLanguageControls">
                <label>PISTA DE AUDIO
                  <select value={String(selectedAudioIndex)} onChange={(event) => { setSelectedAudioIndex(Number(event.target.value)); setSourceIndex(0); setVideoState("loading"); }}>
                    <option value="0">{selected.audioLanguages?.includes("es-AR") ? "Audio original · Español rioplatense" : selected.audioLanguages?.some((language) => language.startsWith("es")) ? "Audio original · Español" : "Audio de la fuente (idioma por verificar)"}</option>
                    {(selected.audioTracks || []).map((track, index) => <option key={track.url} value={String(index + 1)}>{track.label} · {track.language.toUpperCase()}</option>)}
                  </select>
                </label>
                <div className="playerLanguageNote">{selected.audioLanguages?.includes("es-AR") ? "Audio latino original (rioplatense); no es doblaje." : selected.hasLatinSpanish ? "Audio latino verificado" : selected.audioLanguages?.some((language) => language.startsWith("es")) ? "Audio en español disponible" : "No hay una pista de español verificada para este título."}</div>
                {(selected.subtitleTracks || []).length > 0 && <span className="subtitleAvailable">Subtítulos disponibles: {(selected.subtitleTracks || []).map((track) => track.label).join(", ")}</span>}
              </div>}
              {selected.audioUrl && <p className="playerLanguageNote">Audio disponible · {(selected.audioLanguages || []).join(", ") || "idioma por confirmar"}</p>}
              {selected.readerUrl && <p className="playerLanguageNote"><a href={selected.readerUrl} target="_blank" rel="noreferrer">ABRIR LECTOR AUTORIZADO ↗</a>{selected.chapterCount ? " · " + selected.chapterCount + " capítulos registrados" : ""}</p>}
              <div className="attributionBlock"><strong>CRÉDITOS Y LICENCIA</strong><span>{selected.creator} · {selected.credit}</span><span>{selected.license} · Consulta las condiciones de atribución.</span><a href={licenseUrl(selected.license)} target="_blank" rel="noreferrer">LEER LICENCIA ↗</a>{selected.sourcePageUrl && <a href={selected.sourcePageUrl} target="_blank" rel="noreferrer">ARCHIVO Y FUENTE ↗</a>}</div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
