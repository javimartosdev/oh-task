import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contexts } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserContexts } from "@/lib/data";

const listSchema = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
  parentId: z.string().uuid().nullable().optional(),
  isFolder: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getUserContexts(user.id));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = listSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [row] = await db
    .insert(contexts)
    .values({
      userId: user.id,
      name: parsed.data.name,
      icon: parsed.data.icon ?? "folder",
      color: parsed.data.color ?? "#89b4fa",
      parentId: parsed.data.parentId ?? null,
      isFolder: parsed.data.isFolder ?? false,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schema = listSchema.partial().extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  const [row] = await db
    .update(contexts)
    .set(updates)
    .where(and(eq(contexts.id, id), eq(contexts.userId, user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(contexts)
    .where(and(eq(contexts.id, id), eq(contexts.userId, user.id)));

  return NextResponse.json({ ok: true });
}
