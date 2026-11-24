"use client";

import { useMemo, useState } from "react";

type Film = {
  id: number; name: string; genre: string; year: number; duration: string;
  synopsis: string; art: string; status: "available" | "soon";
  videoUrl?: string; creator?: string; license?: string; credit?: string;
};

const films: Film[] = [
  {
    id: 1, name: "BIG BUCK BUNNY", genre: "Animación", year: 2008, duration: "10 min",
    synopsis: "Un conejo gigante y tranquilo decide enfrentarse a tres roedores que alteran la paz del bosque.",
    art: "bunny", status: "available",
    videoUrl: "https://video.blender.org/static/webseed/bf1f3fb5-b119-4f9f-9930-8e20e892b898-720.mp4",
    creator: "Blender Foundation", license: "Creative Commons Atribución 3.0",
    credit: "© copyright 2008, Blender Foundation / www.bigbuckbunny.org"
  },
  {
    id: 2, name: "SINTEL", genre: "Fantasía", year: 2010, duration: "15 min",
    synopsis: "Una joven atraviesa tierras heladas en busca del pequeño dragón que perdió.",
    art: "sintel", status: "available",
    videoUrl: "https://video.blender.org/static/webseed/0eb052d0-fd51-43e6-aa33-ecdbf77a5d40-720.mp4",
    creator: "Blender Foundation", license: "Creative Commons Atribución 3.0",
    credit: "© copyright Blender Foundation / www.sintel.org"
  },
  {
    id: 3, name: "TEARS OF STEEL", genre: "Ciencia ficción", year: 2012, duration: "12 min",
    synopsis: "En un futuro devastado, un grupo intenta salvar a la humanidad de una amenaza tecnológica.",
    art: "steel", status: "available",
    videoUrl: "https://video.blender.org/static/webseed/8533ea43-4271-4a57-9694-e9d0b35e1aa1-720.mp4",
    creator: "Blender Foundation", license: "Creative Commons Atribución 3.0",
    credit: "(CC) Blender Foundation / mango.blender.org"
  },
  { id: 4, name: "SPRING", genre: "Fantasía", year: 2019, duration: "8 min", synopsis: "Una pastora y su perro se enfrentan a antiguos espíritus para mantener el ciclo de la vida.", art: "spring", status: "soon" },
  { id: 5, name: "SPRITE FRIGHT", genre: "Aventura", year: 2021, duration: "11 min", synopsis: "Un grupo de adolescentes descubre criaturas del bosque que esconden una fuerza inesperada.", art: "sprite", status: "soon" },
  { id: 6, name: "AGENT 327", genre: "Comedia", year: 2017, duration: "4 min", synopsis: "Un agente secreto se infiltra en una barbería en una misión que se sale de control.", art: "agent", status: "soon" },
  { id: 7, name: "COSMOS LAUNDROMAT", genre: "Ciencia ficción", year: 2015, duration: "12 min", synopsis: "Una oveja desesperada conoce a un extraño personaje que le ofrece una segunda oportunidad.", art: "cosmos", status: "soon" },
  { id: 8, name: "CAMINANDES", genre: "Animación", year: 2013, duration: "3 min", synopsis: "Koro, una llama obstinada, intenta conseguir una baya en la Patagonia.", art: "caminandes", status: "soon" },
  { id: 9, name: "ELEPHANTS DREAM", genre: "Ciencia ficción", year: 2006, duration: "11 min", synopsis: "Dos viajeros exploran una máquina gigantesca y misteriosa.", art: "elephants", status: "soon" },
];

