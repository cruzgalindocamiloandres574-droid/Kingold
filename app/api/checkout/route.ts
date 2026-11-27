import Stripe from "stripe";
import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";

export const runtime = "nodejs";

const BILLING_IN_PROGRESS = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_client;
    if (!secret) return NextResponse.json({error:"Stripe no está configurado."},{status:503});

    const supabase = await createClient();
    const {data:{user}, error:authError} = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({error:"Debes iniciar sesión."},{status:401});

    const price = process.env.STRIPE_PRICE_ID;
    if (!price) return NextResponse.json({error:"Falta configurar el precio mensual de NOIR PREMIUM."},{status:503});

    // Reuse the Stripe customer recorded by the signed webhook and avoid
    // creating another paid subscription for the same NOIR VAULT account.
    const {data:existingSubscriptions,error:subscriptionError} = await supabase
      .from("subscriptions")
      .select("status,stripe_customer_id")
      .eq("user_id",user.id)
      .order("created_at",{ascending:false})
      .limit(25);

    if (subscriptionError) {
      console.error("NOIR subscription lookup error:",subscriptionError);
      return NextResponse.json({error:"No pudimos verificar tu suscripción. Inténtalo de nuevo."},{status:503});
    }

    const currentSubscription = (existingSubscriptions || []).find((item) =>
      BILLING_IN_PROGRESS.has(item.status)
    );
    if (currentSubscription) {
      return NextResponse.json({
        error:"Ya tienes una suscripción activa o pendiente. Revísala desde Mi cuenta antes de iniciar otra.",
        code:"SUBSCRIPTION_ALREADY_EXISTS",
      },{status:409});
    }

    const customerId = (existingSubscriptions || []).find((item) => item.stripe_customer_id)?.stripe_customer_id;
    const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!configuredBaseUrl) {
      return NextResponse.json({error:"Falta configurar la URL pública del sitio."},{status:503});
    }
    const baseUrl = new URL(configuredBaseUrl);
    if (baseUrl.protocol !== "https:" && (process.env.NODE_ENV === "production" || baseUrl.protocol !== "http:")) {
      return NextResponse.json({error:"La URL pública de NOIR VAULT no es válida."},{status:503});
    }
    const origin = baseUrl.origin;

    // Atomically allow only one in-flight Checkout Session per user.
    const {data:lockAcquired,error:lockError} = await supabase.rpc("acquire_checkout_attempt");
    if (lockError) {
      console.error("NOIR checkout lock error:",lockError);
      return NextResponse.json({error:"No pudimos proteger el inicio de pago. Inténtalo de nuevo."},{status:503});
    }
    if (lockAcquired !== true) {
      return NextResponse.json({
        error:"Ya hay un intento de pago abierto para tu cuenta. Termina ese proceso o espera a que expire antes de intentarlo de nuevo.",
        code:"CHECKOUT_IN_PROGRESS",
      },{status:409});
    }

    const stripe = new Stripe(secret);
    try {
      const session = await stripe.checkout.sessions.create({
        mode:"subscription",
        line_items:[{price,quantity:1}],
        client_reference_id:user.id,
        metadata:{user_id:user.id},
        subscription_data:{metadata:{user_id:user.id}},
        success_url:origin+"/cuenta?checkout=success",
        cancel_url:origin+"/planes",
        expires_at:Math.floor(Date.now()/1000)+31*60,
        ...(customerId ? {customer:customerId} : {customer_email:user.email || undefined}),
      });
      if (!session.url) throw new Error("Stripe no devolvió una URL de pago.");
      // Keep the lock until the signed webhook confirms completion or expiry.
      return NextResponse.json({url:session.url});
    } catch (error) {
      // A definitive Stripe 4xx (except rate limiting) means no session was
      // created, so release the lock. Network/5xx errors remain locked until
      // TTL expiry because Stripe may have created the session before timeout.
      const statusCode = (error as {statusCode?:number})?.statusCode;
      if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        const {error:releaseError} = await supabase.from("checkout_attempts").delete().eq("user_id",user.id);
        if (releaseError) console.error("NOIR checkout lock release error:",releaseError);
      }
      throw error;
    }
  } catch (error) {
    console.error("NOIR checkout error:", error);
    return NextResponse.json({error:"No se pudo iniciar el pago. Comprueba la configuración de Stripe o inténtalo más tarde."},{status:502});
  }
}
