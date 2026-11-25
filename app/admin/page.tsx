"use client";
import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
type Movie={id:string;title:string;synopsis:string|null;genre:string|null;release_year:number|null;status:string;published:boolean};
const empty={title:"",synopsis:"",genre:"Drama",release_year:"2026",duration:"",art:"bunny",video_url:"",creator:"",license:"",credit:"",status:"soon",published:true,audio_tracks_json:"[]",subtitle_tracks_json:"[]",audio_languages_text:"",has_latin_spanish:false};
export default function AdminPage(){
 const [supabase]=useState(()=>{const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;return u&&k?createBrowserClient(u,k):null});
 const [allowed,setAllowed]=useState<boolean|null>(null),[movies,setMovies]=useState<Movie[]>([]),[form,setForm]=useState(empty),[message,setMessage]=useState("Cargando panel…"),[busy,setBusy]=useState(false),[syncBusy,setSyncBusy]=useState(false);
 const load=useCallback(async()=>{if(!supabase){setMessage("Falta conexión con Supabase.");return}const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);setMessage("Inicia sesión con una cuenta administradora.");return}const {data:p,error:pe}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();if(pe||p?.role!=="admin"){setAllowed(false);setMessage("Esta cuenta no tiene permisos de administración.");return}setAllowed(true);const {data,error}=await supabase.from("movies").select("id,title,synopsis,genre,release_year,status,published").order("created_at",{ascending:false});if(error){setMessage(error.message);return}setMovies(data||[]);setMessage("Panel conectado. Los cambios se guardan en Supabase.")},[supabase]);
 useEffect(()=>{void load()},[load]);
 async function save(e:React.FormEvent){e.preventDefault();if(!supabase)return;let audioTracks:unknown,subtitleTracks:unknown;try{audioTracks=JSON.parse(form.audio_tracks_json);subtitleTracks=JSON.parse(form.subtitle_tracks_json);if(!Array.isArray(audioTracks)||!Array.isArray(subtitleTracks))throw new Error("Las pistas deben ser listas JSON.");}catch{setMessage("Revisa el JSON de las pistas de audio y subtítulos.");return}setBusy(true);setMessage("Guardando…");const {audio_tracks_json,subtitle_tracks_json,audio_languages_text,...base}=form;const payload={...base,release_year:form.release_year?Number(form.release_year):null,video_url:form.video_url||null,audio_tracks:audioTracks,subtitle_tracks:subtitleTracks,audio_languages:audio_languages_text.split(",").map((v)=>v.trim()).filter(Boolean)};const {error}=await supabase.from("movies").insert(payload);setBusy(false);if(error){setMessage(error.message);return}setForm(empty);setMessage("Película guardada.");await load()}
 async function syncCatalog(){
  if(!supabase||syncBusy)return;
  setSyncBusy(true);
  setMessage("Importando el siguiente lote de fichas de películas…");
  try{
   const response=await fetch("/api/catalog/sync",{method:"POST"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){setMessage(data.error||"No se pudo iniciar la importación.");return}
   setMessage(data.complete
    ? `Importación completada: ${data.importedSoFar||0} fichas procesadas.`
    : `Lote importado: ${data.importedThisBatch||0} · Total acumulado: ${data.importedSoFar||0} · Siguiente lote listo.`);
   await load();
  }catch{
   setMessage("No pudimos conectar con el importador. Comprueba la conexión e inténtalo de nuevo.");
  }finally{setSyncBusy(false)}
 }
 async function remove(id:string){if(!supabase||!window.confirm("¿Eliminar esta película del catálogo?"))return;const {error}=await supabase.from("movies").delete().eq("id",id);if(error){setMessage(error.message);return}setMessage("Película eliminada.");await load()}
 if(allowed===false)return <main className="section"><Link href="/">← NOIR VAULT</Link><h1>Administración</h1><p>{message}</p><a className="btn" href="/login">INICIAR SESIÓN</a></main>;
 return <main className="section" style={{maxWidth:1000,margin:"0 auto"}}><Link href="/">← NOIR VAULT</Link><h1>NOIR VAULT / ADMIN</h1><p>{message}</p>{allowed&&<>
 <section style={{padding:22,border:"1px solid #39332a",borderRadius:12,marginTop:24}}>
  <h2>Ampliar cartelera</h2>
  <p style={{opacity:.8}}>Importa fichas de películas desde Wikidata e imágenes de Wikimedia Commons cuya licencia se pueda reutilizar. Los títulos importados quedan como “Próximamente” hasta disponer de un vídeo y derechos de exhibición verificados.</p>
  <button className="btn" type="button" onClick={syncCatalog} disabled={syncBusy}>{syncBusy?"IMPORTANDO…":"IMPORTAR SIGUIENTE LOTE (40 FICHAS)"}</button>
 </section>
 <section style={{padding:22,border:"1px solid #39332a",borderRadius:12,marginTop:24}}><h2>Agregar película</h2><form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
 <input required placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="Género" value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})}/><input placeholder="Año" type="number" value={form.release_year} onChange={e=>setForm({...form,release_year:e.target.value})}/><input placeholder="Duración" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/><input placeholder="Arte / clase visual" value={form.art} onChange={e=>setForm({...form,art:e.target.value})}/><input placeholder="URL de vídeo autorizada" type="url" value={form.video_url} onChange={e=>setForm({...form,video_url:e.target.value})}/><input placeholder="Productor / titular" value={form.creator} onChange={e=>setForm({...form,creator:e.target.value})}/><input placeholder="Licencia / autorización" value={form.license} onChange={e=>setForm({...form,license:e.target.value})}/><input placeholder="Créditos y atribución" value={form.credit} onChange={e=>setForm({...form,credit:e.target.value})}/><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="soon">En preparación</option><option value="available">Disponible</option></select><label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Publicar en catálogo</label><textarea placeholder="Sinopsis" value={form.synopsis} onChange={e=>setForm({...form,synopsis:e.target.value})} style={{gridColumn:"1 / -1",minHeight:90}}/>
 <h3 style={{gridColumn:"1 / -1",color:"#c7a675",margin:"12px 0 0"}}>IDIOMAS Y PISTAS (solo fuentes verificadas)</h3>
 <input placeholder="Idiomas de audio: es-419, es-MX, en" value={form.audio_languages_text} onChange={e=>setForm({...form,audio_languages_text:e.target.value})}/>
 <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={form.has_latin_spanish} onChange={e=>setForm({...form,has_latin_spanish:e.target.checked})}/> Audio latino comprobado</label>
 <textarea placeholder={'Pistas de audio JSON: [{"label":"Español latino","language":"es-419","url":"https://...","verified":true}]'} value={form.audio_tracks_json} onChange={e=>setForm({...form,audio_tracks_json:e.target.value})} style={{gridColumn:"1 / -1",minHeight:90}}/>
 <textarea placeholder={'Subtítulos WebVTT JSON: [{"label":"Español","language":"es","src":"https://...vtt","isDefault":true}]'} value={form.subtitle_tracks_json} onChange={e=>setForm({...form,subtitle_tracks_json:e.target.value})} style={{gridColumn:"1 / -1",minHeight:90}}/>
 <button className="btn" disabled={busy}>GUARDAR PELÍCULA</button></form></section>
 <section style={{marginTop:28}}><h2>Catálogo ({movies.length})</h2>{movies.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"12px 0",borderBottom:"1px solid #39332a"}}><div><strong>{m.title}</strong><p>{m.genre} · {m.release_year} · {m.status} · {m.published?"Publicado":"Oculto"}</p></div><button className="btn" onClick={()=>remove(m.id)}>ELIMINAR</button></div>)}</section>
 </>}</main>
}
