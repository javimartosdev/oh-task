import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserReminders } from "@/lib/data";

const schema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  remindAt: z.string().datetime(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
  message: z.string().max(300).nullable().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getUserReminders(user.id));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [row] = await db
    .insert(reminders)
    .values({
      userId: user.id,
      taskId: parsed.data.taskId ?? null,
      remindAt: new Date(parsed.data.remindAt),
      recurrence: parsed.data.recurrence ?? "none",
      message: parsed.data.message ?? null,
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
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)));

  return NextResponse.json({ ok: true });
}
