import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

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

  return <main className="section">
    <a href="/">NOIR VAULT</a>
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
    <form action="/auth/logout" method="post" style={{marginTop:28}}><button className="btn">CERRAR SESIÓN</button></form>
  </main>;
}
