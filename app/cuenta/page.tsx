import Image from "next/image";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import Link from "next/link";

const labels:Record<string,string> = {
  active:"Activa",
  trialing:"En periodo de prueba",
  past_due:"Pago pendiente",
  canceled:"Cancelada",
  unpaid:"Sin pago",
  incomplete:"Pendiente de completar",
  incomplete_expired:"Expirada",
  paused:"Pausada"
};

export default async function Account() {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const {data:profile} = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  const {data:subscription} = await supabase.from("subscriptions")
    .select("status,current_period_end,stripe_customer_id").eq("user_id",user.id)
    .order("created_at",{ascending:false}).limit(1).maybeSingle();

  const {data:progressRows} = await supabase.from("watch_progress")
    .select("movie_id,seconds_watched,updated_at")
    .eq("user_id",user.id).order("updated_at",{ascending:false}).limit(10);
  const movieIds = [...new Set((progressRows || []).map((item) => item.movie_id))];
  const {data:progressMovies} = movieIds.length
    ? await supabase.from("movies").select("id,title,poster_url,status,video_url")
        .in("id",movieIds).eq("published",true)
    : {data:[]};
  const movieById = new Map((progressMovies || []).map((movie) => [movie.id,movie]));
  const continueWatching = (progressRows || []).flatMap((item) => {
    const movie = movieById.get(item.movie_id);
    if (!movie || movie.status !== "available" || !movie.video_url) return [];
    return [{ ...item, movie }];
  });

  return <main className="section">
    <Link href="/">NOIR VAULT</Link>
    <h1>Mi cuenta</h1>
    <p>Sesión iniciada como {user.email}</p>
    {profile?.role === "admin" && <p><a className="btn" href="/admin">ABRIR ADMINISTRACIÓN</a></p>}
    <section style={{maxWidth:520,marginTop:28,padding:24,border:"1px solid #39332a",borderRadius:12}}>
      <small>NOIR PREMIUM</small>
      <h2>{subscription ? labels[subscription.status] || subscription.status : "Sin suscripción activa"}</h2>
      {subscription?.current_period_end && <p>Periodo hasta: {new Date(subscription.current_period_end).toLocaleDateString("es-CO",{dateStyle:"long"})}</p>}
      {!subscription && <p>Elige un plan para acceder al catálogo premium cuando el servicio esté habilitado.</p>}
      <a className="btn" href="/planes">{subscription ? "VER PLANES" : "ELEGIR PLAN"}</a>
      {subscription?.stripe_customer_id && <form action="/api/portal" method="post" style={{marginTop:12}}><button className="btn" type="submit">GESTIONAR MI SUSCRIPCIÓN</button></form>}
    </section>
    <section style={{maxWidth:760,marginTop:28,padding:24,border:"1px solid #39332a",borderRadius:12}}>
      <small>MI ACTIVIDAD</small>
      <h2>Seguir viendo</h2>
      {continueWatching.length ? <div style={{display:"grid",gap:14,marginTop:16}}>
        {continueWatching.map((item) => <div key={item.movie_id} style={{display:"flex",alignItems:"center",gap:16,borderBottom:"1px solid #39332a",paddingBottom:14}}>
          {item.movie.poster_url && <Image src={item.movie.poster_url} alt="" width={64} height={88} unoptimized style={{width:64,height:88,objectFit:"cover",borderRadius:6}}/>}
          <div style={{flex:1,minWidth:0}}>
            <strong>{item.movie.title}</strong>
            <p style={{margin:"6px 0",opacity:.75}}>Visto hasta {Math.floor(item.seconds_watched / 60)}:{String(item.seconds_watched % 60).padStart(2,"0")}</p>
            <small>{new Date(item.updated_at).toLocaleDateString("es-CO",{dateStyle:"medium"})}</small>
          </div>
          <a className="btn" href={"/?watch="+encodeURIComponent(item.movie_id)+"#catalogo"}>CONTINUAR</a>
        </div>)}
      </div> : <p style={{opacity:.75}}>Las películas que empieces a ver aparecerán aquí para que puedas continuar después.</p>}
    </section>
    <form action="/auth/logout" method="post" style={{marginTop:28}}><button className="btn">CERRAR SESIÓN</button></form>
  </main>;
}
