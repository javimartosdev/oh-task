import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarBlocks } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getCalendarBlocks } from "@/lib/data";
import { addDays, startOfDay } from "date-fns";

const blockSchema = z.object({
  title: z.string().min(1).max(200),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  color: z.string().max(20).optional(),
  taskId: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : startOfDay(new Date());
  const to = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : addDays(from, 7);

  return NextResponse.json(await getCalendarBlocks(user.id, from, to));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = blockSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [row] = await db
    .insert(calendarBlocks)
    .values({
      userId: user.id,
      title: parsed.data.title,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      color: parsed.data.color ?? "#89b4fa",
      taskId: parsed.data.taskId ?? null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(calendarBlocks)
    .where(and(eq(calendarBlocks.id, id), eq(calendarBlocks.userId, user.id)));

  return NextResponse.json({ ok: true });
}
