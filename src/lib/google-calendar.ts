import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarConnections } from "@/db/schema";

export type GoogleEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  htmlLink?: string;
};

async function refreshGoogleToken(
  userId: string,
  refreshToken: string,
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) return null;

  await db
    .update(calendarConnections)
    .set({ accessToken: data.access_token })
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, "google"),
      ),
    );

  return data.access_token as string;
}

export async function getGoogleAccessToken(userId: string): Promise<{
  accessToken: string;
  calendarId: string;
  refreshToken: string | null;
} | null> {
  const [conn] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, "google"),
      ),
    )
    .limit(1);

  if (!conn?.accessToken) return null;

  return {
    accessToken: conn.accessToken,
    calendarId: conn.calendarId || "primary",
    refreshToken: conn.refreshToken,
  };
}

async function withGoogleToken<T>(
  userId: string,
  fn: (accessToken: string, calendarId: string) => Promise<T>,
): Promise<T | null> {
  const creds = await getGoogleAccessToken(userId);
  if (!creds) return null;

  try {
    return await fn(creds.accessToken, creds.calendarId);
  } catch (err) {
    if (
      creds.refreshToken &&
      err instanceof Error &&
      err.message === "unauthorized"
    ) {
      const fresh = await refreshGoogleToken(userId, creds.refreshToken);
      if (!fresh) return null;
      return fn(fresh, creds.calendarId);
    }
    throw err;
  }
}

export async function fetchGoogleEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleEvent[]> {
  const result = await withGoogleToken(userId, async (accessToken, calendarId) => {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Calendar error: ${res.status} ${body}`);
    }
    const data = await res.json();
    const items = (data.items ?? []) as {
      id: string;
      summary?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];

    return items
      .map((ev) => {
        const startAt = ev.start?.dateTime ?? ev.start?.date;
        const endAt = ev.end?.dateTime ?? ev.end?.date;
        if (!startAt || !endAt) return null;
        return {
          id: ev.id,
          title: ev.summary || "(Sin título)",
          startAt,
          endAt,
          htmlLink: ev.htmlLink,
        } satisfies GoogleEvent;
      })
      .filter(Boolean) as GoogleEvent[];
  });

  if (result) {
    await db
      .update(calendarConnections)
      .set({ syncToken: new Date().toISOString() })
      .where(
        and(
          eq(calendarConnections.userId, userId),
          eq(calendarConnections.provider, "google"),
        ),
      );
  }

  return result ?? [];
}

export async function pushTaskToGoogle(
  userId: string,
  task: {
    title: string;
    scheduledStart: Date;
    scheduledEnd: Date;
  },
): Promise<{ eventId: string; htmlLink?: string } | null> {
  return withGoogleToken(userId, async (accessToken, calendarId) => {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: task.title,
          start: { dateTime: task.scheduledStart.toISOString() },
          end: { dateTime: task.scheduledEnd.toISOString() },
        }),
      },
    );
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google push error: ${res.status} ${body}`);
    }
    const data = await res.json();
    return { eventId: data.id as string, htmlLink: data.htmlLink as string | undefined };
  });
}
