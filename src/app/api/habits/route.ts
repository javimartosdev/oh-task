import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserHabits } from "@/lib/data";

const habitSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  kind: z.enum(["daily", "weekly_quota"]).optional(),
  weeklyTarget: z.number().int().min(1).max(7).nullable().optional(),
  scheduleDays: z.array(z.number().int().min(0).max(6)).min(1),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getUserHabits(user.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = habitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await getUserHabits(user.id);
  const kind = parsed.data.kind ?? "daily";

  if (kind === "weekly_quota" && !parsed.data.weeklyTarget) {
    return NextResponse.json(
      { error: "weeklyTarget requerido para hábitos semanales" },
      { status: 400 },
    );
  }

  const scheduleDays =
    kind === "weekly_quota"
      ? [0, 1, 2, 3, 4, 5, 6]
      : parsed.data.scheduleDays;

  const [row] = await db
    .insert(habits)
    .values({
      userId: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "#22c55e",
      kind,
      weeklyTarget: kind === "weekly_quota" ? parsed.data.weeklyTarget : null,
      scheduleDays,
      sortOrder: existing.length,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const schema = habitSchema.partial().extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const [row] = await db
    .update(habits)
    .set(updates)
    .where(and(eq(habits.id, id), eq(habits.userId, user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, user.id)));

  return NextResponse.json({ ok: true });
}
