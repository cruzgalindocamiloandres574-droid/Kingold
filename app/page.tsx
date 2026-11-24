"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Film = {
  id: string; name: string; genre: string; year: number; duration: string;
  synopsis: string; posterUrl: string; videoUrl?: string; fallbackVideoUrl?: string;
  creator: string; license: string; credit: string; sourcePageUrl?: string;
  status: "available" | "soon";
};

const commons = "https://upload.wikimedia.org/wikipedia/commons";
const transcoded = (folder: string, file: string, rendition: string) =>
  commons + "/transcoded/" + folder + "/" + file + "/" + file + "." + rendition;

const initialFilms: Film[] = [
  {
    id: "big-buck-bunny", name: "BIG BUCK BUNNY", genre: "Animación", year: 2008, duration: "10 min 35 s",
    synopsis: "Un conejo gigante y tranquilo decide enfrentarse a tres roedores que alteran la paz del bosque.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Big_Buck_Bunny_4K.webm/1280px--Big_Buck_Bunny_4K.webm.jpg",
    videoUrl: transcoded("c/c0", "Big_Buck_Bunny_4K.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("c/c0", "Big_Buck_Bunny_4K.webm", "360p.mp4"),
    creator: "Blender Foundation", license: "CC BY 3.0",
    credit: "© copyright Blender Foundation | www.bigbuckbunny.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Big_Buck_Bunny_4K.webm", status: "available",
  },
  {
    id: "sintel", name: "SINTEL", genre: "Fantasía", year: 2010, duration: "14 min 48 s",
    synopsis: "Una joven atraviesa tierras heladas en busca del pequeño dragón que perdió.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sintel_poster.jpg",
    videoUrl: transcoded("f/f1", "Sintel_movie_4K.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("f/f1", "Sintel_movie_4K.webm", "360p.mp4"),
    creator: "Durian Open Movie Project / Blender Foundation", license: "CC BY 3.0",
    credit: "© copyright Blender Foundation | www.sintel.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Sintel_movie_4K.webm", status: "available",
  },
  {
    id: "tears-of-steel", name: "TEARS OF STEEL", genre: "Ciencia ficción", year: 2012, duration: "12 min 14 s",
    synopsis: "En un futuro devastado, un grupo intenta salvar a la humanidad de una amenaza tecnológica.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/7/70/Tos-poster.png",
    videoUrl: transcoded("c/cb", "Tears_of_Steel_1080p.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("c/cb", "Tears_of_Steel_1080p.webm", "360p.mp4"),
    creator: "Blender Foundation", license: "CC BY 3.0",
    credit: "(CC) Blender Foundation | mango.blender.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Tears_of_Steel_1080p.webm", status: "available",
  },
  {
    id: "elephants-dream", name: "ELEPHANTS DREAM", genre: "Ciencia ficción", year: 2006, duration: "10 min 58 s",
    synopsis: "Dos viajeros exploran una máquina gigantesca y misteriosa que parece tener vida propia.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Elephants_Dream_%282006%29.webm/1280px--Elephants_Dream_%282006%29.webm.jpg",
    videoUrl: transcoded("a/a2", "Elephants_Dream_%282006%29.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("a/a2", "Elephants_Dream_%282006%29.webm", "360p.mp4"),
    creator: "Orange Open Movie Team / Blender Foundation", license: "CC BY 2.5",
    credit: "© copyright 2006, Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Elephants_Dream_(2006).webm", status: "available",
  },
  {
    id: "cosmos-laundromat", name: "COSMOS LAUNDROMAT", genre: "Ciencia ficción", year: 2015, duration: "12 min 11 s",
    synopsis: "En una isla desolada, una oveja conoce a un vendedor extravagante que le ofrece una oportunidad imposible.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm/1280px--Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm.jpg",
    videoUrl: transcoded("3/36", "Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("3/36", "Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm", "360p.mp4"),
    creator: "Blender Foundation", license: "CC BY-SA 3.0",
    credit: "Blender Foundation | gooseberry.blender.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm", status: "available",
  },
  {
    id: "spring", name: "SPRING", genre: "Fantasía", year: 2019, duration: "7 min 44 s",
    synopsis: "Una pastora y su perro se enfrentan a antiguos espíritus para mantener el ciclo de la vida.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Spring_-_Blender_Open_Movie.webm/1280px--Spring_-_Blender_Open_Movie.webm.jpg",
    videoUrl: transcoded("a/a5", "Spring_-_Blender_Open_Movie.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("a/a5", "Spring_-_Blender_Open_Movie.webm", "360p.mp4"),
    creator: "Blender Animation Studio", license: "CC BY 4.0",
    credit: "Blender Foundation | blender.org/press/spring-open-movie",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Spring_-_Blender_Open_Movie.webm", status: "available",
  },
  {
    id: "sprite-fright", name: "SPRITE FRIGHT", genre: "Aventura", year: 2021, duration: "10 min 30 s",
    synopsis: "Un grupo de adolescentes descubre criaturas del bosque que esconden una fuerza inesperada.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm/1280px--Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm.jpg",
    videoUrl: transcoded("7/74", "Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("7/74", "Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm", "360p.mp4"),
    creator: "Blender Studio", license: "CC BY 4.0",
    credit: "Blender Foundation | studio.blender.org",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Sprite_Fright_-_Open_Movie_by_Blender_Studio.webm", status: "available",
  },
  {
    id: "coffee-run", name: "COFFEE RUN", genre: "Animación", year: 2020, duration: "3 min 05 s",
    synopsis: "Un recorrido veloz y colorido acompaña a una joven a través de recuerdos y emociones.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Coffee_Run_-_Blender_Open_Movie-full_movie.webm/1280px--Coffee_Run_-_Blender_Open_Movie-full_movie.webm.jpg",
    videoUrl: transcoded("3/3f", "Coffee_Run_-_Blender_Open_Movie-full_movie.webm", "720p.vp9.webm"),
    fallbackVideoUrl: transcoded("3/3f", "Coffee_Run_-_Blender_Open_Movie-full_movie.webm", "360p.mp4"),
    creator: "Blender Foundation", license: "CC BY 4.0", credit: "Blender Foundation",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Coffee_Run_-_Blender_Open_Movie-full_movie.webm", status: "available",
  },
  {
    id: "glass-half", name: "GLASS HALF", genre: "Comedia", year: 2015, duration: "3 min 13 s",
    synopsis: "Una comedia animada sobre el arte, las opiniones y las discusiones que nunca terminan.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Glass_Half_-_Blender_Open_Movie-full_movie.webm/1280px--Glass_Half_-_Blender_Open_Movie-full_movie.webm.jpg",
    videoUrl: commons + "/0/02/Glass_Half_-_Blender_Open_Movie-full_movie.webm",
    creator: "Blender Foundation", license: "CC BY 4.0", credit: "Blender Foundation",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Glass_Half_-_Blender_Open_Movie-full_movie.webm", status: "available",
  },
  {
    id: "caminandes", name: "CAMINANDES: GRAN DILLAMA", genre: "Animación", year: 2013, duration: "2 min 26 s",
    synopsis: "Koro, una llama obstinada, intenta conseguir una baya en la Patagonia.",
    posterUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm/1280px--Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm.jpg",
    videoUrl: commons + "/7/7c/Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm",
    creator: "Blender Institute", license: "CC BY-SA 3.0", credit: "(CC) caminandes.com",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Caminandes_-_Gran_Dillama_-_Blender_Foundation%27s_new_Open_Movie.webm", status: "available",
  },
  {
    id: "agent-327", name: "AGENT 327", genre: "Comedia", year: 2017, duration: "En preparación",
    synopsis: "Un agente secreto se infiltra en una barbería en una misión que se sale de control.",
    posterUrl: "", creator: "Blender Foundation", license: "Pendiente de verificar fuente completa",
    credit: "La versión disponible públicamente es un teaser; reproducción completa deshabilitada.", status: "soon",
  },
];

function licenseUrl(license: string) {
  const version = license.includes("4.0") ? "4.0" : license.includes("2.5") ? "2.5" : "3.0";
  return license.includes("SA")
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
  const [catalogFilms, setCatalogFilms] = useState<Film[]>(initialFilms);
  const [genre, setGenre] = useState("Todo");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Film | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [videoState, setVideoState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    let active = true;

    supabase.from("movies")
      .select("id,title,synopsis,genre,release_year,duration,poster_url,art,video_url,fallback_video_url,creator,license,credit,status")
      .eq("published", true)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return;
        const databaseFilms: Film[] = data.map((movie) => ({
          id: movie.id, name: movie.title, genre: movie.genre || "Cine",
          year: movie.release_year || 0, duration: movie.duration || "—",
          synopsis: movie.synopsis || "", posterUrl: movie.poster_url || "",
          videoUrl: movie.video_url || undefined, fallbackVideoUrl: movie.fallback_video_url || undefined,
          creator: movie.creator || "Autoría por confirmar", license: movie.license || "Licencia por confirmar",
          credit: movie.credit || "", sourcePageUrl: undefined,
          status: movie.status === "available" && movie.video_url ? "available" : "soon",
        }));
        setCatalogFilms(databaseFilms);
      })
      .catch(() => undefined);

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const genres = useMemo(
    () => ["Todo", ...Array.from(new Set(catalogFilms.map((film) => film.genre))).sort()],
    [catalogFilms],
  );

  const visibleFilms = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("es");
    return catalogFilms.filter((film) => {
      const matchesGenre = genre === "Todo" || film.genre === genre;
      const matchesText = !search || (film.name + " " + film.synopsis + " " + film.genre).toLocaleLowerCase("es").includes(search);
      return matchesGenre && matchesText;
    });
  }, [catalogFilms, genre, query]);

  const availableCount = catalogFilms.filter((film) => film.status === "available" && film.videoUrl).length;
  const featured = catalogFilms.find((film) => film.status === "available" && film.videoUrl) || initialFilms[0];

  function openFilm(film: Film) {
    if (film.status !== "available" || !film.videoUrl) return;
    setSourceIndex(0);
    setVideoState("loading");
    setSelected(film);
  }

  function handleVideoError() {
    if (selected?.fallbackVideoUrl && sourceIndex === 0) {
      setSourceIndex(1);
      setVideoState("loading");
      return;
    }
    setVideoState("error");
  }

  const activeVideoUrl = selected
    ? sourceIndex === 1 && selected.fallbackVideoUrl ? selected.fallbackVideoUrl : selected.videoUrl
    : undefined;

  return (
    <main className="noirSite">
      <header className="siteHeader">
        <Brand />
        <nav aria-label="Navegación principal">
          <a href="#catalogo">Cartelera</a><a href="#colecciones">Colecciones</a><a href="#planes">Membresía</a>
        </nav>
        <div className="headerActions"><a className="headerLogin" href="/login">Entrar</a><a className="headerJoin" href="/registro">Unirme <span>↗</span></a></div>
      </header>

      <section className="heroSection">
        <div className="heroBackdropImage"><img src={featured.posterUrl || initialFilms[1].posterUrl} alt="" /></div>
        <div className="heroShade" />
        <div className="heroContent">
          <div className="heroKicker"><span className="goldDot" /> UNA EXPERIENCIA DE CINE INDEPENDIENTE</div>
          <div className="heroEyebrow">NOIR VAULT ORIGINAL SELECTION</div>
          <h1>El cine merece<br /><em>otra mirada.</em></h1>
          <p>Una selección de historias extraordinarias, animación de autor y mundos que se quedan contigo.</p>
          <div className="heroButtons">
            <button className="buttonPrimary" onClick={() => openFilm(featured)}><span className="buttonPlay">▶</span> VER DESTACADO</button>
            <a className="buttonGhost" href="#catalogo">EXPLORAR CARTELERA <span>↓</span></a>
          </div>
          <div className="heroStats"><span><strong>{availableCount.toString().padStart(2, "0")}</strong> PELÍCULAS DISPONIBLES</span><i /><span>OBRAS CON LICENCIA ABIERTA</span></div>
        </div>
        <div className="heroSideNote"><span>NV / 001</span><span>CURATED FOR THE CURIOUS</span></div>
      </section>

      <div className="trustStrip"><span>NOIR VAULT</span><i>✳</i><span>OPEN CINEMA</span><i>✳</i><span>IMÁGENES Y CRÉDITOS DE AUTOR</span><i>✳</i><span>UNA BIBLIOTECA EN CRECIMIENTO</span></div>

      <section id="catalogo" className="catalogSection">
        <div className="contentWrap">
          <div className="sectionIntro">
            <div><div className="sectionOverline">LA CARTELERA</div><h2>Encuentra tu próxima <em>historia.</em></h2><p>Películas y cortometrajes seleccionados para descubrir algo diferente.</p></div>
            <div className="catalogCounter"><strong>{String(catalogFilms.length).padStart(2, "0")}</strong><span>TÍTULOS<br />EN CATÁLOGO</span></div>
          </div>

          <div className="catalogToolbar">
            <label className="catalogSearch">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar película, género o historia..." aria-label="Buscar en la cartelera" />
              {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}>×</button>}
            </label>
            <div className="genreChips" aria-label="Filtrar por género">
              {genres.map((item) => <button key={item} className={genre === item ? "active" : ""} onClick={() => setGenre(item)}>{item}</button>)}
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
                  {film.status === "available" ? <span className="posterPlay"><span>▶</span></span> : <span className="soonPill">PRÓXIMAMENTE</span>}
                  <span className="posterBottom"><span className="posterGenre">{film.genre} <i>·</i> {film.year}</span><strong>{film.name}</strong><small>{film.duration}</small></span>
                </span>
                <span className="filmCaption"><strong>{film.name}</strong><small>{film.year} <i>·</i> {film.genre} <i>·</i> {film.duration}</small></span>
              </button>
            ))}
          </div>
          {visibleFilms.length === 0 && <div className="noResults"><strong>No encontramos esa película.</strong><span>Prueba con otro título o género.</span></div>}
          <p className="catalogFootnote">La selección reproducible incluye obras publicadas bajo licencias Creative Commons. Cada ficha muestra su autoría y licencia. Los títulos sin fuente completa autorizada permanecen deshabilitados.</p>
        </div>
      </section>

      <section id="colecciones" className="collectionsSection">
        <div className="contentWrap collectionsLayout">
          <div className="collectionsCopy"><div className="sectionOverline">DOS UNIVERSOS</div><h2>Una biblioteca.<br /><em>Mil maneras de sentir.</em></h2><p>Explora cortometrajes de autor y proyectos de animación que abrieron nuevas posibilidades para el cine digital.</p></div>
          <div className="collectionCards">
            <a className="collectionCard collectionOpen" href="#catalogo"><span>01 / OPEN CINEMA</span><strong>Obras abiertas<br /><em>para descubrir.</em></strong><small>VER LA CARTELERA <b>↗</b></small></a>
            <div className="collectionCard collectionPremiere"><span>02 / NOIR PREMIERE</span><strong>Grandes historias.<br /><em>Próximamente.</em></strong><small>CATÁLOGO COMERCIAL CON LICENCIA</small></div>
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
        <small>Los cobros de membresía requieren completar las credenciales privadas y las pruebas de Stripe antes de habilitar pagos reales.</small>
      </section>

      <footer className="siteFooter">
        <Brand footer />
        <div className="footerLinks"><a href="#catalogo">Cartelera</a><a href="/cuenta">Mi cuenta</a><a href="/registro">Crear cuenta</a></div>
        <span>© 2026 NOIR VAULT · THE CINEMA CLUB</span>
      </footer>

      {selected && activeVideoUrl && (
        <div className="playerOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="playerDialog" role="dialog" aria-modal="true" aria-label={"Reproductor " + selected.name}>
            <div className="playerHeader"><div><span className="playerBrandDot">N</span><span>NOIR VAULT <i>/</i> OPEN CINEMA</span></div><button onClick={() => setSelected(null)} aria-label="Cerrar reproductor">×</button></div>
            <div className="videoStage">
              <video key={selected.id + "-" + sourceIndex} controls autoPlay playsInline preload="metadata" poster={selected.posterUrl || undefined}
                onLoadedData={() => setVideoState("ready")} onCanPlay={() => setVideoState("ready")} onError={handleVideoError}>
                <source src={activeVideoUrl} type={activeVideoUrl.toLowerCase().includes(".mp4") ? "video/mp4" : "video/webm"} />
                Tu navegador no puede reproducir este formato de vídeo.
              </video>
              {videoState === "loading" && <div className="videoLoading"><span className="loadingRing" /><strong>Preparando la reproducción</strong><small>Conectando con la fuente de vídeo</small></div>}
              {videoState === "error" && <div className="videoError"><strong>No se pudo iniciar esta fuente.</strong><span>Comprueba tu conexión o abre la fuente original desde su archivo público.</span><a href={selected.sourcePageUrl || activeVideoUrl} target="_blank" rel="noreferrer">ABRIR FUENTE DE LA PELÍCULA ↗</a><button onClick={() => { setSourceIndex(0); setVideoState("loading"); }}>VOLVER A INTENTAR</button></div>}
            </div>
            <div className="playerInfo">
              <div className="playerMeta"><span>{selected.year}</span><i>·</i><span>{selected.genre}</span><i>·</i><span>{selected.duration}</span><span className="licenseTag">LICENCIA ABIERTA</span></div>
              <h2>{selected.name}</h2><p>{selected.synopsis}</p>
              <div className="attributionBlock"><strong>CRÉDITOS Y LICENCIA</strong><span>{selected.creator} · {selected.credit}</span><span>{selected.license} · Consulta las condiciones de atribución.</span><a href={licenseUrl(selected.license)} target="_blank" rel="noreferrer">LEER LICENCIA ↗</a>{selected.sourcePageUrl && <a href={selected.sourcePageUrl} target="_blank" rel="noreferrer">ARCHIVO Y FUENTE ↗</a>}</div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
