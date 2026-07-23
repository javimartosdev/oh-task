import { getUserContexts, getUserTasks } from "@/lib/data";
import { ensureUserInbox } from "@/lib/lists-server";
import { getSessionUser } from "@/lib/session";
import { SmartTasksView } from "@/components/smart-tasks";

function mapTasks(
  tasks: Awaited<ReturnType<typeof getUserTasks>>,
) {
  return tasks.map((t) => ({
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
  }));
}

export default async function InboxPage() {
  const user = await getSessionUser();
  if (!user) return null;

  await ensureUserInbox(user.id);

  const [tasks, lists] = await Promise.all([
    getUserTasks(user.id, { includeCompleted: false, parentOnly: false }),
    getUserContexts(user.id),
  ]);

  return (
    <SmartTasksView
      view="inbox"
      title="Inbox"
      subtitle="Captura rápido. Luego muévelo a una lista."
      tasks={mapTasks(tasks)}
      lists={lists}
    />
  );
}
