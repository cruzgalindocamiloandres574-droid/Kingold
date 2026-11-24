"use client";

import { useMemo, useState } from "react";

const titles = [
  {
    id: 1,
    name: "BIG BUCK BUNNY",
    genre: "Animación",
    year: 2008,
    duration: "10 min",
    desc: "Un conejo gigante y tranquilo decide enfrentarse a tres roedores que molestan a los habitantes del bosque.",
    videoId: "MGGaqmZZV_Q",
    creator: "Blender Foundation",
    license: "Creative Commons Atribución 3.0",
    credit: "© copyright 2008, Blender Foundation / www.bigbuckbunny.org",
    art: "a",
  },
  {
    id: 2,
    name: "SINTEL",
    genre: "Fantasía",
    year: 2010,
    duration: "15 min",
    desc: "Una joven emprende un peligroso viaje por tierras heladas en busca del pequeño dragón que perdió.",
    videoId: "eRsGyueVLvQ",
    creator: "Blender Foundation",
    license: "Creative Commons Atribución 3.0",
    credit: "© copyright Blender Foundation / www.sintel.org",
    art: "b",
  },
  {
    id: 3,
    name: "TEARS OF STEEL",
    genre: "Ciencia ficción",
    year: 2012,
    duration: "12 min",
    desc: "En un futuro devastado, un grupo de combatientes intenta salvar a la humanidad de una amenaza tecnológica.",
    videoId: "R6MlUcmOul8",
    creator: "Blender Foundation",
    license: "Creative Commons Atribución 3.0",
    credit: "(CC) Blender Foundation / mango.blender.org",
    art: "c",
  },
];

export default function Home() {
  const [genre, setGenre] = useState("Todo");
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<(typeof titles)[number] | null>(null);

  const genres = ["Todo", ...Array.from(new Set(titles.map((title) => title.genre)))];
  const list = useMemo(
    () =>
      titles.filter(
        (title) =>
          (genre === "Todo" || title.genre === genre) &&
          title.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [genre, q],
  );

  return (
    <main>
      <header>
        <a className="logo" href="#">N<span>OIR</span> VAULT</a>
        <nav>
          <a href="#catalogo">Cartelera</a>
          <a href="#planes">Planes</a>
          <a href="/login">Acceder</a>
        </nav>
      </header>

      <section className="hero">
        <div className="heroText">
          <small>EL CINE ENCUENTRA SU LUGAR</small>
          <h1>HISTORIAS<br /><i>QUE DEJAN HUELLA.</i></h1>
          <p>Una selección de cine para descubrir, disfrutar y volver a ver. Elige una película y dale al play.</p>
          <a className="btn" href="#catalogo">VER CARTELERA ↗</a>
        </div>
        <div className="heroOrb" />
      </section>

      <section id="catalogo" className="section">
        <small>CARTELERA NOIR</small>
        <h2>Tu próxima <i>historia.</i></h2>
        <div className="tools">
          <input
            aria-label="Buscar película"
            placeholder="Buscar película..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <div className="filters">
            {genres.map((item) => (
              <button
                className={genre === item ? "active" : ""}
                onClick={() => setGenre(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid">
          {list.map((movie) => (
            <button className="film" onClick={() => setChosen(movie)} key={movie.id}>
              <span className={"poster " + movie.art}>
                <b>{movie.name}</b>
                <em aria-hidden="true">▶</em>
                <small className="posterPlay">REPRODUCIR</small>
              </span>
              <strong>{movie.name}</strong>
              <small>{movie.year} · {movie.genre} · {movie.duration}</small>
            </button>
          ))}
        </div>
        {!list.length && <p>No hay películas que coincidan con tu búsqueda.</p>}
        <p className="catalogNote">Películas de muestra publicadas por sus creadores bajo licencias Creative Commons. Consulta los créditos al reproducir.</p>
      </section>

      <section id="planes" className="plans">
        <small>ACCESO EXCLUSIVO</small>
        <h2>Vive el cine de otra <i>forma.</i></h2>
        <p>Una suscripción. Un catálogo en constante evolución.</p>
        <a className="btn" href="/login">CREAR MI CUENTA ↗</a>
        <p className="note">El catálogo premium se ampliará con películas distribuidas con autorización.</p>
      </section>

      <footer>© 2026 NOIR VAULT · CARTELERA DE MUESTRA Y CONTENIDO CON LICENCIA</footer>

      {chosen && (
        <div className="overlay" onClick={() => setChosen(null)} role="presentation">
          <article className="playerDialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={chosen.name}>
            <button className="close" onClick={() => setChosen(null)} aria-label="Cerrar reproductor">×</button>
            <div className="videoFrame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${chosen.videoId}?autoplay=1&rel=0`}
                title={`Reproductor de ${chosen.name}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="playerInfo">
              <small>REPRODUCIENDO EN NOIR VAULT</small>
              <h2>{chosen.name}</h2>
              <p>{chosen.year} · {chosen.genre} · {chosen.duration}</p>
              <p>{chosen.desc}</p>
              <small className="credits">{chosen.creator} · {chosen.license}. {chosen.credit}. <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">Ver licencia</a>.</small>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
