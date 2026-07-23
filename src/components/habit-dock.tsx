"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronDown, ChevronUp, Circle, Plus, Trash2, X } from "lucide-react";
import { cn, formatDateKey, parseDateKey, WEEKDAY_PICKER } from "@/lib/utils";
import { GlobalCalendar } from "@/components/global-calendar";
import { Button, Input } from "@/components/ui";
import { useAchievementSound } from "@/hooks/use-achievement-sound";
import {
  computeGlobalDayStatus,
  computeWeekStatus,
  countTodayHabitsDone,
  isHabitLoggableOnDay,
  type HabitWithSchedule,
} from "@/lib/habits";
import { ALL_WEEK_DAYS } from "@/lib/utils";

interface HabitMeta extends HabitWithSchedule {
  name: string;
  color: string;
}

interface HabitToday extends HabitMeta {
  completedToday: boolean;
}

interface TaskRow {
  id: string;
  title: string;
  contextName: string | null;
  contextColor: string | null;
  completedAt: string | Date | null;
}

interface Context {
  id: string;
  name: string;
  color: string;
}

const TASKS_VISIBLE = 5;

export function HabitDock({
  habits,
  habitMeta,
  allHabits,
  logsByHabit,
  tasks,
  contexts,
}: {
  habits: HabitToday[];
  habitMeta: HabitMeta[];
  allHabits: HabitWithSchedule[];
  logsByHabit: Record<string, { logDate: string; completed: boolean }[]>;
  tasks: TaskRow[];
  contexts: Context[];
}) {
  const router = useRouter();
  const { unlock, play: playAchievement, playTick } = useAchievementSound();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [celebrateDate, setCelebrateDate] = useState<string | null>(null);
  const [celebrateWeek, setCelebrateWeek] = useState<string | null>(null);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskContext, setTaskContext] = useState("");

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"daily" | "weekly_quota">("weekly_quota");
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [scheduleDays, setScheduleDays] = useState<number[]>([...ALL_WEEK_DAYS]);

  const logsMap = useMemo(() => {
    const m = new Map<string, { logDate: string; completed: boolean }[]>();
    for (const [id, logs] of Object.entries(logsByHabit)) {
      m.set(id, logs);
    }
    return m;
  }, [logsByHabit]);

  const pendingTasks = tasks.filter((t) => !t.completedAt);
  const completedTasks = tasks.filter((t) => t.completedAt);
  const visiblePending = tasksExpanded
    ? pendingTasks
    : pendingTasks.slice(0, TASKS_VISIBLE);
  const visibleTasks = [...visiblePending, ...completedTasks];
  const hiddenCount = Math.max(0, pendingTasks.length - TASKS_VISIBLE);

  function toggleDay(dow: number) {
    setScheduleDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort(),
    );
  }

  function isHabitDoneOnDate(habitId: string, dateKey: string): boolean {
    return (logsByHabit[habitId] ?? []).some(
      (l) => l.logDate === dateKey && l.completed,
    );
  }

  function isDateOptimal(dateKey: string): boolean {
    const date = parseDateKey(dateKey);
    return computeGlobalDayStatus(date, allHabits, logsMap) === "optimal";
  }

  function habitsForDate(dateKey: string): HabitMeta[] {
    const date = parseDateKey(dateKey);
    return habitMeta.filter((h) => isHabitLoggableOnDay(h, date));
  }

  function weekStatusFor(
    dateKey: string,
    logs: Map<string, { logDate: string; completed: boolean }[]>,
  ) {
    const weekStart = startOfWeek(parseDateKey(dateKey), { weekStartsOn: 1 });
    return {
      weekKey: formatDateKey(weekStart),
      status: computeWeekStatus(weekStart, allHabits, logs),
    };
  }

  function withOptimisticLog(
    habitId: string,
    dateKey: string,
    completed: boolean,
  ) {
    const m = new Map<string, { logDate: string; completed: boolean }[]>();
    for (const [id, logs] of logsMap) {
      m.set(id, [...logs]);
    }
    const existing = m.get(habitId) ?? [];
    const without = existing.filter((l) => l.logDate !== dateKey);
    if (completed) {
      m.set(habitId, [...without, { logDate: dateKey, completed: true }]);
    } else {
      m.set(habitId, without);
    }
    return m;
  }

  async function toggleHabitOnDate(
    habit: HabitMeta,
    dateKey: string,
    currentlyDone: boolean,
  ) {
    unlock();

    const wasOptimal = isDateOptimal(dateKey);
    const beforeWeek = weekStatusFor(dateKey, logsMap);
    const nextCompleted = !currentlyDone;
    const optimisticLogs = withOptimisticLog(habit.id, dateKey, nextCompleted);
    const afterWeek = weekStatusFor(dateKey, optimisticLogs);

    // Play immediately while still in the user-gesture window (mobile Safari).
    if (nextCompleted) {
      const active = habitsForDate(dateKey);
      const doneCount = active.filter((h) =>
        h.id === habit.id ? true : isHabitDoneOnDate(h.id, dateKey),
      ).length;
      const becomesOptimal =
        !wasOptimal && doneCount >= active.length && active.length > 0;
      const becomesPerfect =
        beforeWeek.status !== "perfect" && afterWeek.status === "perfect";

      if (becomesOptimal || becomesPerfect) {
        playAchievement();
        if (becomesOptimal) {
          setCelebrateDate(dateKey);
          setTimeout(() => setCelebrateDate(null), 800);
        }
        if (becomesPerfect) {
          setCelebrateWeek(afterWeek.weekKey);
          setTimeout(() => setCelebrateWeek(null), 900);
        }
      } else {
        playTick();
      }
    }

    await fetch(`/api/habits/${habit.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateKey,
        completed: nextCompleted,
      }),
    });

    router.refresh();
  }

  async function toggleHabit(habit: HabitToday) {
    const todayKey = formatDateKey(new Date());
    await toggleHabitOnDate(habit, todayKey, habit.completedToday);
  }

  async function createHabit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || scheduleDays.length === 0) return;

    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        kind,
        weeklyTarget: kind === "weekly_quota" ? weeklyTarget : null,
        scheduleDays:
          kind === "weekly_quota" ? [...ALL_WEEK_DAYS] : scheduleDays,
      }),
    });

    setName("");
    setShowHabitForm(false);
    router.refresh();
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleTask(task: TaskRow) {
    unlock();
    const completing = !task.completedAt;
    if (completing) playTick();

    const action = task.completedAt ? "reopen" : "complete";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitle.trim(),
        contextId: taskContext || null,
      }),
    });
    setTaskTitle("");
    router.refresh();
  }

  const { done, total } = countTodayHabitsDone(allHabits, logsMap);

  const selectedHabits = selectedDate ? habitsForDate(selectedDate) : [];
  const selectedLabel = selectedDate
    ? format(parseDateKey(selectedDate), "EEEE d MMM", { locale: es })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <GlobalCalendar
        month={month}
        onMonthChange={setMonth}
        habits={allHabits}
        logsByHabit={logsByHabit}
        celebrateDate={celebrateDate}
        celebrateWeek={celebrateWeek}
        selectedDate={selectedDate}
        onDaySelect={(date) =>
          setSelectedDate((prev) => (prev === date ? null : date))
        }
      />

      {selectedDate && (
        <section className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium capitalize">{selectedLabel}</h2>
              <p className="text-xs text-muted">
                Toca para marcar o desmarcar hábitos
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedHabits.length === 0 ? (
            <p className="text-sm text-muted">No hay hábitos activos este día.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedHabits.map((habit) => {
                const done = isHabitDoneOnDate(habit.id, selectedDate);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() =>
                      toggleHabitOnDate(habit, selectedDate, done)
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200",
                      done
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-border bg-surface hover:border-accent/30",
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted" />
                    )}
                    <span>{habit.name}</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">Hoy</h2>
            <p className="text-xs text-muted">
              {total > 0 ? `${done}/${total} hábitos` : "Sin hábitos activos hoy"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHabitForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Hábito
          </Button>
        </div>

        {habits.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {habits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit)}
                className={cn(
                  "group flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200",
                  habit.completedToday
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-border bg-surface-elevated hover:border-accent/30",
                )}
              >
                {habit.completedToday ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4 text-muted" />
                )}
                <span>{habit.name}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHabit(habit.id);
                  }}
                  className="ml-1 hidden text-muted hover:text-danger group-hover:inline"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {allHabits.length === 0
              ? "Crea tu primer hábito abajo."
              : "Marca los hábitos cuando los hagas — no hace falta todos los días."}
          </p>
        )}

        {showHabitForm && (
          <form
            onSubmit={createHabit}
            className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Entrenar, Programar)"
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "daily" | "weekly_quota")
                }
                className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
              >
                <option value="daily">Diario</option>
                <option value="weekly_quota">Cuota semanal</option>
              </select>
              {kind === "weekly_quota" && (
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  className="w-20"
                />
              )}
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Días activos</p>
              {kind === "weekly_quota" ? (
                <p className="text-xs text-muted/80 leading-relaxed">
                  Marca cualquier día de la semana (L–D). La meta es{" "}
                  <span className="text-foreground font-medium">
                    {weeklyTarget} días
                  </span>
                  , no tienen que ser seguidos ni de lunes a viernes.
                </p>
              ) : (
                <div className="flex gap-1">
                  {WEEKDAY_PICKER.map(({ dow, label, name: dayName }) => (
                    <button
                      key={dow}
                      type="button"
                      title={dayName}
                      onClick={() => toggleDay(dow)}
                      className={cn(
                        "h-8 w-8 rounded-lg text-xs font-medium",
                        scheduleDays.includes(dow)
                          ? "bg-accent/20 text-accent"
                          : "bg-surface-hover text-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" size="sm" className="w-full">
              Crear hábito
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-sm font-medium text-muted">Tasks</h2>

        <form onSubmit={addTask} className="flex gap-2">
          <Input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Añadir tarea…"
            className="flex-1"
          />
          <select
            value={taskContext}
            onChange={(e) => setTaskContext(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-2 text-xs"
          >
            <option value="">—</option>
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </form>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted/70">Nada pendiente</p>
        ) : (
          <ul className="space-y-1">
            {visibleTasks.map((task) => {
              const isCompleted = !!task.completedAt;
              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                    !isCompleted && "hover:bg-surface-hover/50",
                  )}
                >
                  <button
                    onClick={() => toggleTask(task)}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isCompleted
                        ? "border-success bg-success text-accent-fg shadow-sm"
                        : "border-muted/60 bg-muted/10 hover:border-success hover:bg-success/15",
                    )}
                    aria-label={isCompleted ? "Reabrir tarea" : "Completar tarea"}
                  >
                    {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      isCompleted && "text-muted/80 line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  {task.contextName && (
                    <span
                      className={cn(
                        "text-[10px] font-medium opacity-70",
                        isCompleted && "line-through",
                      )}
                      style={{ color: task.contextColor ?? undefined }}
                    >
                      {task.contextName}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {hiddenCount > 0 && !tasksExpanded && (
          <button
            onClick={() => setTasksExpanded(true)}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3" />
            Ver {hiddenCount} más
          </button>
        )}
        {tasksExpanded && pendingTasks.length > TASKS_VISIBLE && (
          <button
            onClick={() => setTasksExpanded(false)}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <ChevronUp className="h-3 w-3" />
            Colapsar
          </button>
        )}
      </section>
    </div>
  );
}
