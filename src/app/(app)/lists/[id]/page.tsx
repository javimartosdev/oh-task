import { notFound } from "next/navigation";
import { getUserContexts, getUserTasks } from "@/lib/data";
import { ensureUserInbox, isInboxList } from "@/lib/lists";
import { getSessionUser } from "@/lib/session";
import { SmartTasksView } from "@/components/smart-tasks";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;

  const { id } = await params;
  await ensureUserInbox(user.id);

  const [tasks, lists] = await Promise.all([
    getUserTasks(user.id, { includeCompleted: false, parentOnly: false }),
    getUserContexts(user.id),
  ]);

  const list = lists.find((l) => l.id === id && !l.isFolder);
  if (!list) notFound();

  return (
    <SmartTasksView
      view="list"
      listId={list.id}
      title={list.name}
      subtitle={
        isInboxList(list)
          ? "Bandeja de captura"
          : "Tareas de esta lista"
      }
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
