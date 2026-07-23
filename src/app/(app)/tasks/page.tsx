import {
  getUserContexts,
  getUserTags,
  getUserTasks,
} from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { TasksBoard } from "@/components/tasks-board";

export default async function TasksPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [tasks, lists, tags] = await Promise.all([
    getUserTasks(user.id, { includeCompleted: true, parentOnly: false }),
    getUserContexts(user.id),
    getUserTags(user.id),
  ]);

  return (
    <TasksBoard
      tasks={tasks.map((t) => ({
        ...t,
        scheduledStart: t.scheduledStart?.toISOString() ?? null,
        scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
        completedAt: t.completedAt,
      }))}
      lists={lists}
      tags={tags}
      view="list"
    />
  );
}
