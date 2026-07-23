import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json({ error: "Stripe webhook no configurado" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key);
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { userId?: string };
      customer?: string;
      subscription?: string;
    };
    const userId = session.metadata?.userId;
    if (userId) {
      await db
        .update(users)
        .set({
          plan: "pro",
          stripeCustomerId: String(session.customer ?? ""),
          stripeSubscriptionId: String(session.subscription ?? ""),
        })
        .where(eq(users.id, userId));
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { id: string };
    await db
      .update(users)
      .set({ plan: "free", stripeSubscriptionId: null })
      .where(eq(users.stripeSubscriptionId, sub.id));
  }

  return NextResponse.json({ received: true });
}
