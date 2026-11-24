import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe aún no está configurado." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { data: subscription, error } = await supabase.from("subscriptions")
    .select("stripe_customer_id").eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No encontramos una cuenta de facturación asociada." }, { status: 404 });
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) return NextResponse.json({ error: "Falta configurar la URL pública del sitio." }, { status: 503 });
  const stripe = new Stripe(secret);
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: baseUrl + "/cuenta"
  });
  return NextResponse.json({ url: session.url });
}
