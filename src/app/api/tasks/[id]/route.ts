import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { nextOccurrence } from "@/lib/recurrence";
import { formatDateKey } from "@/lib/utils";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await _request.json();

  if (body.action === "complete") {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [row] = await db
      .update(tasks)
      .set({ completedAt: new Date(), status: "done" })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();

    if (existing.recurrence && existing.recurrence !== "none") {
      const next = nextOccurrence(new Date(), existing.recurrence);
      if (next) {
        await db.insert(tasks).values({
          userId: user.id,
          title: existing.title,
          notes: existing.notes,
          contextId: existing.contextId,
          priority: existing.priority,
          status: "todo",
          dueDate: formatDateKey(next),
          recurrence: existing.recurrence,
        });
      }
    }

    return NextResponse.json(row);
  }

  if (body.action === "reopen") {
    const [row] = await db
      .update(tasks)
      .set({ completedAt: null, status: "todo" })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  return NextResponse.json({ ok: true });
}
