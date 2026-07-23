import {
  getHabitLogsMap,
  getTodayHabitsWithStatus,
  getUserContexts,
  getUserHabits,
  getUserTasks,
} from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { HabitDock } from "@/components/habit-dock";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const userHabits = await getUserHabits(user.id);
  const logsMap = await getHabitLogsMap(userHabits, 24);

  const logsByHabit: Record<
    string,
    { logDate: string; completed: boolean }[]
  > = {};
  for (const habit of userHabits) {
    logsByHabit[habit.id] = logsMap.get(habit.id) ?? [];
  }

  const [habitsToday, tasks, contexts] = await Promise.all([
    getTodayHabitsWithStatus(user.id),
    getUserTasks(user.id, { includeCompleted: true, parentOnly: true }),
    getUserContexts(user.id),
  ]);

  const allHabits = userHabits.map((h) => ({
    id: h.id,
    kind: h.kind,
    scheduleDays: h.scheduleDays,
    weeklyTarget: h.weeklyTarget,
  }));

  return (
    <HabitDock
      habits={habitsToday.map((h) => ({
        id: h.id,
        name: h.name,
        color: h.color,
        kind: h.kind,
        scheduleDays: h.scheduleDays,
        weeklyTarget: h.weeklyTarget,
        completedToday: h.completedToday,
      }))}
      habitMeta={userHabits.map((h) => ({
        id: h.id,
        name: h.name,
        color: h.color,
        kind: h.kind,
        scheduleDays: h.scheduleDays,
        weeklyTarget: h.weeklyTarget,
      }))}
      allHabits={allHabits}
      logsByHabit={logsByHabit}
      tasks={tasks}
      contexts={contexts}
    />
  );
}
