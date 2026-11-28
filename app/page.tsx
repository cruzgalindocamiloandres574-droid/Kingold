"use client";

import Image from "next/image";
import { SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";


type ContentType = "movie" | "series" | "anime" | "manga" | "podcast" | "documentary" | "audiobook" | "concert" | "short";
type AudioChapter = { title: string; startSeconds: number; endSeconds: number };

type Film = {
  id: string; name: string; genre: string; year: number; duration: string;
  synopsis: string; posterUrl: string; videoUrl?: string; fallbackVideoUrl?: string;
  audioUrl?: string; readerUrl?: string; externalEmbedUrl?: string; requiresPremium?: boolean; subtitleDownloadUrl?: string; subtitleNote?: string; subtitleCredit?: string; contentAdvisory?: string; ageGuidance?: string; contentType?: ContentType;
  seasonNumber?: number; episodeNumber?: number; seasonCount?: number; episodeCount?: number; chapterCount?: number;
  audioChapters?: AudioChapter[];
  creator: string; license: string; credit: string; sourcePageUrl?: string;
  audioTracks?: { label: string; language: string; url: string; verified?: boolean }[];
  subtitleTracks?: { label: string; language: string; src: string; isDefault?: boolean }[];
  audioLanguages?: string[];
  hasLatinSpanish?: boolean;
  silentFilm?: boolean;
  licensePageUrl?: string;
  status: "available" | "soon";
  availability?: "available" | "upcoming" | "pending";
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
    audioLanguages: ["es-AR"], hasLatinSpanish: false,
  },
  {
    id: "agent-327", name: "AGENT 327", genre: "Comedia", year: 2017, duration: "En preparación",
    synopsis: "Un agente secreto se infiltra en una barbería en una misión que se sale de control.",
    posterUrl: "", creator: "Blender Foundation", license: "Pendiente de verificar fuente completa",
    credit: "La versión disponible públicamente es un teaser; reproducción completa deshabilitada.", status: "soon",
  },
];

function licenseUrl(license: string) {
  // Public Domain Mark is a status label, not the CC0 dedication.
  const primaryLicense = license.split(/[;|]/)[0].trim();
  if (/public\s+domain\s+mark|pdm\s*1\.0/i.test(primaryLicense)) {
    return "https://creativecommons.org/publicdomain/mark/1.0/";
  }
  if (/\bCC0\b/i.test(primaryLicense)) {
    return "https://creativecommons.org/publicdomain/zero/1.0/";
  }
  if (/public domain|dominio público/i.test(primaryLicense)) {
    return "https://www.cancilleria.gov.co/normograma/compilacion/docs/ley_0023_1982.htm";
  }
  const versionMatch = primaryLicense.match(/\b(1\.0|2\.0|2\.5|3\.0|4\.0)\b/);
  if (!versionMatch) return "https://creativecommons.org/share-your-work/cclicenses/";
  const version = versionMatch[1];
  const licenseFamily = /BY-SA|Attribution-ShareAlike/i.test(primaryLicense) ? "by-sa" : "by";
  const jurisdiction = version === "3.0" && /\bUnited States\b|\bUS\b/i.test(primaryLicense) ? "us/" : "";
  return "https://creativecommons.org/licenses/" + licenseFamily + "/" + version + "/" + jurisdiction;
}

