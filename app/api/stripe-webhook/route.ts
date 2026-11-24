import Stripe from "stripe";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta configurar Supabase en el servidor.");
  return createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

async function saveSubscription(subscription:Stripe.Subscription, userId?:string, customerId?:string) {
  const ownerId = userId || subscription.metadata?.user_id;
  if (!ownerId) throw new Error("La suscripción no contiene user_id.");
  const supabase = getAdminClient();
  const customer = customerId || (typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id);
  const {error} = await supabase.from("subscriptions").upsert({
    user_id:ownerId,
    stripe_customer_id:customer,
    stripe_subscription_id:subscription.id,
    status:subscription.status,
    current_period_end:new Date(subscription.current_period_end * 1000).toISOString()
  },{onConflict:"stripe_subscription_id"});
  if (error) throw error;
}

export async function POST(request:Request) {
  const secret = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_client;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({error:"Webhook no configurado."},{status:503});
  }

  const stripe = new Stripe(secret);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({error:"Falta firma."},{status:400});

  let event:Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(),signature,webhookSecret);
  } catch {
    return NextResponse.json({error:"Firma inválida."},{status:400});
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await saveSubscription(subscription,session.client_reference_id || session.metadata?.user_id || undefined,
          typeof session.customer === "string" ? session.customer : session.customer?.id);
      }
    } else if (event.type === "customer.subscription.created" ||
               event.type === "customer.subscription.updated" ||
               event.type === "customer.subscription.deleted") {
      await saveSubscription(event.data.object as Stripe.Subscription);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await saveSubscription(subscription);
      }
    }
    return NextResponse.json({received:true});
  } catch (error) {
    console.error("Error procesando webhook de Stripe:",error);
    return NextResponse.json({error:"No se pudo guardar la suscripción."},{status:500});
  }
}