export default function Home() {
  const [genre, setGenre] = useState("Todo");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Film | null>(null);
  const [videoError, setVideoError] = useState(false);
  const genres = ["Todo", ...Array.from(new Set(films.map((film) => film.genre)))];
  const visibleFilms = useMemo(() => films.filter((film) =>
    (genre === "Todo" || film.genre === genre) &&
    (film.name.toLowerCase().includes(query.toLowerCase()) || film.synopsis.toLowerCase().includes(query.toLowerCase()))
  ), [genre, query]);

  function openFilm(film: Film) {
    if (film.status !== "available") return;
    setVideoError(false);
    setSelected(film);
  }

  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href="#" aria-label="NOIR VAULT inicio"><span>NOIR</span> VAULT<small>THE CINEMA CLUB</small></a>
        <nav><a href="#catalogo">Explorar</a><a href="#colecciones">Colecciones</a><a href="#planes">Membresía</a><a className="loginLink" href="/login">Iniciar sesión</a></nav>
      </header>

      <section className="hero">
        <div className="heroBackdrop" />
        <div className="heroCopy">
          <div className="eyebrow"><span /> UNA NUEVA FORMA DE VER CINE</div>
          <h1>EL CINE<br /><i>ES OTRO UNIVERSO.</i></h1>
          <p>Historias extraordinarias, elegidas con intención. Descubre una colección que crece contigo.</p>
          <div className="heroActions"><a className="primaryBtn" href="#catalogo">EXPLORAR CATÁLOGO <span>↗</span></a><a className="textLink" href="#colecciones">DESCUBRIR NOIR</a></div>
          <div className="heroFoot"><span>01 / COLECCIÓN ABIERTA</span><span>CURATED FOR THE CURIOUS</span></div>
        </div>
        <div className="heroArtwork" aria-hidden="true"><div className="orb" /><div className="orbit orbitOne" /><div className="orbit orbitTwo" /><div className="artLabel">Nº 001<br />THE ART OF<br />STORYTELLING</div></div>
      </section>

      <section className="ticker" aria-label="Características"><span>CINE QUE INSPIRA</span><b>✳</b><span>UNA CURADURÍA EN EVOLUCIÓN</span><b>✳</b><span>HISTORIAS SIN FRONTERAS</span></section>

      <section id="catalogo" className="catalog sectionWrap">
        <div className="sectionHeading"><div><div className="eyebrow">LA SELECCIÓN NOIR</div><h2>Encuentra tu próxima <i>obsesión.</i></h2></div><span className="countLabel">0{films.length} TÍTULOS EN CATÁLOGO</span></div>
        <div className="catalogControls">
          <label className="searchBox"><span>⌕</span><input aria-label="Buscar películas" placeholder="Buscar por título o historia..." value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌕</kbd></label>
          <div className="genreFilters">{genres.map((item) => <button key={item} className={genre === item ? "selected" : ""} onClick={() => setGenre(item)}>{item}</button>)}</div>
        </div>
        <div className="filmGrid">
          {visibleFilms.map((film, index) => <button key={film.id} className={"filmCard " + (film.status === "soon" ? "isSoon" : "")} onClick={() => openFilm(film)} disabled={film.status !== "available"} aria-label={film.status === "available" ? "Reproducir " + film.name : film.name + ", próximamente"}>
            <span className={"filmPoster " + film.art}><span className="posterIndex">NV / 00{film.id}</span><span className="posterTitle">{film.name}</span><span className="posterBottom">{film.year} <i>•</i> {film.genre}</span>{film.status === "available" ? <span className="playDisc">▶</span> : <span className="soonTag">EN PREPARACIÓN</span>}</span>
            <span className="filmMeta"><strong>{film.name}</strong><small>{film.year} <i>·</i> {film.genre} <i>·</i> {film.duration}</small></span>
          </button>)}
        </div>
        {visibleFilms.length === 0 && <p className="emptyState">No encontramos títulos con esa búsqueda.</p>}
        <p className="catalogDisclaimer">Los títulos marcados «En preparación» son referencias de catálogo y todavía no están habilitados para reproducción. La disponibilidad depende de la verificación de derechos y de la fuente de vídeo.</p>
      </section>

      <section id="colecciones" className="collections">
        <div className="sectionWrap collectionInner">
          <div><div className="eyebrow">DOS FORMAS DE DESCUBRIR</div><h2>Una biblioteca.<br /><i>Dos universos.</i></h2><p>Desde cine independiente y obras abiertas hasta grandes producciones con distribución autorizada.</p></div>
          <div className="collectionTiles">
            <a href="#catalogo" className="collectionTile openCinema"><span>01 / OPEN CINEMA</span><strong>Historias<br /><i>para descubrir.</i></strong><small>OBRAS ABIERTAS Y CINE INDEPENDIENTE ↗</small></a>
            <div className="collectionTile premiumCinema"><span>02 / NOIR PREMIERE</span><strong>Grandes historias.<br /><i>Próximamente.</i></strong><small>CATÁLOGO COMERCIAL CON LICENCIA</small></div>
          </div>
        </div>
      </section>

      <section id="planes" className="membership">
        <div className="eyebrow">NOIR VAULT MEMBERSHIP</div><h2>El siguiente capítulo<br />es <i>tuyo.</i></h2><p>Tu cuenta, tus descubrimientos y una experiencia cinematográfica en evolución.</p><a className="primaryBtn" href="/login">CREAR MI CUENTA <span>↗</span></a><small>Las funciones de suscripción se activarán cuando se complete la configuración de pagos y derechos de distribución.</small>
      </section>
      <footer><a className="brand footerBrand" href="#"><span>NOIR</span> VAULT</a><span>© 2026 NOIR VAULT. HECHO PARA LOS QUE AMAN EL CINE.</span><a href="/cuenta">MI CUENTA ↗</a></footer>

      {selected && <div className="playerOverlay" onClick={() => setSelected(null)} role="presentation"><section className="playerWindow" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={"Reproductor " + selected.name}>
        <button className="playerClose" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
        <div className="nativePlayer"><video key={selected.id} controls autoPlay playsInline preload="metadata" poster="" onError={() => setVideoError(true)}><source src={selected.videoUrl} type="video/mp4" />Tu navegador no admite reproducción de vídeo.</video>{videoError && <div className="videoMessage"><strong>No se pudo cargar esta fuente.</strong><span>Prueba de nuevo más tarde. Estamos preparando fuentes de reproducción estables.</span></div>}</div>
        <div className="playerDetails"><div className="eyebrow">NOIR VAULT / OPEN CINEMA</div><h2>{selected.name}</h2><p>{selected.year} <i>·</i> {selected.genre} <i>·</i> {selected.duration}</p><p>{selected.synopsis}</p><small>{selected.creator} · {selected.license}. {selected.credit}. <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">Consultar licencia CC BY 3.0</a>.</small></div>
      </section></div>}
    </main>
  );
}
