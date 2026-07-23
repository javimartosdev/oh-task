import { eachDayOfInterval, subDays } from "date-fns";
import { Card } from "@/components/card";
import { StreakBadge } from "@/components/streak-badge";
import { computeStreak } from "@/lib/habits";
import {
  getFocusStats,
  getHabitLogsMap,
  getUserHabits,
  getUserTasks,
} from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { formatDateKey } from "@/lib/utils";

function normalizeLogDate(value: string | Date): string {
  if (value instanceof Date) return formatDateKey(value);
  return value.slice(0, 10);
}

function countPerfectDays(
  habits: Awaited<ReturnType<typeof getUserHabits>>,
  logsMap: Awaited<ReturnType<typeof getHabitLogsMap>>,
  days: Date[],
): number {
  let perfectDays = 0;

  for (const day of days) {
    const dayKey = formatDateKey(day);
    if (day > new Date()) continue;

    const activeHabits = habits.filter((habit) =>
      habit.scheduleDays.includes(day.getDay()),
    );
    if (activeHabits.length === 0) continue;

    const allSuccessful = activeHabits.every((habit) => {
      const logs = (logsMap.get(habit.id) ?? []).map((log) => ({
        ...log,
        logDate: normalizeLogDate(log.logDate),
      }));

      if (habit.kind === "weekly_quota" && habit.weeklyTarget) {
        return logs.some(
          (log) => log.logDate === dayKey && log.completed,
        );
      }

      return logs.some(
        (log) => log.logDate === dayKey && log.completed,
      );
    });

    if (allSuccessful) perfectDays++;
  }

  return perfectDays;
}

export default async function StatsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const userHabits = await getUserHabits(user.id);
  const logsMap = await getHabitLogsMap(userHabits, 12);
  const openTasks = await getUserTasks(user.id);
  const focus = await getFocusStats(user.id, 30);

  const today = new Date();
  const last30 = eachDayOfInterval({
    start: subDays(today, 29),
    end: today,
  });

  const perfectDays = countPerfectDays(userHabits, logsMap, last30);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Estadísticas</h1>
        <p className="mt-1 text-muted">Tus rachas y progreso</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">Días perfectos (30d)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {perfectDays}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Tasks pendientes</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {openTasks.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Hábitos activos</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {userHabits.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Foco (30d)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {Math.round(focus.totalSeconds / 60)}
            <span className="ml-1 text-base font-normal text-muted">min</span>
          </p>
          <p className="mt-1 text-xs text-muted">{focus.sessions} sesiones</p>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Rachas por hábito</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {userHabits.map((habit) => {
            const logs = (logsMap.get(habit.id) ?? []).map((log) => ({
              ...log,
              logDate: normalizeLogDate(log.logDate),
            }));

            const streak = computeStreak(
              {
                kind: habit.kind,
                scheduleDays: habit.scheduleDays,
                weeklyTarget: habit.weeklyTarget,
              },
              logs,
            );

            const last30Active = last30.filter((d) =>
              habit.scheduleDays.includes(d.getDay()),
            );
            const completedCount = last30Active.filter((d) =>
              logs.some(
                (l) =>
                  l.logDate === formatDateKey(d) && l.completed,
              ),
            ).length;
            const rate =
              last30Active.length > 0
                ? Math.round((completedCount / last30Active.length) * 100)
                : 0;

            return (
              <Card key={habit.id} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <h3 className="font-medium">{habit.name}</h3>
                </div>
                <StreakBadge
                  current={streak.current}
                  longest={streak.longest}
                  unit={streak.unit}
                />
                <p className="mt-4 text-sm text-muted">
                  Cumplimiento 30d:{" "}
                  <span className="text-foreground font-medium">{rate}%</span>
                </p>
              </Card>
            );
          })}
        </div>

        {userHabits.length === 0 && (
          <Card className="p-8 text-center text-muted">
            Aún no hay hábitos para mostrar estadísticas
          </Card>
        )}
      </section>
    </div>
  );
}
