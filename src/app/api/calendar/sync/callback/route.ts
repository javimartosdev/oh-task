import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarConnections } from "@/db/schema";

/** OAuth callback for Google / Outlook. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/settings?sync=error", url.origin));
  }

  const [provider, userId] = state.split(":");
  if (!userId || (provider !== "google" && provider !== "outlook")) {
    return NextResponse.redirect(new URL("/settings?sync=error", url.origin));
  }

  const redirectUri = `${url.origin}/api/calendar/sync/callback`;

  try {
    if (provider === "google") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokens.error ?? "token error");

      await db
        .delete(calendarConnections)
        .where(
          and(
            eq(calendarConnections.userId, userId),
            eq(calendarConnections.provider, "google"),
          ),
        );

      await db.insert(calendarConnections).values({
        userId,
        provider: "google",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        calendarId: "primary",
      });
    }

    if (provider === "outlook") {
      const tokenRes = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        },
      );
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokens.error ?? "token error");

      await db.insert(calendarConnections).values({
        userId,
        provider: "outlook",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        calendarId: "default",
      });
    }

    return NextResponse.redirect(new URL("/settings?sync=ok", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?sync=error", url.origin));
  }
}
