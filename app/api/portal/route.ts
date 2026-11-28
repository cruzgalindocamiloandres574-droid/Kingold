import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_client;
    if (!secret) {
      return NextResponse.json({ error: "Stripe aún no está configurado." }, { status: 503 });
    }
    if (!/^(?:sk|rk)_test_/.test(secret)) {
      return NextResponse.json({ error: "NOIR VAULT permanece en modo de prueba. El portal real de facturación sigue deshabilitado." }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const { data: subscription, error } = await supabase.from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("NOIR billing portal lookup failed.");
      return NextResponse.json({ error: "No pudimos consultar tu cuenta de facturación. Inténtalo de nuevo." }, { status: 503 });
    }
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No encontramos una cuenta de facturación asociada." }, { status: 404 });
    }

    const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!configuredBaseUrl) {
      return NextResponse.json({ error: "Falta configurar la URL pública del sitio." }, { status: 503 });
    }

    let returnUrl: URL;
    try {
      const siteUrl = new URL(configuredBaseUrl);
      if (siteUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
        throw new Error("Production billing return URLs must use HTTPS.");
      }
      if (siteUrl.protocol !== "https:" && siteUrl.protocol !== "http:") {
        throw new Error("Unsupported billing return URL protocol.");
      }
      returnUrl = new URL("/cuenta", siteUrl.origin);
    } catch {
      return NextResponse.json({ error: "La URL pública de NOIR VAULT no es válida." }, { status: 503 });
    }

    const stripe = new Stripe(secret);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl.toString()
    });

    return NextResponse.redirect(session.url, 303);
  } catch {
    console.error("NOIR billing portal session could not be created.");
    return NextResponse.json({ error: "No se pudo abrir el portal de facturación. Inténtalo de nuevo." }, { status: 502 });
  }
}
