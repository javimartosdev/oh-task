"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { addMonths, subMonths } from "date-fns";
import { Button, Card, Input } from "@/components/ui";
import { HabitCalendar } from "@/components/habit-calendar";
import { StreakBadge } from "@/components/streak-badge";
import {
  buildMonthCalendar,
  computeStreak,
  monthLabel,
  type DayCell,
} from "@/lib/habits";
import { formatDateKey, WEEKDAY_PICKER } from "@/lib/utils";

interface HabitRow {
  id: string;
  name: string;
  color: string;
  kind: "daily" | "weekly_quota";
  weeklyTarget: number | null;
  scheduleDays: number[];
}

interface HabitLog {
  logDate: string;
  completed: boolean;
}

export function HabitsManager({
  habits,
  logsByHabit,
}: {
  habits: HabitRow[];
  logsByHabit: Record<string, HabitLog[]>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(habits[0]?.id ?? "");
  const [month, setMonth] = useState(new Date());
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"daily" | "weekly_quota">("daily");
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const selected = habits.find((h) => h.id === selectedId) ?? habits[0];

  const calendarCells: DayCell[] = useMemo(() => {
    if (!selected) return [];
    return buildMonthCalendar(
      month,
      {
        kind: selected.kind,
        scheduleDays: selected.scheduleDays,
        weeklyTarget: selected.weeklyTarget,
      },
      logsByHabit[selected.id] ?? [],
    );
  }, [selected, month, logsByHabit]);

  const streak = useMemo(() => {
    if (!selected) return { current: 0, longest: 0, unit: "days" as const };
    return computeStreak(
      {
        kind: selected.kind,
        scheduleDays: selected.scheduleDays,
        weeklyTarget: selected.weeklyTarget,
      },
      logsByHabit[selected.id] ?? [],
    );
  }, [selected, logsByHabit]);

  function toggleDay(day: number) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
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
        scheduleDays,
      }),
    });

    setName("");
    router.refresh();
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleToday(habitId: string, completed: boolean) {
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    router.refresh();
  }

  const today = new Date();
  const todayDow = today.getDay();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Hábitos</h1>
        <p className="mt-1 text-muted">
          Calendario Seinfeld con recuperación de 1 día
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-medium text-muted">Tus hábitos</h2>
            <ul className="space-y-1">
              {habits.map((habit) => (
                <li key={habit.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedId(habit.id)}
                    className={`flex-1 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      selected?.id === habit.id
                        ? "bg-accent/15 text-accent"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                    {habit.name}
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="p-2 text-muted hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium text-muted">Nuevo hábito</h2>
            <form onSubmit={createHabit} className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del hábito"
              />
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "daily" | "weekly_quota")
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
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
                  placeholder="Meta semanal"
                />
              )}
              <div>
                <p className="mb-2 text-xs text-muted">Días activos</p>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_PICKER.map(({ dow, label, name }) => (
                    <button
                      key={dow}
                      type="button"
                      title={name}
                      onClick={() => toggleDay(dow)}
                      className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                        scheduleDays.includes(dow)
                          ? "bg-accent/20 text-accent"
                          : "bg-surface-hover text-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" size="sm">
                <Plus className="h-4 w-4" />
                Crear
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                    <p className="text-sm text-muted mt-1">
                      {selected.kind === "weekly_quota"
                        ? `${selected.weeklyTarget}× por semana`
                        : "Hábito diario"}
                    </p>
                  </div>
                  <StreakBadge
                    current={streak.current}
                    longest={streak.longest}
                    unit={streak.unit}
                  />
                </div>

                {selected.scheduleDays.includes(todayDow) && (
                  <button
                    onClick={() => {
                      const logs = logsByHabit[selected.id] ?? [];
                      const todayKey = formatDateKey(today);
                      const done = logs.some(
                        (l) => l.logDate === todayKey && l.completed,
                      );
                      toggleToday(selected.id, done);
                    }}
                    className="mt-4 w-full rounded-xl border border-border bg-surface-hover py-3 text-sm font-medium hover:border-success/30 transition-colors"
                  >
                    Marcar hoy
                  </button>
                )}
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium capitalize">{monthLabel(month)}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonth((m) => subMonths(m, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonth((m) => addMonths(m, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <HabitCalendar
                  month={month}
                  cells={calendarCells}
                  habitColor={selected.color}
                />
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center text-muted">
              Crea tu primer hábito para ver el calendario
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
