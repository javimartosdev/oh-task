import { getUserContexts, getUserTasks } from "@/lib/data";
import { ensureUserInbox } from "@/lib/lists-server";
import { getSessionUser } from "@/lib/session";
import { SmartTasksView } from "@/components/smart-tasks";

export default async function UpcomingPage() {
  const user = await getSessionUser();
  if (!user) return null;

  await ensureUserInbox(user.id);

  const [tasks, lists] = await Promise.all([
    getUserTasks(user.id, { includeCompleted: false, parentOnly: false }),
    getUserContexts(user.id),
  ]);

  return (
    <SmartTasksView
      view="upcoming"
      title="Próximos"
      subtitle="Los próximos 14 días, agrupados."
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        priority: t.priority,
        dueDate: t.dueDate,
        scheduledStart: t.scheduledStart?.toISOString() ?? null,
        contextId: t.contextId,
        contextName: t.contextName,
        contextColor: t.contextColor,
        completedAt: t.completedAt,
        parentTaskId: t.parentTaskId,
      }))}
      lists={lists}
    />
  );
}
