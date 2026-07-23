import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { taskTags, tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getUserTasks } from "@/lib/data";
import { parseNaturalDate } from "@/lib/nlp-dates";

const taskSchema = z.object({
  title: z.string().min(1).max(300),
  notes: z.string().max(5000).nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  parseNatural: z.boolean().optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rows = await getUserTasks(user.id, {
    contextId: searchParams.get("contextId"),
    tagId: searchParams.get("tagId") ?? undefined,
    priority: searchParams.get("priority")
      ? Number(searchParams.get("priority"))
      : undefined,
    status: (searchParams.get("status") as "todo" | "doing" | "done") || undefined,
    includeCompleted: searchParams.get("includeCompleted") === "1",
    search: searchParams.get("q") ?? undefined,
    dueFrom: searchParams.get("dueFrom") ?? undefined,
    dueTo: searchParams.get("dueTo") ?? undefined,
    parentOnly: searchParams.get("parentOnly") !== "0",
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  let title = parsed.data.title;
  let dueDate = parsed.data.dueDate ?? null;
  let scheduledStart = parsed.data.scheduledStart
    ? new Date(parsed.data.scheduledStart)
    : null;
  let scheduledEnd = parsed.data.scheduledEnd
    ? new Date(parsed.data.scheduledEnd)
    : null;

  if (parsed.data.parseNatural !== false) {
    const nlp = parseNaturalDate(title);
    if (nlp) {
      title = nlp.cleanTitle || title;
      if (nlp.dueDate && dueDate === null) dueDate = nlp.dueDate;
      if (nlp.scheduledStart && !scheduledStart) scheduledStart = nlp.scheduledStart;
      if (nlp.scheduledEnd && !scheduledEnd) scheduledEnd = nlp.scheduledEnd;
    }
  }

  const [row] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      title,
      notes: parsed.data.notes ?? null,
      contextId: parsed.data.contextId ?? null,
      parentTaskId: parsed.data.parentTaskId ?? null,
      dependsOnTaskId: parsed.data.dependsOnTaskId ?? null,
      priority: parsed.data.priority ?? 0,
      status: parsed.data.status ?? "todo",
      dueDate,
      scheduledStart,
      scheduledEnd,
      recurrence: parsed.data.recurrence ?? "none",
    })
    .returning();

  if (parsed.data.tagIds?.length) {
    await db.insert(taskTags).values(
      parsed.data.tagIds.map((tagId) => ({ taskId: row.id, tagId })),
    );
  }

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const schema = taskSchema.partial().extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, tagIds, parseNatural: _pn, ...rest } = parsed.data;

  const updates: Record<string, unknown> = { ...rest };
  if (rest.scheduledStart !== undefined) {
    updates.scheduledStart = rest.scheduledStart
      ? new Date(rest.scheduledStart)
      : null;
  }
  if (rest.scheduledEnd !== undefined) {
    updates.scheduledEnd = rest.scheduledEnd ? new Date(rest.scheduledEnd) : null;
  }
  if (rest.status === "done") {
    updates.completedAt = new Date();
  } else if (rest.status === "todo" || rest.status === "doing") {
    updates.completedAt = null;
  }

  const [row] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tagIds) {
    await db.delete(taskTags).where(eq(taskTags.taskId, id));
    if (tagIds.length) {
      await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId: id, tagId })));
    }
  }

  return NextResponse.json(row);
}
