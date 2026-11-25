import Stripe from "stripe";
import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_client;
    if (!secret) return NextResponse.json({error:"Stripe no está configurado."},{status:503});

    const supabase = await createClient();
    const {data:{user}, error:authError} = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({error:"Debes iniciar sesión."},{status:401});

    const price = process.env.STRIPE_PRICE_ID;
    if (!price) return NextResponse.json({error:"Falta configurar el precio mensual de NOIR PREMIUM."},{status:503});

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode:"subscription",
      line_items:[{price,quantity:1}],
      client_reference_id:user.id,
      metadata:{user_id:user.id},
      subscription_data:{metadata:{user_id:user.id}},
      success_url:baseUrl+"/cuenta?checkout=success",
      cancel_url:baseUrl+"/planes",
      customer_email:user.email || undefined
    });
    if (!session.url) throw new Error("Stripe no devolvió una URL de pago.");
    return NextResponse.json({url:session.url});
  } catch (error) {
    console.error("NOIR checkout error:", error);
    return NextResponse.json({error:"No se pudo iniciar el pago. Comprueba la configuración de Stripe o inténtalo más tarde."},{status:502});
  }
}
