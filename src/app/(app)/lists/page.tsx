import { redirect } from "next/navigation";
import { getUserContexts, getUserTasks } from "@/lib/data";
import { findInboxId } from "@/lib/lists";
import { ensureUserInbox } from "@/lib/lists-server";
import { getSessionUser } from "@/lib/session";
import { SmartTasksView } from "@/components/smart-tasks";

export default async function ListsIndexPage() {
  const user = await getSessionUser();
  if (!user) return null;

  await ensureUserInbox(user.id);
  const lists = await getUserContexts(user.id);
  const inboxId = findInboxId(lists);
  if (inboxId) redirect(`/lists/${inboxId}`);

  const tasks = await getUserTasks(user.id, {
    includeCompleted: false,
    parentOnly: false,
  });

  return (
    <SmartTasksView
      view="inbox"
      title="Listas"
      subtitle="Crea carpetas y listas en el panel."
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
