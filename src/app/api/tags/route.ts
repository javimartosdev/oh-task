import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserTags } from "@/lib/data";

const tagSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().max(20).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getUserTags(user.id));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = tagSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [row] = await db
    .insert(tags)
    .values({
      userId: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "#71717a",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, user.id)));
  return NextResponse.json({ ok: true });
}
