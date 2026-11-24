import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
export default async function Account(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return <main className="section"><a href="/">NOIR VAULT</a><h1>Mi cuenta</h1><p>Sesión iniciada como {user.email}</p><form action="/auth/logout" method="post"><button className="btn">CERRAR SESIÓN</button></form></main>}
