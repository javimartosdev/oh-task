import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  attachments,
  calendarBlocks,
  contexts,
  focusSessions,
  habitLogs,
  habits,
  reminders,
  tags,
  taskTags,
  tasks,
  type Habit,
  type HabitLog,
} from "@/db/schema";
import { formatDateKey } from "@/lib/utils";

export async function getUserContexts(userId: string) {
  return db
    .select()
    .from(contexts)
    .where(eq(contexts.userId, userId))
    .orderBy(asc(contexts.sortOrder));
}

export async function getUserTags(userId: string) {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
}

export type TaskFilter = {
  contextId?: string | null;
  tagId?: string;
  priority?: number;
  status?: "todo" | "doing" | "done";
  includeCompleted?: boolean;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  parentOnly?: boolean;
  /** Tasks in Inbox list or with no list */
  inboxOnly?: boolean;
  excludeInbox?: boolean;
};

export async function getUserTasks(userId: string, filter: TaskFilter = {}) {
  const conditions = [eq(tasks.userId, userId)];

  if (!filter.includeCompleted) {
    conditions.push(isNull(tasks.completedAt));
  }

  if (filter.contextId) {
    conditions.push(eq(tasks.contextId, filter.contextId));
  }

  if (filter.inboxOnly) {
    // null list OR list named Inbox
    conditions.push(
      or(
        isNull(tasks.contextId),
        eq(contexts.name, "Inbox"),
      )!,
    );
  }

  if (filter.excludeInbox) {
    conditions.push(
      and(
        isNotNull(tasks.contextId),
        sql`coalesce(${contexts.name}, '') <> 'Inbox'`,
      )!,
    );
  }

  if (filter.priority !== undefined) {
    conditions.push(eq(tasks.priority, filter.priority));
  }

  if (filter.status) {
    conditions.push(eq(tasks.status, filter.status));
  }

  if (filter.dueFrom) {
    conditions.push(gte(tasks.dueDate, filter.dueFrom));
  }

  if (filter.dueTo) {
    conditions.push(lte(tasks.dueDate, filter.dueTo));
  }

  if (filter.search) {
    conditions.push(
      or(
        ilike(tasks.title, `%${filter.search}%`),
        ilike(tasks.notes, `%${filter.search}%`),
      )!,
    );
  }

  if (filter.parentOnly) {
    conditions.push(isNull(tasks.parentTaskId));
  }

  let taskIdsWithTag: string[] | null = null;
  if (filter.tagId) {
    const rows = await db
      .select({ taskId: taskTags.taskId })
      .from(taskTags)
      .where(eq(taskTags.tagId, filter.tagId));
    taskIdsWithTag = rows.map((r) => r.taskId);
    if (taskIdsWithTag.length === 0) return [];
    conditions.push(inArray(tasks.id, taskIdsWithTag));
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      notes: tasks.notes,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      scheduledStart: tasks.scheduledStart,
      scheduledEnd: tasks.scheduledEnd,
      recurrence: tasks.recurrence,
      parentTaskId: tasks.parentTaskId,
      dependsOnTaskId: tasks.dependsOnTaskId,
      contextId: tasks.contextId,
      contextName: contexts.name,
      contextColor: contexts.color,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(and(...conditions))
    .orderBy(
      sql`case when ${tasks.completedAt} is null then 0 else 1 end`,
      desc(tasks.priority),
      asc(tasks.dueDate),
      asc(tasks.completedAt),
      desc(tasks.createdAt),
    );

  if (rows.length === 0) return rows.map((r) => ({ ...r, tags: [] as { id: string; name: string; color: string }[] }));

  const ids = rows.map((r) => r.id);
  const tagRows = await db
    .select({
      taskId: taskTags.taskId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, ids));

  const tagsByTask = new Map<string, { id: string; name: string; color: string }[]>();
  for (const t of tagRows) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }

  return rows.map((r) => ({
    ...r,
    tags: tagsByTask.get(r.id) ?? [],
  }));
}

