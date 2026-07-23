import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import {
  fetchGoogleEvents,
  pushTaskToGoogle,
} from "@/lib/google-calendar";

/** Pull Google Calendar events for a time range. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to required (ISO)" }, { status: 400 });
  }

  try {
    const events = await fetchGoogleEvents(
      user.id,
      new Date(from),
      new Date(to),
    );
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error sync" },
      { status: 502 },
    );
  }
}

const pushSchema = z.object({
  title: z.string().min(1).max(300),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
});

/** Push a timed block to Google Calendar. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = pushSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const result = await pushTaskToGoogle(user.id, {
      title: parsed.data.title,
      scheduledStart: new Date(parsed.data.scheduledStart),
      scheduledEnd: new Date(parsed.data.scheduledEnd),
    });
    if (!result) {
      return NextResponse.json(
        { error: "Google Calendar no conectado" },
        { status: 400 },
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error push" },
      { status: 502 },
    );
  }
}
