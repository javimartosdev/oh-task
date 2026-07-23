import { getUserTasks } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { EisenhowerMatrix } from "@/components/eisenhower-matrix";

export default async function MatrixPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const tasks = await getUserTasks(user.id, {
    includeCompleted: false,
    parentOnly: true,
  });

  return (
    <EisenhowerMatrix
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        status: t.status,
      }))}
    />
  );
}
