import { getUserTasks } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { GanttView } from "@/components/gantt-view";

export default async function GanttPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const tasks = await getUserTasks(user.id, {
    includeCompleted: false,
    parentOnly: true,
  });

  return (
    <GanttView
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        scheduledStart: t.scheduledStart?.toISOString() ?? null,
        scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
        priority: t.priority,
        status: t.status,
        dependsOnTaskId: t.dependsOnTaskId,
        contextName: t.contextName,
        contextColor: t.contextColor,
      }))}
    />
  );
}
