import Stripe from "stripe";
import {createClient} from "@/lib/supabase/server";
import {NextResponse} from "next/server";

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({error:"Stripe no está configurado."},{status:503});

  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Debes iniciar sesión."},{status:401});

  const price = process.env.STRIPE_PRICE_ID;
  if (!price) return NextResponse.json({error:"Configura STRIPE_PRICE_ID con un precio recurrente creado en Stripe."},{status:503});

  const stripe = new Stripe(secret);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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
  return NextResponse.json({url:session.url});
}