export async function getSubtasks(userId: string, parentTaskId: string) {
  return getUserTasks(userId, {
    includeCompleted: true,
    parentOnly: false,
  }).then((all) => all.filter((t) => t.parentTaskId === parentTaskId));
}

export async function getUserHabits(userId: string) {
  return db
    .select()
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
}

export async function getHabitLogsForRange(
  habitIds: string[],
  from: string,
  to: string,
) {
  if (habitIds.length === 0) return [] as HabitLog[];

  return db
    .select()
    .from(habitLogs)
    .where(
      and(
        inArray(habitLogs.habitId, habitIds),
        gte(habitLogs.logDate, from),
        lte(habitLogs.logDate, to),
      ),
    );
}

export async function getHabitLogsMap(
  userHabits: Habit[],
  monthsBack = 6,
): Promise<Map<string, { logDate: string; completed: boolean }[]>> {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - monthsBack);

  const habitIds = userHabits.map((h) => h.id);
  const logs = await getHabitLogsForRange(
    habitIds,
    formatDateKey(from),
    formatDateKey(today),
  );

  const map = new Map<string, { logDate: string; completed: boolean }[]>();
  for (const habit of userHabits) {
    map.set(
      habit.id,
      logs
        .filter((l) => l.habitId === habit.id)
        .map((l) => ({ logDate: l.logDate, completed: l.completed })),
    );
  }
  return map;
}

export async function getTodayHabitsWithStatus(userId: string) {
  const userHabits = await getUserHabits(userId);
  const today = new Date();
  const todayKey = formatDateKey(today);
  const dayOfWeek = today.getDay();

  const activeToday = userHabits.filter(
    (h) => h.kind === "weekly_quota" || h.scheduleDays.includes(dayOfWeek),
  );

  const logs = await getHabitLogsForRange(
    activeToday.map((h) => h.id),
    todayKey,
    todayKey,
  );

  return activeToday.map((habit) => {
    const log = logs.find((l) => l.habitId === habit.id);
    return {
      ...habit,
      completedToday: log?.completed ?? false,
      logId: log?.id,
    };
  });
}

export async function getDockTasks(userId: string, contextId?: string | null) {
  const todayKey = formatDateKey(new Date());

  const conditions = [
    eq(tasks.userId, userId),
    isNull(tasks.completedAt),
    isNull(tasks.parentTaskId),
    or(isNull(tasks.dueDate), lte(tasks.dueDate, todayKey)),
  ];

  if (contextId) {
    conditions.push(eq(tasks.contextId, contextId));
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      contextId: tasks.contextId,
      contextName: contexts.name,
      contextColor: contexts.color,
    })
    .from(tasks)
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(and(...conditions))
    .orderBy(desc(tasks.priority), asc(tasks.dueDate))
    .limit(12);

  return rows;
}

export async function getCalendarBlocks(
  userId: string,
  from: Date,
  to: Date,
) {
  return db
    .select()
    .from(calendarBlocks)
    .where(
      and(
        eq(calendarBlocks.userId, userId),
        gte(calendarBlocks.startAt, from),
        lte(calendarBlocks.startAt, to),
      ),
    )
    .orderBy(asc(calendarBlocks.startAt));
}

export async function getScheduledTasks(
  userId: string,
  from: Date,
  to: Date,
) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      scheduledStart: tasks.scheduledStart,
      scheduledEnd: tasks.scheduledEnd,
      priority: tasks.priority,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNotNull(tasks.scheduledStart),
        gte(tasks.scheduledStart, from),
        lte(tasks.scheduledStart, to),
      ),
    )
    .orderBy(asc(tasks.scheduledStart));
}

export async function getUserReminders(userId: string) {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), isNull(reminders.sentAt)))
    .orderBy(asc(reminders.remindAt));
}

export async function getTaskAttachments(userId: string, taskId: string) {
  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.userId, userId), eq(attachments.taskId, taskId)))
    .orderBy(desc(attachments.createdAt));
}

export async function getFocusStats(userId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const rows = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.completedAt, from),
      ),
    );
  const totalSeconds = rows.reduce((s, r) => s + r.durationSeconds, 0);
  return { sessions: rows.length, totalSeconds };
}
