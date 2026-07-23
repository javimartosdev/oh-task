import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarConnections } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

const PROVIDERS = ["google", "outlook", "apple"] as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: calendarConnections.id,
      provider: calendarConnections.provider,
      calendarId: calendarConnections.calendarId,
      connectedAt: calendarConnections.connectedAt,
    })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, user.id));

  return NextResponse.json({
    connections: rows,
    configured: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      outlook: Boolean(
        process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET,
      ),
      apple: Boolean(process.env.APPLE_CALDAV_URL),
    },
  });
}

/** Start OAuth or save CalDAV credentials. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const provider = body.provider as (typeof PROVIDERS)[number];
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Provider inválido" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/calendar/sync/callback`;

  if (provider === "google") {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: "Google Calendar no configurado (GOOGLE_CLIENT_ID)" },
        { status: 503 },
      );
    }
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state: `google:${user.id}`,
    });
    return NextResponse.json({
      authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    });
  }

  if (provider === "outlook") {
    if (!process.env.OUTLOOK_CLIENT_ID) {
      return NextResponse.json(
        { error: "Outlook no configurado (OUTLOOK_CLIENT_ID)" },
        { status: 503 },
      );
    }
    const params = new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "Calendars.ReadWrite offline_access",
      state: `outlook:${user.id}`,
    });
    return NextResponse.json({
      authorizeUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`,
    });
  }

  // Apple CalDAV — store URL + app-password in tokens
  const { caldavUrl, username, password } = body as {
    caldavUrl?: string;
    username?: string;
    password?: string;
  };
  if (!caldavUrl || !username || !password) {
    return NextResponse.json(
      { error: "Se requieren caldavUrl, username y password (app-specific)" },
      { status: 400 },
    );
  }

  await db
    .delete(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, user.id),
        eq(calendarConnections.provider, "apple"),
      ),
    );

  const [row] = await db
    .insert(calendarConnections)
    .values({
      userId: user.id,
      provider: "apple",
      accessToken: password,
      refreshToken: username,
      calendarId: caldavUrl,
    })
    .returning({
      id: calendarConnections.id,
      provider: calendarConnections.provider,
      connectedAt: calendarConnections.connectedAt,
    });

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = new URL(request.url).searchParams.get("provider") as
    | (typeof PROVIDERS)[number]
    | null;
  if (!provider || !PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  await db
    .delete(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, user.id),
        eq(calendarConnections.provider, provider),
      ),
    );

  return NextResponse.json({ ok: true });
}