function videoMimeType(url: string) {
  // Some Commons mobile fallbacks use an MPEG-4 QuickTime (.mov) wrapper.
  // Do not pre-declare video/quicktime: Chromium on Android may reject that
  // MIME before trying the actual media bytes. Let the browser inspect it.
  const pathname = url.split(/[?#]/, 1)[0].toLowerCase();
  if (pathname.endsWith(".mp4")) return "video/mp4";
  if (pathname.endsWith(".mov")) return undefined;
  if (pathname.endsWith(".ogg") || pathname.endsWith(".ogv")) return "video/ogg";
  if (pathname.endsWith(".webm")) return "video/webm";
  return undefined;
}

function audioMimeType(url: string) {
  const pathname = url.split(/[?#]/, 1)[0].toLowerCase();
  if (pathname.endsWith(".m4b") || pathname.endsWith(".m4a") || pathname.endsWith(".mp4")) return "audio/mp4";
  if (pathname.endsWith(".mp3")) return "audio/mpeg";
  if (pathname.endsWith(".ogg") || pathname.endsWith(".opus")) return "audio/ogg";
  if (pathname.endsWith(".wav")) return "audio/wav";
  return undefined;
}

function parseAudioChapters(metadata: unknown): AudioChapter[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).audio_chapters;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const chapter = item as Record<string, unknown>;
    const title = typeof chapter.title === "string" ? chapter.title.trim() : "";
    const startSeconds = Number(chapter.start_seconds);
    const endSeconds = Number(chapter.end_seconds);
    if (!title || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0 || endSeconds <= startSeconds) return [];
    return [{ title, startSeconds, endSeconds }];
  });
}

function hasPlayableExternalEmbed(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return false;
  const url = (metadata as Record<string, unknown>).external_embed_url;
  return typeof url === "string" && /^https:\/\//i.test(url.trim());
}

function formatAudioTimestamp(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
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
  const [pendingWatchTrackIndex, setPendingWatchTrackIndex] = useState(0);
  const openFilmRequestRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioTrackIndexRef = useRef(0);
  const lastProgressRef = useRef<{ movieId: string; seconds: number; trackIndex: number }>({ movieId: "", seconds: 0, trackIndex: 0 });
  const pendingProgressRef = useRef<{ userId: string; movieId: string; seconds: number; trackIndex: number } | null>(null);
  const progressFlushRef = useRef<Promise<void> | null>(null);
  const completedProgressMoviesRef = useRef<Set<string>>(new Set());
  const [catalogFilms, setCatalogFilms] = useState<Film[]>([]);
  const [genre, setGenre] = useState("Todo");
  const [contentType, setContentType] = useState<ContentType | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Film | null>(null);
  const [contentConsentId, setContentConsentId] = useState<string | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [activeAudioChapterIndex, setActiveAudioChapterIndex] = useState(0);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(-1);
  const [audioFilter, setAudioFilter] = useState<"all" | "latin" | "spanish">("all");
  const [playbackFilter, setPlaybackFilter] = useState<"all" | "internal" | "external" | "soon" | "pending">("all");
  const [featureOnly, setFeatureOnly] = useState(false);
  const [internalTotal, setInternalTotal] = useState(0);
  const [externalTotal, setExternalTotal] = useState(0);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [videoState, setVideoState] = useState<"loading" | "ready" | "error">("loading");
  const [videoAttempt, setVideoAttempt] = useState(0);
  const [videoDiagnostic, setVideoDiagnostic] = useState<{ code: number; message: string; source: string } | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogAvailableTotal, setCatalogAvailableTotal] = useState(0);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const openFilm = useCallback(async (film: Film, requestedTrackIndex = 0) => {
    if ((film.status !== "available" && !film.readerUrl) || (!film.videoUrl && !film.fallbackVideoUrl && !film.audioUrl && !film.audioTracks?.length && !film.readerUrl && !film.externalEmbedUrl)) return;
    // A late progress response must never seek a different title after the
    // viewer has opened another item or closed the player.
    const requestId = ++openFilmRequestRef.current;
    const hasMultipleAudioTracks = !film.videoUrl && (film.audioTracks?.length ?? 0) > 1;
    const initialTrackIndex = hasMultipleAudioTracks
      ? Math.max(0, Math.min(film.audioTracks!.length - 1, Math.floor(requestedTrackIndex) || 0))
      : 0;
    activeAudioTrackIndexRef.current = initialTrackIndex;
    setSourceIndex(0);
    setSelectedAudioIndex(initialTrackIndex);
    setActiveAudioChapterIndex(0);
    setSelectedSubtitleIndex(film.subtitleTracks?.findIndex((track) => track.isDefault) ?? -1);
    setResumeAt(0);
    completedProgressMoviesRef.current.delete(film.id);
    lastProgressRef.current = { movieId: film.id, seconds: 0, trackIndex: initialTrackIndex };
    setVideoState("loading");
    setVideoDiagnostic(null);
    setVideoAttempt(0);
    setContentConsentId(null);
    setSelected(film);
    const supportsProgress = Boolean(film.videoUrl || film.fallbackVideoUrl || film.audioUrl || film.audioTracks?.length);
    if (!supabase || !supportsProgress) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (requestId !== openFilmRequestRef.current) return;
      setViewerId(user?.id ?? null);
      if (!user) return;
      const { data, error } = await supabase
        .from("watch_progress")
        .select("seconds_watched,track_index")
        .eq("user_id", user.id)
        .eq("movie_id", film.id)
        .maybeSingle();
      if (requestId !== openFilmRequestRef.current || error) return;
      const savedSeconds = Number(data?.seconds_watched || 0);
      const storedTrackIndex = data?.track_index == null ? initialTrackIndex : Number(data.track_index);
      const savedTrackIndex = hasMultipleAudioTracks
        ? Math.max(0, Math.min(film.audioTracks!.length - 1, Number.isInteger(storedTrackIndex) ? storedTrackIndex : 0))
        : 0;
      activeAudioTrackIndexRef.current = savedTrackIndex;
      setSelectedAudioIndex(savedTrackIndex);
      lastProgressRef.current = {
        movieId: film.id,
        seconds: Math.max(0, Math.floor(savedSeconds)),
        trackIndex: savedTrackIndex,
      };
      if (savedSeconds > 15) setResumeAt(savedSeconds);
    } catch {
      // Playback remains available even when the progress service is offline.
    }
  }, [supabase]);

  const closePlayer = useCallback(() => {
    openFilmRequestRef.current += 1;
    setSelected(null);
    setResumeAt(0);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setViewerId(user?.id ?? null);
    });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (resumeAt <= 15) return;
    const video = videoRef.current;
    if (video && video.readyState >= 1 && Math.abs(video.currentTime - resumeAt) > 2) {
      video.currentTime = resumeAt;
    }
    const audio = audioRef.current;
    if (audio && audio.readyState >= 1 && Math.abs(audio.currentTime - resumeAt) > 2) {
      audio.currentTime = resumeAt;
    }
  }, [resumeAt, selected?.id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const watchId = searchParams.get("watch");
    const requestedTrackIndex = Number(searchParams.get("track") || 0);
    if (watchId) {
      setPendingWatchId(watchId);
      setPendingWatchTrackIndex(Number.isInteger(requestedTrackIndex) && requestedTrackIndex >= 0 ? requestedTrackIndex : 0);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(catalogPage) });
    if (contentType !== "all") params.set("type", contentType);
    if (query.trim()) params.set("q", query.trim());
    if (genre !== "Todo") params.set("genre", genre);
    if (audioFilter !== "all") params.set("audio", audioFilter);
    if (playbackFilter !== "all") params.set("playback", playbackFilter);
    if (featureOnly && contentType === "movie") params.set("feature", "1");
    setCatalogLoading(true);
    setCatalogError(null);
    void fetch("/api/catalog?" + params.toString(), { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("catalog"); return response.json(); })
      .then((result) => {
        if (!active) return;
        const databaseFilms: Film[] = (result.results || []).map((movie: Record<string, unknown>) => ({
          id: String(movie.id), name: String(movie.title || "Sin título"), genre: String(movie.genre || "Cine"),
          requiresPremium: movie.requires_premium === true,
          year: Number(movie.release_year || 0), duration: movie.duration ? String(movie.duration) : movie.runtime_minutes ? String(movie.runtime_minutes) + " min" : "—",
          synopsis: String(movie.synopsis || ""), posterUrl: String(movie.poster_url || ""),
          videoUrl: movie.video_url ? String(movie.video_url) : undefined,
          fallbackVideoUrl: movie.fallback_video_url ? String(movie.fallback_video_url) : undefined,
          audioUrl: movie.audio_url ? String(movie.audio_url) : undefined,
          readerUrl: movie.reader_url ? String(movie.reader_url) : undefined,
          externalEmbedUrl: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).external_embed_url === "string"
            ? String((movie.content_metadata as Record<string, unknown>).external_embed_url)
            : undefined,
          licensePageUrl: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).license_url === "string"
            ? String((movie.content_metadata as Record<string, unknown>).license_url)
            : undefined,
          silentFilm: Boolean(movie.content_metadata && typeof movie.content_metadata === "object"
            && (movie.content_metadata as Record<string, unknown>).silent_film),
          subtitleDownloadUrl: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).spanish_subtitles_download === "string"
            ? String((movie.content_metadata as Record<string, unknown>).spanish_subtitles_download)
            : undefined,
          subtitleNote: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).subtitle_note === "string"
            ? String((movie.content_metadata as Record<string, unknown>).subtitle_note)
            : undefined,
          subtitleCredit: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).subtitle_credit === "string"
            ? String((movie.content_metadata as Record<string, unknown>).subtitle_credit)
            : undefined,
          contentAdvisory: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).content_advisory === "string"
            ? String((movie.content_metadata as Record<string, unknown>).content_advisory)
            : undefined,
          ageGuidance: movie.content_metadata && typeof movie.content_metadata === "object"
            && typeof (movie.content_metadata as Record<string, unknown>).age_guidance === "string"
            ? String((movie.content_metadata as Record<string, unknown>).age_guidance)
            : undefined,
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
          audioChapters: parseAudioChapters(movie.content_metadata),
          hasLatinSpanish: Boolean(movie.has_latin_spanish),
          status: movie.status === "available" && (movie.video_url || movie.fallback_video_url || movie.audio_url || movie.reader_url || hasPlayableExternalEmbed(movie.content_metadata) || (Array.isArray(movie.audio_tracks) && movie.audio_tracks.length > 0)) ? "available" : "soon",
          availability: movie.status === "available" && (movie.video_url || movie.fallback_video_url || movie.audio_url || movie.reader_url || hasPlayableExternalEmbed(movie.content_metadata) || (Array.isArray(movie.audio_tracks) && movie.audio_tracks.length > 0))
            ? "available"
            : movie.content_metadata && typeof movie.content_metadata === "object" && (movie.content_metadata as Record<string, unknown>).catalog_availability === "upcoming"
              ? "upcoming"
              : "pending",
        }));
        setCatalogError(null);
        setCatalogFilms(databaseFilms); setCatalogTotal(Number(result.total || 0)); setCatalogTotalPages(Number(result.totalPages || 1));
        setCatalogAvailableTotal(Number(result.availableTotal || 0));
        setInternalTotal(Number(result.internalTotal || 0));
        setExternalTotal(Number(result.externalTotal || 0));
        setUpcomingTotal(Number(result.upcomingTotal || 0));
        setPendingTotal(Number(result.pendingTotal || 0));
        setCatalogLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setCatalogError("No se pudo conectar con el catálogo en este momento. Revisa la conexión e inténtalo de nuevo.");
        setCatalogLoading(false);
        const canUseLocalFallback = catalogPage === 1 && !query.trim() && genre === "Todo" && contentType === "all" && audioFilter === "all" && playbackFilter === "all" && !featureOnly;
        setCatalogFilms(canUseLocalFallback ? initialFilms : []);
        if (canUseLocalFallback) {
          const availableFallback = initialFilms.filter((film) => film.status === "available");
          setCatalogTotal(initialFilms.length);
          setCatalogTotalPages(1);
          setCatalogAvailableTotal(availableFallback.length);
          setInternalTotal(availableFallback.filter((film) => film.videoUrl || film.fallbackVideoUrl || film.audioUrl).length);
          setExternalTotal(availableFallback.filter((film) => !film.videoUrl && !film.fallbackVideoUrl && !film.audioUrl && film.readerUrl).length);
          setUpcomingTotal(initialFilms.filter((film) => film.availability === "upcoming").length);
          setPendingTotal(initialFilms.filter((film) => film.status === "soon" && film.availability !== "upcoming").length);
        } else {
          setCatalogTotal(0);
          setCatalogTotalPages(1);
          setCatalogAvailableTotal(0);
          setInternalTotal(0);
          setExternalTotal(0);
          setUpcomingTotal(0);
          setPendingTotal(0);
        }
      });
    return () => { active = false; };
  }, [catalogPage, genre, query, audioFilter, contentType, playbackFilter, featureOnly]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selected) return;
    const syncSubtitleMode = () => {
      const tracks = video.textTracks;
      for (let index = 0; index < tracks.length; index += 1) {
        tracks[index].mode = index === selectedSubtitleIndex ? "showing" : "disabled";
      }
    };
    syncSubtitleMode();
    video.addEventListener("loadedmetadata", syncSubtitleMode);
    return () => video.removeEventListener("loadedmetadata", syncSubtitleMode);
  }, [selected, selectedSubtitleIndex, videoAttempt, selectedAudioIndex, sourceIndex]);

  useEffect(() => {
    if (!pendingWatchId) return;
    const film = catalogFilms.find((item) => item.id === pendingWatchId);
    if (!film) return;
    openFilm(film, pendingWatchTrackIndex);
    setPendingWatchId(null);
    setPendingWatchTrackIndex(0);
    const url = new URL(window.location.href);
    url.searchParams.delete("watch");
    url.searchParams.delete("track");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [pendingWatchId, pendingWatchTrackIndex, catalogFilms, openFilm]);

  useEffect(() => {
    if (resumeAt <= 0 || !videoRef.current || videoRef.current.readyState < 1) return;
    if (Math.abs(videoRef.current.currentTime - resumeAt) > 8) {
      videoRef.current.currentTime = resumeAt;
    }
  }, [resumeAt, selected]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closePlayer(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, closePlayer]);

  const genres = useMemo(
    () => ["Todo", ...Array.from(new Set([
      "Acción", "Aventura", "Animación", "Ciencia ficción", "Comedia", "Crimen",
      "Documental", "Drama", "Familia", "Fantasía", "Historia", "Terror",
      "Misterio", "Música", "Romance", "Suspense", "Bélica", "Western",
      ...catalogFilms.flatMap((film) => film.genre.split(",").map((value) => value.trim()).filter(Boolean)),
    ])).sort((a, b) => a.localeCompare(b, "es"))],
    [catalogFilms],
  );

  const visibleFilms = catalogLoading ? [] : catalogFilms;

  function changeCatalogFilter(value: string) { setGenre(value); setCatalogPage(1); }
  function changeContentType(value: ContentType | "all") { setContentType(value); setCatalogPage(1); setGenre("Todo"); }
  function changeCatalogSearch(value: string) { setQuery(value); setCatalogPage(1); }
  const featured = catalogFilms.find((film) => film.status === "available" && (film.videoUrl || film.fallbackVideoUrl)) || initialFilms[0];

  async function flushProgressQueue(db: NonNullable<typeof supabase>) {
    const activeFlush = progressFlushRef.current;
    if (activeFlush) {
      await activeFlush;
      if (pendingProgressRef.current) await flushProgressQueue(db);
      return;
    }

    const flush = (async () => {
      // Keep the newest position in the queue and drain it before resolving.
      while (pendingProgressRef.current) {
        const next = pendingProgressRef.current;
        pendingProgressRef.current = null;
        try {
          const { error } = await db.from("watch_progress").upsert({
            user_id: next.userId,
            movie_id: next.movieId,
            seconds_watched: next.seconds,
            track_index: next.trackIndex,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,movie_id" });

          if (error && !pendingProgressRef.current) {
            lastProgressRef.current = { movieId: "", seconds: 0, trackIndex: 0 };
          }
        } catch {
          if (!pendingProgressRef.current) lastProgressRef.current = { movieId: "", seconds: 0, trackIndex: 0 };
        }
      }
    })();

    progressFlushRef.current = flush;
    try {
      await flush;
    } finally {
      if (progressFlushRef.current === flush) progressFlushRef.current = null;
    }
    if (pendingProgressRef.current) await flushProgressQueue(db);
  }

  async function saveProgress(seconds: number, force = false, requestedTrackIndex = activeAudioTrackIndexRef.current) {
    const db = supabase;
    const userId = viewerId;
    const movie = selected;
    if (!db || !userId || !movie || completedProgressMoviesRef.current.has(movie.id)) return;
    const hasMultipleAudioTracks = !movie.videoUrl && (movie.audioTracks?.length ?? 0) > 1;
    const trackIndex = hasMultipleAudioTracks
      ? Math.max(0, Math.min(movie.audioTracks!.length - 1, Math.floor(requestedTrackIndex) || 0))
      : 0;
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    if (wholeSeconds < 5 && !(force && hasMultipleAudioTracks)) return;
    const previous = lastProgressRef.current;
    if (previous.movieId === movie.id && previous.trackIndex === trackIndex && !force &&
      wholeSeconds >= previous.seconds && wholeSeconds - previous.seconds < 15) return;

    lastProgressRef.current = { movieId: movie.id, seconds: wholeSeconds, trackIndex };
    pendingProgressRef.current = { userId, movieId: movie.id, seconds: wholeSeconds, trackIndex };
    await flushProgressQueue(db);
  }

  async function clearCompletedProgress() {
    const db = supabase;
    const userId = viewerId;
    const movie = selected;
    if (!db || !userId || !movie) return;

    // Block any late timeupdate/pause event for this completed title, drain
    // the final queued write, then delete its saved position.
    completedProgressMoviesRef.current.add(movie.id);
    if (pendingProgressRef.current?.movieId === movie.id) pendingProgressRef.current = null;
    await flushProgressQueue(db);
    await db.from("watch_progress").delete()
      .eq("user_id", userId).eq("movie_id", movie.id);
    lastProgressRef.current = { movieId: movie.id, seconds: 0, trackIndex: 0 };
  }

  function handleVideoError() {
    // Keep the last playable position when changing source after a network/codec error.
    const currentSeconds = videoRef.current?.currentTime ?? resumeAt;
    if (currentSeconds > 0) setResumeAt(currentSeconds);

    if (selectedAudioIndex > 0) {
      setSelectedAudioIndex(0);
      setSourceIndex(0);
      setVideoAttempt((attempt) => attempt + 1);
      setVideoState("loading");
      return;
    }
    if (selected?.videoUrl && selected.fallbackVideoUrl && sourceIndex === 0) {
      setSourceIndex(1);
      setVideoAttempt((attempt) => attempt + 1);
      setVideoState("loading");
      return;
    }
    const failedElement = videoRef.current;
    const mediaError = failedElement?.error;
    setVideoDiagnostic({
      code: mediaError?.code ?? 0,
      message: mediaError?.message || "El navegador no proporcionó más detalles.",
      source: failedElement?.currentSrc || (sourceIndex === 1 ? selected?.fallbackVideoUrl : selected?.videoUrl || selected?.fallbackVideoUrl) || "Fuente no identificada",
    });
    setVideoState("error");
  }

  function handleAudioError(event: SyntheticEvent<HTMLAudioElement>) {
    const failedElement = event.currentTarget;
    const mediaError = failedElement.error;
    setVideoDiagnostic({
      code: mediaError?.code ?? 0,
      message: mediaError?.message || "El navegador no proporcionó más detalles.",
      source: failedElement.currentSrc || activeAudioUrl || "Fuente de audio no identificada",
    });
    setVideoState("error");
  }

  const activeVideoUrl = selected
    ? selectedAudioIndex > 0 && selected.audioTracks?.[selectedAudioIndex - 1]?.url
      ? selected.audioTracks[selectedAudioIndex - 1].url
      : sourceIndex === 1 && selected.videoUrl && selected.fallbackVideoUrl
        ? selected.fallbackVideoUrl
        : selected.videoUrl || selected.fallbackVideoUrl
    : undefined;
  const activeAudioUrl = selected?.audioTracks?.[selectedAudioIndex]?.url || selected?.audioUrl;

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
        <div className="heroBackdropImage"><Image src={featured.posterUrl || initialFilms[1].posterUrl} alt="" fill priority unoptimized sizes="100vw" /></div>
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
          <div className="heroStats" aria-label="Estado del catálogo">
            <span><strong>{catalogLoading ? "…" : catalogAvailableTotal.toString().padStart(2, "0")}</strong> CON FUENTE</span>
            <i />
            <span><strong>{catalogLoading ? "…" : internalTotal.toString().padStart(2, "0")}</strong> MEDIOS EN NOIR</span>
            <i />
            <span><strong>{catalogLoading ? "…" : externalTotal.toString().padStart(2, "0")}</strong> ENLACES EXTERNOS</span>
          </div>
          <p className="heroStatsNote">Cifras globales de todos los formatos, no solo películas. “Medios en NOIR” son archivos de vídeo o audio integrados; los enlaces externos se abren en el proveedor y dependen de su disponibilidad.</p>
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
            <div className="catalogCounter"><strong>{catalogLoading ? "…" : catalogTotal.toLocaleString("es-CO")}</strong><span>TÍTULOS<br />EN CATÁLOGO</span></div>
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
            {contentType === "movie" && (
              <div className="playbackFilters" aria-label="Filtrar por duración de película">
                <span>DURACIÓN</span>
                <button className={featureOnly ? "active" : ""} aria-pressed={featureOnly} onClick={() => { setFeatureOnly((value) => !value); setCatalogPage(1); }}>LARGOMETRAJES · 60+ MIN</button>
              </div>
            )}
            <div className="playbackFilters" aria-label="Filtrar por tipo de reproducción">
              <span>TIPO DE ACCESO</span>
              <button className={playbackFilter === "all" ? "active" : ""} onClick={() => { setPlaybackFilter("all"); setCatalogPage(1); }}>TODOS</button>
              <button className={playbackFilter === "internal" ? "active" : ""} onClick={() => { setPlaybackFilter("internal"); setCatalogPage(1); }}>EN NOIR <small>{catalogLoading ? "—" : internalTotal}</small></button>
              <button className={playbackFilter === "external" ? "active" : ""} onClick={() => { setPlaybackFilter("external"); setCatalogPage(1); }}>FUENTES EXTERNAS <small>{catalogLoading ? "—" : externalTotal}</small></button>
              <button className={playbackFilter === "soon" ? "active" : ""} onClick={() => { setPlaybackFilter("soon"); setCatalogPage(1); }}>PRÓXIMAMENTE <small>{catalogLoading ? "—" : upcomingTotal}</small></button>
              <button className={playbackFilter === "pending" ? "active" : ""} onClick={() => { setPlaybackFilter("pending"); setCatalogPage(1); }}>SIN REPRODUCCIÓN <small>{catalogLoading ? "—" : pendingTotal}</small></button>
            </div>
          </div>

          {catalogError && <p className="catalogError" role="alert"><strong>CATÁLOGO SIN CONEXIÓN</strong> · {catalogError} Los títulos de respaldo solo se muestran cuando no hay filtros aplicados.</p>}
          <div className="filmGrid">
            {visibleFilms.map((film, index) => (
              <button key={film.id} className={film.status === "soon" ? "filmCard filmSoon" : "filmCard"}
                onClick={() => openFilm(film)} disabled={film.status !== "available" && !film.readerUrl}
                aria-label={(film.requiresPremium ? "NOIR PREMIUM · " : "") + (film.status === "available" ? "Abrir " + film.name : film.readerUrl ? "Consultar ficha oficial de " + film.name : film.name + ", próximamente")}>
                <span className="filmPoster">
                  <span className={`posterFallback posterFallback-${film.contentType || "movie"}`} aria-hidden="true">
                    <span className="posterFallbackOrb" />
                    <span className="posterFallbackGlyph">{film.name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase()}</span>
                    <span className="posterFallbackLabel">ARTE GRÁFICO DE CATÁLOGO</span>
                  </span>
                  {film.posterUrl && <Image className="posterImage" src={film.posterUrl} alt={"Póster de " + film.name} fill unoptimized sizes="(max-width: 680px) 50vw, 25vw" loading={index > 3 ? "lazy" : "eager"} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                  <span className="posterVignette" />
                  <span className="posterTop"><span>NOIR / OPEN CINEMA</span><span>{String(index + 1).padStart(2, "0")}</span></span>
                  {film.requiresPremium && <span className="premiumContentBadge">NOIR PREMIUM</span>}
                  {film.status === "available" ? (
                    <>
                      <span className={film.videoUrl || film.fallbackVideoUrl || film.audioUrl || film.externalEmbedUrl ? "sourceTypeBadge sourceTypeInternal" : "sourceTypeBadge sourceTypeExternal"}>
                        {film.videoUrl || film.fallbackVideoUrl || film.audioUrl ? "REPRODUCCIÓN EN NOIR" : film.externalEmbedUrl ? "EMBED OFICIAL EN NOIR" : film.contentType === "manga" ? "LECTOR OFICIAL EXTERNO" : "FUENTE OFICIAL EXTERNA"}
                      </span>
                      <span className="posterPlay"><span>{film.externalEmbedUrl ? "▶" : film.readerUrl ? (film.contentType === "manga" ? "LEER" : "↗") : "▶"}</span></span>
                    </>
                  ) : <span className="soonPill">{film.availability === "upcoming" ? (film.readerUrl ? "PRÓXIMAMENTE · VER FICHA ↗" : "PRÓXIMAMENTE") : "SIN REPRODUCCIÓN"}</span>}
                  <span className="posterBottom"><span className="posterGenre">{film.genre} <i>·</i> {film.year}</span><strong>{film.name}</strong><small>{film.seasonNumber && film.episodeNumber ? `T${film.seasonNumber} · E${film.episodeNumber} · ` : ""}{film.duration}{film.hasLatinSpanish ? " · AUDIO LATINO" : film.audioLanguages?.some((language) => language.startsWith("es")) ? " · AUDIO ESPAÑOL" : ""}</small></span>
                </span>
                <span className="filmCaption"><strong>{film.name}</strong><small>{film.year} <i>·</i> {film.genre} <i>·</i> {film.seasonNumber && film.episodeNumber ? `T${film.seasonNumber} E${film.episodeNumber} · ` : ""}{film.duration}</small></span>
              </button>
            ))}
          </div>
          {catalogTotalPages > 1 && <div className="catalogPagination"><button disabled={catalogPage <= 1} onClick={() => setCatalogPage((p) => Math.max(1,p-1))}>← ANTERIORES</button><span>PÁGINA {catalogPage} DE {catalogTotalPages}</span><button disabled={catalogPage >= catalogTotalPages} onClick={() => setCatalogPage((p) => Math.min(catalogTotalPages,p+1))}>SIGUIENTES →</button></div>}
          {catalogLoading && <div className="noResults" role="status"><strong>CARGANDO CATÁLOGO REAL…</strong><span>Consultando NOIR VAULT en Supabase.</span></div>}
          {visibleFilms.length === 0 && !catalogLoading && <div className="noResults"><strong>{query ? "No encontramos ese título." : "Esta sección está preparando su catálogo."}</strong><span>{query ? "Prueba con otro término de búsqueda." : "Publicaremos contenidos cuando la fuente, el permiso y el formato de reproducción o lectura estén verificados."}</span></div>}
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
        <a className="buttonPrimary membershipButton" href="/planes">VER MEMBRESÍA <span>↗</span></a>
        <small>Stripe está conectado en modo de prueba. NOIR VAULT aún no realiza cobros reales; el lanzamiento comercial está pendiente de validar el recorrido de pago y la biblioteca con licencias de distribución.</small>
      </section>

      <footer className="siteFooter">
        <Brand footer />
        <div className="footerLinks"><a href="#catalogo">Cartelera</a><a href="/cuenta">Mi cuenta</a><a href="/registro">Crear cuenta</a></div>
        <span>© 2026 NOIR VAULT · THE CINEMA CLUB</span>
      </footer>

      {selected && (activeVideoUrl || activeAudioUrl || selected.readerUrl) && (
        <div className="playerOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closePlayer(); }}>
          <section className="playerDialog" role="dialog" aria-modal="true" aria-label={"Reproductor " + selected.name}>
            <div className="playerHeader"><div><span className="playerBrandDot">N</span><span>NOIR VAULT <i>/</i> OPEN CINEMA</span></div><button onClick={() => closePlayer()} aria-label="Cerrar reproductor">×</button></div>
            <div className="videoStage">
              {activeVideoUrl ? (
                selected.contentAdvisory && contentConsentId !== selected.id ? (
                  <div className="contentWarning" role="note">
                    <span>AVISO DE CONTENIDO · {selected.ageGuidance || "CONTENIDO SENSIBLE"}</span>
                    <strong>Antes de reproducir</strong>
                    <p>{selected.contentAdvisory}</p>
                    <button type="button" onClick={() => { setContentConsentId(selected.id); setVideoState("loading"); }}>
                      ENTIENDO · CONTINUAR
                    </button>
                  </div>
                ) : (
                  <>
                <video ref={videoRef} key={selected.id + "-" + sourceIndex + "-" + selectedAudioIndex + "-" + videoAttempt} controls autoPlay playsInline preload="metadata" poster={selected.posterUrl || undefined}
                  onLoadedMetadata={(event) => { if (resumeAt > 15) event.currentTarget.currentTime = resumeAt; }}
                  onTimeUpdate={(event) => { void saveProgress(event.currentTarget.currentTime); }}
                  onPause={(event) => { void saveProgress(event.currentTarget.currentTime, true); }}
                  onEnded={() => { void clearCompletedProgress(); }}
                  onLoadedData={() => setVideoState("ready")} onCanPlay={() => setVideoState("ready")} onPlaying={() => setVideoState("ready")} onWaiting={() => { if (videoRef.current && videoRef.current.readyState < 3) setVideoState("loading"); }} onError={handleVideoError}>
                  <source src={activeVideoUrl} type={videoMimeType(activeVideoUrl)} />
                  {(selected.subtitleTracks || []).map((track, index) => (
                    <track
                      key={track.src}
                      kind="subtitles"
                      src={track.src}
                      srcLang={track.language}
                      label={track.label}
                      default={Boolean(track.isDefault)}
                      onLoad={(event) => {
                        event.currentTarget.track.mode = index === selectedSubtitleIndex ? "showing" : "disabled";
                      }}
                    />
                  ))}
                  Tu navegador no puede reproducir este formato de vídeo.
                </video>
                {(selected.subtitleTracks || []).length > 0 && (
                  <p className="playerLanguageNote">
                    {selected.subtitleNote || "Subtítulos disponibles en el idioma indicado por el selector del reproductor."}
                    {selected.subtitleCredit ? " · " + selected.subtitleCredit : ""}
                    {" · SUBTÍTULOS DISPONIBLES EN CONTROLES DEL REPRODUCTOR"}
                    {selected.subtitleDownloadUrl && <> · <a href={selected.subtitleDownloadUrl} target="_blank" rel="noreferrer">DESCARGAR SRT ↗</a></>}
                  </p>
                )}
                  </>
                )
              ) : activeAudioUrl ? (
                <div className="audioStage">
                  <span className="audioStageMark">NV / AUDIO</span><strong>{selected.name}</strong><p>{selected.synopsis}</p>
                  {(selected.audioTracks || []).length > 1 && (
                    <label className="audioChapterPicker">
                      <span>CAPÍTULO / PISTA ({selectedAudioIndex + 1} DE {selected.audioTracks?.length})</span>
                      <select value={String(selectedAudioIndex)} onChange={(event) => { const nextIndex = Number(event.target.value); activeAudioTrackIndexRef.current = nextIndex; setResumeAt(0); void saveProgress(0, true, nextIndex); setSelectedAudioIndex(nextIndex); setVideoState("loading"); }}>
                        {(selected.audioTracks || []).map((track, index) => (
                          <option key={track.url} value={String(index)}>{track.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <audio ref={audioRef} key={selected.id + "-" + selectedAudioIndex + "-" + videoAttempt} controls autoPlay preload="metadata"
                    onLoadedMetadata={(event) => { if (resumeAt > 15) event.currentTarget.currentTime = resumeAt; }}
                    onTimeUpdate={(event) => {
                      if (!selected.audioTracks?.length || selectedAudioIndex === activeAudioTrackIndexRef.current) {
                        const seconds = event.currentTarget.currentTime;
                        void saveProgress(seconds, false, selectedAudioIndex);
                        const chapterIndex = selected.audioChapters?.findIndex((chapter) =>
                          seconds >= chapter.startSeconds && seconds < chapter.endSeconds
                        ) ?? -1;
                        if (chapterIndex >= 0) setActiveAudioChapterIndex(chapterIndex);
                      }
                    }}
                    onPause={(event) => { if (!selected.audioTracks?.length || selectedAudioIndex === activeAudioTrackIndexRef.current) void saveProgress(event.currentTarget.currentTime, true, selectedAudioIndex); }}
                    onLoadedData={() => setVideoState("ready")} onCanPlay={() => setVideoState("ready")}
                    onPlaying={() => setVideoState("ready")} onError={handleAudioError}
                    onEnded={() => {
                      if (selected.audioTracks?.length && selectedAudioIndex < selected.audioTracks.length - 1) {
                        const nextIndex = selectedAudioIndex + 1;
                        activeAudioTrackIndexRef.current = nextIndex;
                        setResumeAt(0);
                        void saveProgress(0, true, nextIndex);
                        setSelectedAudioIndex(nextIndex);
                        setVideoState("loading");
                      } else {
                        void clearCompletedProgress();
                      }
                    }}>
                    <source src={activeAudioUrl} type={audioMimeType(activeAudioUrl)} />
                    Tu navegador no puede reproducir este audio.
                  </audio>
                  {(selected.audioTracks || []).length > 0 && <small className="audioTrackNote">Reproduciendo {selected.audioTracks?.[selectedAudioIndex]?.label || "audio disponible"} · selección automática del siguiente capítulo al terminar.</small>}
                  {selected.contentType === "audiobook" && activeAudioUrl.toLowerCase().split(/[?#]/, 1)[0].endsWith(".m4b") && (
                    <small className="audioTrackNote">
                      Audiolibro M4B con capítulos navegables dentro de NOIR VAULT. Selecciona un capítulo en la lista inferior; el avance se guarda por posición de escucha.
                     <a href={activeAudioUrl} target="_blank" rel="noreferrer">DESCARGAR M4B CON CAPÍTULOS ↗</a> · <a href="https://openaudiobooks.org/how-to-listen/" target="_blank" rel="noreferrer">GUÍA PARA ANDROID Y OTRAS APPS ↗</a></small>
                  )}
                  {selected.contentType === "podcast" && selected.audioUrl && selected.readerUrl && (
                    <small className="audioTrackNote">
                      Audio transmitido desde el archivo oficial de NASA. NOIR VAULT no aloja ni redistribuye el archivo.{" "}
                      <a href={selected.readerUrl} target="_blank" rel="noreferrer">VER FICHA OFICIAL ↗</a>
                    </small>
                  )}
                </div>
              ) : selected.externalEmbedUrl ? (
                <div className="externalVideoStage">
                  <iframe
                    key={selected.id + "-official-embed"}
                    src={selected.externalEmbedUrl}
                    title={selected.name + " · reproductor oficial"}
                    loading="eager"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  <div className="externalVideoFooter">
                    <span>REPRODUCTOR OFICIAL · El proveedor original controla la disponibilidad, las pistas y los anuncios.</span>
                    {selected.readerUrl && <a href={selected.readerUrl} target="_blank" rel="noreferrer">VER FUENTE OFICIAL ↗</a>}
                  </div>
                </div>
              ) : (
                <div className="readerStage">
                  <span>{selected.status === "soon" ? (selected.availability === "upcoming" ? "NOIR / PRÓXIMO ESTRENO" : "NOIR / FUENTE PENDIENTE") : selected.contentType === "manga" ? "NOIR / LECTURA OFICIAL" : selected.contentType === "podcast" ? "NOIR / ESCUCHA OFICIAL" : selected.contentType === "audiobook" ? "NOIR / AUDIOLIBRO EXTERNO" : "NOIR / FUENTE EXTERNA"}</span>
                  <strong>{selected.name}</strong><p>{selected.status === "soon" ? selected.synopsis + (selected.availability === "upcoming" ? " Este título todavía no está disponible para reproducirse." : " Todavía no tiene una fuente multimedia verificada.") : selected.synopsis}</p>
                  {selected.hasLatinSpanish && <small className="audioTrackNote">Audio en español latino disponible en el proveedor oficial. Selecciona esa pista allí; NOIR VAULT no controla el reproductor externo.</small>}
                  <a href={selected.readerUrl} target="_blank" rel="noreferrer">{selected.status === "soon" ? "CONSULTAR FICHA Y ESTRENO ↗" : selected.contentType === "manga" ? "ABRIR MANGA PLUS ↗" : selected.contentType === "podcast" ? "ESCUCHAR EN NASA ↗" : selected.contentType === "audiobook" ? "VER FICHA DEL AUDIOLIBRO ↗" : "ABRIR FUENTE OFICIAL ↗"}</a>
                  {selected.subtitleDownloadUrl && (
                    <>
                      <small className="readerSubtitleNote">El vídeo oficial se descarga en MKV y aún no se reproduce dentro de NOIR. Los subtítulos en español están disponibles como archivo SRT.</small>
                      <a href={selected.subtitleDownloadUrl} target="_blank" rel="noreferrer">DESCARGAR SUBTÍTULOS EN ESPAÑOL (SRT) ↗</a>
                    </>
                  )}
                </div>
              )}
              {(activeVideoUrl || activeAudioUrl) && videoState === "loading" && (!selected.contentAdvisory || contentConsentId === selected.id) && <div className="videoLoading"><span className="loadingRing" /><strong>Preparando la reproducción</strong><small>{sourceIndex === 1 ? "Usando una fuente alternativa de respaldo para el mismo contenido" : "Conectando con la fuente multimedia"}</small></div>}
              {(activeVideoUrl || activeAudioUrl) && videoState === "error" && (!selected.contentAdvisory || contentConsentId === selected.id) && <div className="videoError"><strong>No se pudo iniciar esta fuente.</strong><span>Comprueba tu conexión o abre la fuente original.</span><a href={selected.sourcePageUrl || activeAudioUrl || activeVideoUrl || selected.readerUrl} target="_blank" rel="noreferrer">ABRIR FUENTE ORIGINAL ↗</a><button onClick={() => { setVideoDiagnostic(null); setSourceIndex(0); setSelectedAudioIndex(0); setVideoAttempt((attempt) => attempt + 1); setVideoState("loading"); }}>VOLVER A INTENTAR</button>{videoDiagnostic && <details className="videoDiagnostics"><summary>DETALLES TÉCNICOS</summary><p>Código del navegador: {videoDiagnostic.code || "no disponible"} · {videoDiagnostic.code === 1 ? "Reproducción cancelada" : videoDiagnostic.code === 2 ? "Error de red" : videoDiagnostic.code === 3 ? "Error al decodificar el medio" : videoDiagnostic.code === 4 ? "Formato o códec no compatible" : "Error no identificado"}</p><p>Archivo: <code>{videoDiagnostic.source.split("/").pop()?.split("?")[0] || videoDiagnostic.source}</code></p>{videoDiagnostic.message !== "El navegador no proporcionó más detalles." && <p>{videoDiagnostic.message}</p>}</details>}</div>}
            </div>
            <div className="playerInfo">
              <div className="playerMeta"><span>{selected.year || "—"}</span><i>·</i><span>{selected.genre}</span><i>·</i><span>{selected.duration}</span>{selected.seasonNumber && selected.episodeNumber ? <><i>·</i><span>T{selected.seasonNumber} · E{selected.episodeNumber}</span></> : null}<span className="licenseTag">{selected.license || "DERECHOS POR VERIFICAR"}</span></div>
              <h2>{selected.name}</h2><p>{selected.synopsis}</p>
              {selected.contentType === "audiobook" && (selected.audioChapters || []).length > 0 && (
                <section className="audioChapterNavigation" aria-label="Navegación por capítulos">
                  <div className="audioChapterNavigationHeader">
                    <strong>CAPÍTULOS</strong>
                    <span>
                      {Math.min(activeAudioChapterIndex + 1, selected.audioChapters!.length)} / {selected.audioChapters!.length}
                      {" · "}{selected.audioChapters?.[activeAudioChapterIndex]?.title || "Selecciona un capítulo"}
                    </span>
                  </div>
                  <div className="audioChapterList" aria-label="Seleccionar capítulo">
                    {selected.audioChapters!.map((chapter, index) => (
                      <button
                        key={`${selected.id}-audio-chapter-${index}`}
                        type="button"
                        className={activeAudioChapterIndex === index ? "audioChapterButton audioChapterButtonActive" : "audioChapterButton"}
                        aria-current={activeAudioChapterIndex === index ? "true" : undefined}
                        aria-label={`Ir a ${chapter.title}, ${formatAudioTimestamp(chapter.startSeconds)}`}
                        onClick={() => {
                          const audio = audioRef.current;
                          if (!audio) return;
                          audio.currentTime = chapter.startSeconds;
                          setActiveAudioChapterIndex(index);
                          void audio.play().catch(() => undefined);
                        }}
                      >
                        <span className="audioChapterNumber">{String(index + 1).padStart(2, "0")}</span>
                        <span className="audioChapterTitle">{chapter.title}</span>
                        <span className="audioChapterStart">{formatAudioTimestamp(chapter.startSeconds)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {resumeAt > 15 && <p className="playerLanguageNote">{!selected.videoUrl && (selected.audioTracks?.length ?? 0) > 1 ? "Continuando en el capítulo " + (selectedAudioIndex + 1) + " desde " : "Continuando desde "}{Math.floor(resumeAt / 60)}:{String(Math.floor(resumeAt % 60)).padStart(2, "0")}.</p>}
              {!viewerId && <p className="playerLanguageNote">Inicia sesión para guardar tu avance y continuar después desde Mi cuenta.</p>}
              {(selected.videoUrl || selected.fallbackVideoUrl) && <div className="playerLanguageControls">
                {selected.silentFilm ? (
                  <div className="playerLanguageNote">PELÍCULA MUDA · Esta versión no contiene una pista de audio.</div>
                ) : (
                  <>
                    <label>PISTA DE AUDIO
                      <select value={String(selectedAudioIndex)} onChange={(event) => { setSelectedAudioIndex(Number(event.target.value)); setSourceIndex(0); setVideoState("loading"); }}>
                        <option value="0">{selected.audioLanguages?.includes("es-AR") ? "Audio original · Español rioplatense" : selected.audioLanguages?.some((language) => language.startsWith("es")) ? "Audio original · Español" : selected.audioLanguages?.[0] ? "Audio original · " + selected.audioLanguages[0].toUpperCase() : "Audio de la fuente (idioma por verificar)"}</option>
                        {(selected.audioTracks || []).map((track, index) => <option key={track.url} value={String(index + 1)}>{track.label} · {track.language.toUpperCase()}</option>)}
                      </select>
                    </label>
                    <div className="playerLanguageNote">{selected.audioLanguages?.includes("es-AR") ? "Audio latino original (rioplatense); no es doblaje." : selected.hasLatinSpanish ? "Audio latino verificado" : selected.audioLanguages?.some((language) => language.startsWith("es")) ? "Audio en español disponible" : "No hay una pista de español verificada para este título."}</div>
                  </>
                )}
                {(selected.subtitleTracks || []).length > 0 && (
                  <label>
                    SUBTÍTULOS
                    <select
                      value={String(selectedSubtitleIndex)}
                      onChange={(event) => setSelectedSubtitleIndex(Number(event.target.value))}
                      aria-label="Seleccionar pista de subtítulos"
                    >
                      <option value="-1">Desactivados</option>
                      {(selected.subtitleTracks || []).map((track, index) => (
                        <option key={track.src} value={String(index)}>{track.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>}
              {selected.videoUrl && selected.fallbackVideoUrl && (
                <div className="playerSourceSwitch">
                  <div>
                    <strong>{sourceIndex === 0 ? "¿EL VÍDEO TARDA O SE DETIENE?" : "ESTÁS USANDO LA FUENTE DE RESPALDO"}</strong>
                    <span>{sourceIndex === 0 ? "Prueba otra fuente de distribución si la principal no carga o se detiene." : "Puedes volver a la fuente principal cuando quieras."}</span>
                  </div>
                  <button type="button" onClick={() => {
                    const currentSeconds = videoRef.current?.currentTime ?? resumeAt;
                    if (currentSeconds > 0) setResumeAt(currentSeconds);
                    setSelectedAudioIndex(0);
                    setSourceIndex(sourceIndex === 0 ? 1 : 0);
                    setVideoAttempt((attempt) => attempt + 1);
                    setVideoState("loading");
                  }}>
                    {sourceIndex === 0 ? "PROBAR FUENTE ALTERNATIVA ↗" : "VOLVER A FUENTE PRINCIPAL ↗"}
                  </button>
                </div>
              )}
              {selected.audioUrl && <p className="playerLanguageNote">Audio disponible · {(selected.audioLanguages || []).join(", ") || "idioma por confirmar"}</p>}
              {selected.readerUrl && <p className="playerLanguageNote"><a href={selected.readerUrl} target="_blank" rel="noreferrer">{selected.contentType === "manga" ? "ABRIR LECTOR OFICIAL ↗" : selected.contentType === "podcast" ? "ABRIR PÁGINA DEL PODCAST ↗" : selected.contentType === "audiobook" ? "VER FICHA DEL AUDIOLIBRO ↗" : "VER PÁGINA OFICIAL ↗"}</a>{selected.chapterCount ? " · " + selected.chapterCount + " capítulos registrados" : ""}</p>}
              <div className="attributionBlock"><strong>CRÉDITOS Y LICENCIA</strong><span>{selected.creator} · {selected.credit}</span><span>{selected.license} · Consulta las condiciones de atribución.</span><a href={selected.licensePageUrl || licenseUrl(selected.license)} target="_blank" rel="noreferrer">LEER LICENCIA ↗</a>{selected.sourcePageUrl && <a href={selected.sourcePageUrl} target="_blank" rel="noreferrer">ARCHIVO Y FUENTE ↗</a>}</div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
