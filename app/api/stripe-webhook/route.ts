import Stripe from "stripe";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the modern server-only Supabase secret key. Keep the legacy
  // service_role variable as a fallback while older environments migrate.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta configurar la clave secreta de Supabase en el servidor.");
  if (key.startsWith("sb_publishable_")) {
    throw new Error("La clave de Supabase del webhook es pública; configura una clave secreta de servidor.");
  }
  return createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

function getSubscriptionPeriodEnd(subscription:Stripe.Subscription): number | null {
  // Stripe API versions before 2025-03-31 expose the billing period on the
  // subscription; newer Basil versions expose it on each subscription item.
  const compatible = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
    items?: {data?: Array<{current_period_end?: number | null}>};
  };
  if (typeof compatible.current_period_end === "number") return compatible.current_period_end;
  const itemEnds = (compatible.items?.data || [])
    .map((item) => (item as Stripe.SubscriptionItem & {current_period_end?: number | null}).current_period_end)
    .filter((value): value is number => typeof value === "number");
  return itemEnds.length ? Math.min(...itemEnds) : null;
}

function getInvoiceSubscriptionId(invoice:Stripe.Invoice): string | null {
  // The invoice.subscription field is used by older API versions. Basil
  // moves the reference under parent.subscription_details.subscription.
  const compatible = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  };
  const value = compatible.parent?.subscription_details?.subscription ?? compatible.subscription;
  if (typeof value === "string") return value;
  return value?.id || null;
}

async function releaseCheckoutAttempt(userId?:string | null, attemptId?:string | null) {
  // Require both identifiers: a delayed webhook from an older attempt must
  // never release the currently active lock for the same user.
  if (!userId || !attemptId) return;
  const {error} = await getAdminClient()
    .from("checkout_attempts")
    .delete()
    .eq("user_id",userId)
    .eq("attempt_id",attemptId);
  if (error) throw error;
}

async function saveSubscription(subscription:Stripe.Subscription, userId?:string, customerId?:string) {
  const ownerId = userId || subscription.metadata?.user_id;
  if (!ownerId) throw new Error("La suscripción no contiene user_id.");
  const supabase = getAdminClient();
  const customer = customerId || (typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id);
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const {error} = await supabase.from("subscriptions").upsert({
    user_id:ownerId,
    stripe_customer_id:customer,
    stripe_subscription_id:subscription.id,
    status:subscription.status,
    current_period_end:periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end:subscription.cancel_at_period_end ?? false,
    cancel_at:subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
    canceled_at:subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  },{onConflict:"stripe_subscription_id"});
  if (error) throw error;
}

function checkoutSessionIsPaid(session:Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

async function syncCheckoutSession(stripe:Stripe, session:Stripe.Checkout.Session) {
  if (!checkoutSessionIsPaid(session) || session.mode !== "subscription" || !session.subscription) return;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await saveSubscription(
    subscription,
    session.client_reference_id || session.metadata?.user_id || undefined,
    typeof session.customer === "string" ? session.customer : session.customer?.id
  );
}

async function syncLatestSubscription(stripe:Stripe, subscriptionId:string) {
  // Fetch the canonical current state instead of trusting the event snapshot:
  // Stripe does not guarantee webhook delivery order.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await saveSubscription(subscription);
}

export async function POST(request:Request) {
  const secret = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_client;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({error:"Webhook no configurado."},{status:503});
  }
  if (!/^(?:sk|rk)_test_/.test(secret)) {
    return NextResponse.json({error:"NOIR VAULT permanece en modo de prueba. El webhook real está deshabilitado."},{status:503});
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
  if (event.livemode) {
    return NextResponse.json({error:"Los eventos de Stripe en modo real están deshabilitados."},{status:400});
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (checkoutSessionIsPaid(session)) {
        await syncCheckoutSession(stripe,session);
        await releaseCheckoutAttempt(
          session.client_reference_id || session.metadata?.user_id,
          session.metadata?.checkout_attempt_id
        );
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await releaseCheckoutAttempt(
        session.client_reference_id || session.metadata?.user_id,
        session.metadata?.checkout_attempt_id
      );
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused" ||
      event.type === "customer.subscription.resumed"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await syncLatestSubscription(stripe,subscription.id);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const subscriptionId = getInvoiceSubscriptionId(event.data.object as Stripe.Invoice);
      if (subscriptionId) await syncLatestSubscription(stripe,subscriptionId);
    }
    return NextResponse.json({received:true});
  } catch (error) {
    console.error("Error procesando webhook de Stripe:",error);
    return NextResponse.json({error:"No se pudo guardar la suscripción."},{status:500});
  }
}
